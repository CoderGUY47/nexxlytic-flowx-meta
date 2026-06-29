const express = require("express");
const axios = require("axios");
const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { triggerFlow, handlePostback, handleUserInput, handleTextQuickReply } = require("../services/flowEngine");
const router = express.Router();

/*
=========================================
WHATSAPP WEBHOOK VERIFICATION
=========================================
*/
router.get("/whatsapp", (req, res) => {
  console.log("=== WHATSAPP WEBHOOK VERIFY HIT ===");

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === (process.env.WA_VERIFY_TOKEN || "myverifytoken123")) {
    console.log("✅ WHATSAPP VERIFIED");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/*
=========================================
WHATSAPP MESSAGE RECEIVER
=========================================
*/
router.post("/whatsapp", async (req, res) => {
  console.log("=== WHATSAPP WEBHOOK HIT ===");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const phoneNumberId = req.body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (!msg || !phoneNumberId) return res.sendStatus(200);

    const from = msg.from;
    const messageText = msg.text?.body || msg.interactive?.button_reply?.title || "";
    const payload = msg.interactive?.button_reply?.id || null;
    
    if (!from || (!messageText && !payload)) {
      return res.sendStatus(200);
    }

    const cleanFrom = from.replace(/\D/g, ''); // strip any non-digit characters

    // Resolve client: check query parameter first (for simulated UI webhooks)
    let clients = [];
    const queryClientId = req.query.client_id;
    if (queryClientId) {
      const [rows] = await db.query("SELECT * FROM clients WHERE id = ? LIMIT 1", [queryClientId]);
      if (rows.length) {
        clients = rows;
      }
    }

    if (!clients.length) {
      const [rows] = await db.execute(
        "SELECT * FROM clients WHERE wa_phone_number_id = ?",
        [phoneNumberId]
      );
      clients = rows;
    }

    if (!clients.length) {
      console.log("❌ No client found for WhatsApp webhook processing");
      return res.sendStatus(200);
    }

    // Determine target client
    let client = clients[0];
    if (clients.length > 1) {
      if (global.lastActiveClient) {
        const activeClientInList = clients.find(c => c.id === global.lastActiveClient);
        if (activeClientInList) {
          client = activeClientInList;
        }
      } else {
        const [lastContact] = await db.execute(
          "SELECT client_id FROM contacts WHERE REPLACE(phone, '+', '') = ? OR phone = ? ORDER BY last_message_at DESC LIMIT 1",
          [cleanFrom, from]
        );
        if (lastContact.length) {
          const matchingClient = clients.find(c => c.id === lastContact[0].client_id);
          if (matchingClient) client = matchingClient;
        }
      }
    }

    // Find or create contact using normalized phone number matching
    let [contacts] = await db.execute(
      "SELECT * FROM contacts WHERE client_id = ? AND (REPLACE(phone, '+', '') = ? OR phone = ?) LIMIT 1",
      [client.id, cleanFrom, from]
    );
    let contact;
    let contactId;
    if (contacts.length) {
      contact = contacts[0];
      contactId = contact.id;
    } else {
      contactId = uuidv4();
      await db.execute(
        "INSERT INTO contacts (id, client_id, name, phone, platform) VALUES (?, ?, ?, ?, 'whatsapp')",
        [contactId, client.id, `User ${from}`, from]
      );
      const [newContactRows] = await db.query("SELECT * FROM contacts WHERE id = ?", [contactId]);
      contact = newContactRows[0];
    }

    const contentToSave = messageText || (payload ? `[Button Clicked]` : "");

    // Save inbound message
    await db.execute(
      "INSERT INTO messages (id, client_id, contact_id, direction, platform, content) VALUES (UUID(), ?, ?, 'inbound', 'whatsapp', ?)",
      [client.id, contactId, contentToSave]
    );

    // Trigger socket.io event to update the frontend Inbox page in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`client_${client.id}`).emit('new_message', {
        contact_id: contactId,
        contact_name: contact.name || `User ${from}`,
        message: contentToSave,
        direction: 'inbound'
      });
    }

    /*
    =========================================
    🔄 VISUAL FLOW TRAVERSAL (FLOW ENGINE)
    =========================================
    */
    if (payload) {
      const postbackHandled = await handlePostback({
        clientId: client.id,
        contactId,
        platform: 'whatsapp',
        payload,
        io
      });
      if (postbackHandled) {
        return res.sendStatus(200);
      }
    }

    // Check if user text handles a pending input node in a flow
    if (messageText) {
      const inputHandled = await handleUserInput({
        clientId: client.id,
        contactId,
        platform: 'whatsapp',
        text: messageText,
        io
      });
      if (inputHandled) {
        return res.sendStatus(200);
      }

      const qrHandled = await handleTextQuickReply({
        clientId: client.id,
        contactId,
        text: messageText,
        io
      });
      if (qrHandled) {
        return res.sendStatus(200);
      }
    }

    // Check if DM text triggers a flow by keyword
    if (messageText) {
      const flowTriggered = await triggerFlow({
        clientId: client.id,
        contactId,
        platform: 'whatsapp',
        triggerType: 'keyword',
        triggerValue: messageText,
        io
      });
      if (flowTriggered) {
        return res.sendStatus(200);
      }
    }

    /*
    =========================================
    🎯 INTERACTIVE FLOW STEPS (CLAUDE FLOW FALLBACK)
    =========================================
    */
    if (payload === "CLAUDE_SEND_ACCESS" || messageText.toLowerCase().trim() === "send me the access") {
      console.log("🎯 Triggering Step 3 of WhatsApp Claude flow directly (bypassing follow)");
      const step3Text = `Hey servent of lord shyam 👋
Gen AI Workshop - absolutely FREE! 🚀

📂 Here is your Demo Drive Link Access:
👉 https://docs.google.com/document/d/1R7EzaFhkDRRmRPQI-cioTi-Q8MTQvx0ltP-YrrhyG7k/edit?usp=sharing

Cost: ₹0 (FREE!)
What you'll learn:
✅ 25+ Powerful AI Tools
✅ Become an Excel Pro

Reply karo apna WhatsApp number (e.g. 8801882652756) to get more updates!`;

      try {
        await axios.post(
          `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
          { messaging_product: "whatsapp", to: from, type: "text", text: { body: step3Text } },
          { headers: { Authorization: `Bearer ${client.wa_access_token}`, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.log("⚠️ Meta WA API failed (simulating reply text):");
      }

      const step3DisplayPayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: "Hey servent of lord shyam 👋 Gen AI Workshop - absolutely FREE! 🚀",
                subtitle: "Cost: ₹0 (FREE!) · 25+ Powerful AI Tools · Become an Excel Pro ✅",
                buttons: [
                  {
                    type: "web_url",
                    url: "https://docs.google.com/document/d/1R7EzaFhkDRRmRPQI-cioTi-Q8MTQvx0ltP-YrrhyG7k/edit?usp=sharing",
                    title: "🎁 Get Drive Access"
                  }
                ]
              }
            ]
          }
        }
      };
      const displayContent = JSON.stringify(step3DisplayPayload);

      await db.execute(
        `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
         VALUES (UUID(), ?, ?, 'outbound', 'whatsapp', ?)`,
        [client.id, contactId, displayContent]
      );

      if (io) {
        io.to(`client_${client.id}`).emit('new_message', {
          contact_id: contactId,
          contact_name: contact.name || `User ${from}`,
          message: displayContent,
          direction: 'outbound'
        });
      }

      return res.sendStatus(200);
    }

    if (payload === "CLAUDE_FOLLOWING_CONFIRMED" || messageText.toLowerCase().trim() === "i'm following ✅") {
      console.log("🎯 Triggering Step 3 of WhatsApp Claude flow");
      const step3Text = `Hey servent of lord shyam 👋
Gen AI Workshop - absolutely FREE! 🚀

📂 Here is your Demo Drive Link Access:
👉 https://docs.google.com/document/d/1R7EzaFhkDRRmRPQI-cioTi-Q8MTQvx0ltP-YrrhyG7k/edit?usp=sharing

Cost: ₹0 (FREE!)
What you'll learn:
✅ 25+ Powerful AI Tools
✅ Become an Excel Pro

Reply karo apna WhatsApp number (e.g. 8801882652756) to get more updates!`;

      try {
        await axios.post(
          `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
          { messaging_product: "whatsapp", to: from, type: "text", text: { body: step3Text } },
          { headers: { Authorization: `Bearer ${client.wa_access_token}`, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.log("⚠️ Meta WA API failed (simulating reply text):");
      }

      const step3DisplayPayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: "Hey servent of lord shyam 👋 Gen AI Workshop - absolutely FREE! 🚀",
                subtitle: "Cost: ₹0 (FREE!) · 25+ Powerful AI Tools · Become an Excel Pro ✅",
                buttons: [
                  {
                    type: "web_url",
                    url: "https://docs.google.com/document/d/1R7EzaFhkDRRmRPQI-cioTi-Q8MTQvx0ltP-YrrhyG7k/edit?usp=sharing",
                    title: "🎁 Get Drive Access"
                  }
                ]
              }
            ]
          }
        }
      };
      const displayContent = JSON.stringify(step3DisplayPayload);

      await db.execute(
        `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
         VALUES (UUID(), ?, ?, 'outbound', 'whatsapp', ?)`,
        [client.id, contactId, displayContent]
      );

      if (io) {
        io.to(`client_${client.id}`).emit('new_message', {
          contact_id: contactId,
          contact_name: contact.name || `User ${from}`,
          message: displayContent,
          direction: 'outbound'
        });
      }

      return res.sendStatus(200);
    }

    // 1. Keyword match fallback logic
    const [keywordRows] = await db.query(
      "SELECT * FROM keywords WHERE client_id = ? AND (platform = 'whatsapp' OR platform = 'all') AND is_active = 1",
      [client.id]
    );

    let matchedKeyword = null;
    const lower = messageText.toLowerCase().trim();
    const wordCount = lower.split(/\s+/).length;
    const isShortMessage = wordCount <= 4;

    for (const kw of keywordRows) {
      const k = kw.keyword.toLowerCase().trim();
      let isMatch = false;
      if (kw.match_type === 'exact') {
        isMatch = lower === k;
      } else if (kw.match_type === 'starts_with') {
        isMatch = lower.startsWith(k);
      } else if (isShortMessage) {
        isMatch = lower.includes(k);
      } else {
        const wordBoundary = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        isMatch = wordBoundary.test(lower) && lower.trim() === k;
      }

      if (isMatch) {
        matchedKeyword = kw;
        break;
      }
    }

    if (matchedKeyword) {
      try {
        await axios.post(
          `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
          { messaging_product: "whatsapp", to: from, type: "text", text: { body: matchedKeyword.reply_text } },
          { headers: { Authorization: `Bearer ${client.wa_access_token}`, "Content-Type": "application/json" } }
        );
        console.log("✅ WhatsApp auto-reply sent:", matchedKeyword.keyword);
      } catch (err) {
        console.log("⚠️ Meta WA API failed (token expired/invalid). Running simulation fallback:");
        console.log(`💬 TO: ${from} | REPLY: "${matchedKeyword.reply_text}"`);
      }
      await db.execute("UPDATE keywords SET hit_count = hit_count + 1 WHERE id = ?", [matchedKeyword.id]);

      // Save outbound auto-reply message
      await db.execute(
        "INSERT INTO messages (id, client_id, contact_id, direction, platform, content) VALUES (UUID(), ?, ?, 'outbound', 'whatsapp', ?)",
        [client.id, contactId, matchedKeyword.reply_text]
      );

      // Trigger socket.io event to update the frontend Inbox page in real-time
      if (io) {
        io.to(`client_${client.id}`).emit('new_message', {
          contact_id: contactId,
          contact_name: contact.name || `User ${from}`,
          message: matchedKeyword.reply_text,
          direction: 'outbound'
        });
      }
      return res.sendStatus(200);
    }

    // 2. Fallback: Generate reply using OpenAI AI
    try {
      console.log("🤖 No keyword or flow matched. Generating AI reply...");
      const { generateReply } = require("./ai");
      const replyText = await generateReply(messageText, client.business_name || client.name, "hinglish");
      
      if (replyText) {
        try {
          await axios.post(
            `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
            { messaging_product: "whatsapp", to: from, type: "text", text: { body: replyText } },
            { headers: { Authorization: `Bearer ${client.wa_access_token}`, "Content-Type": "application/json" } }
          );
          console.log("✅ WhatsApp AI auto-reply sent:", replyText);
        } catch (err) {
          console.log("⚠️ Meta WA API failed (token expired/invalid). Running simulation fallback for AI:");
          console.log(`💬 TO: ${from} | AI REPLY: "${replyText}"`);
        }

        // Save outbound AI reply message
        await db.execute(
          "INSERT INTO messages (id, client_id, contact_id, direction, platform, content) VALUES (UUID(), ?, ?, 'outbound', 'whatsapp', ?)",
          [client.id, contactId, replyText]
        );

        // Trigger socket.io event to update the frontend Inbox page in real-time
        if (io) {
          io.to(`client_${client.id}`).emit('new_message', {
            contact_id: contactId,
            contact_name: contact.name || `User ${from}`,
            message: replyText,
            direction: 'outbound'
          });
        }
      }
    } catch (aiErr) {
      console.log("❌ WhatsApp AI fallback reply failed:", aiErr.message);
    }
  } catch (err) {
    console.log("❌ WhatsApp webhook error:", err.message);
  }

  return res.sendStatus(200);
});

module.exports = router;
