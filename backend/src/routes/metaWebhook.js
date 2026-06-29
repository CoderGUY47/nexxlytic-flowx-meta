const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

const axios = require("axios");
const db = require("../config/db");
const { generateAIReply } = require("../services/aiService");
const { triggerFlow, handlePostback, handleUserInput, handleTextQuickReply } = require("../services/flowEngine");

console.log("🔥 META WEBHOOK FILE LOADED");

/*
=========================================
ENV
=========================================
*/
const ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;

const WHATSAPP_TOKEN = process.env.WA_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

const WHATSAPP_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;

/*
=========================================
VERIFY WEBHOOK
=========================================
*/
router.get("/", (req, res) => {
  console.log("=== META VERIFY ===");

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WA_VERIFY_TOKEN) {
    console.log("✅ VERIFIED");

    return res.status(200).send(challenge);
  }

  console.log("❌ VERIFY FAILED");

  return res.sendStatus(403);
});

/*
=========================================
HELPERS
=========================================
*/
function extractPhone(text) {
  if (!text) return null;

  const cleaned = text.replace(/\D/g, "");

  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }

  return null;
}

/*
=========================================
SEND INSTAGRAM DM
=========================================
*/
async function sendInstagramMessage(recipient, messagePayload, customToken) {
  try {
    const tokenToUse = customToken || ACCESS_TOKEN;
    const message = typeof messagePayload === 'object' ? messagePayload : { text: messagePayload };
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/me/messages`,
      {
        recipient: typeof recipient === 'object' ? recipient : { id: recipient },
        message,
      },
      {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Instagram DM Sent");

    return response.data;
  } catch (err) {
    console.log("❌ DM SEND ERROR:", err.response?.data || err.message);
  }
}

async function fetchInstagramProfile(senderId, pageToken) {
  try {
    const res = await axios.get(`https://graph.facebook.com/v22.0/${senderId}`, {
      params: {
        fields: 'name,username',
        access_token: pageToken
      }
    });
    const displayName = res.data?.name || res.data?.username || senderId;
    return { name: displayName, username: res.data?.username || senderId };
  } catch (err) {
    console.warn("⚠️ Failed to fetch Instagram profile details from API:", err.response?.data || err.message);
    return { name: senderId, username: senderId };
  }
}


/*
=========================================
SEND WHATSAPP MESSAGE
=========================================
*/
async function sendWhatsAppMessage(phone, text) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: text,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ WhatsApp message sent");

    return response.data;
  } catch (err) {
    console.log("❌ WhatsApp Error:", err.response?.data || err.message);
  }
}

/*
=========================================
WEBHOOK RECEIVE
=========================================
*/
router.post("/", async (req, res) => {
  console.log("=== EVENT RECEIVED ===");

  try {
    console.log("📦 FULL PAYLOAD:");
    console.log(JSON.stringify(req.body, null, 2));

    if (req.body.object !== "instagram") {
      return res.sendStatus(200);
    }

    const entry = req.body.entry?.[0];

    // Resolve client: check query parameter first (for simulated UI webhooks)
    let client = null;
    const queryClientId = req.query.client_id;
    if (queryClientId) {
      const [rows] = await db.query("SELECT * FROM clients WHERE id = ? LIMIT 1", [queryClientId]);
      client = rows[0];
    }

    const receiverId = entry?.id;

    if (!client && receiverId) {
      // Find client dynamically based on the receiver's Instagram Business ID or Facebook Page ID
      const [clientRows] = await db.query(
        "SELECT * FROM clients WHERE ig_user_id = ? OR fb_page_id = ? LIMIT 1",
        [receiverId, receiverId]
      );
      client = clientRows[0];
    }

    if (!client) {
      // Fallback: Prioritize Vortex VR Studios for testing
      const [clientRows] = await db.query(
        "SELECT * FROM clients WHERE id = 'e121d9ae-6da1-4778-8dd2-439509ee5722' LIMIT 1"
      );
      client = clientRows[0];
    }

    if (!client) {
      console.log("❌ No client found for Instagram webhook processing");
      return res.sendStatus(200);
    }

    /*
    =========================================
    💬 COMMENT EVENTS
    =========================================
    */
    const change = entry?.changes?.[0];

    if (change?.field === "comments") {
      /*
      IGNORE SELF GENERATED COMMENTS
      */
      if (change.value?.from?.id === IG_USER_ID) {
        console.log("⚠️ Ignoring self-generated comment event");
        return res.sendStatus(200);
      }

       const commentText = change.value?.text;
      const senderId = change.value?.from?.id;
      const commentId = change.value?.id;
      const postId = change.value?.media?.id || change.value?.parent_id;

      console.log("💬 Comment:", commentText);
      console.log("👤 User:", senderId);
      console.log("🆔 Comment ID:", commentId);
      console.log("📝 Post ID:", postId);

      if (!commentText || !senderId || !commentId) {
        return res.sendStatus(200);
      }

      // Find or create contact using Instagram sender ID
      let [contacts] = await db.execute(
        "SELECT id FROM contacts WHERE client_id = ? AND phone = ? AND platform = 'instagram' LIMIT 1",
        [client.id, senderId]
      );
      let contactId;
      if (contacts.length) {
        contactId = contacts[0].id;
      } else {
        contactId = uuidv4();
        const profile = await fetchInstagramProfile(senderId, client.fb_page_token);
        await db.execute(
          "INSERT INTO contacts (id, client_id, name, phone, platform) VALUES (?, ?, ?, ?, 'instagram')",
          [contactId, client.id, profile.name, senderId]
        );
      }

      // Save inbound comment message so it shows up in dashboard Inbox log
      await db.execute(
        `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
         VALUES (UUID(), ?, ?, 'inbound', 'instagram', ?)`,
        [client.id, contactId, `Comment: "${commentText}"`]
      );

      // Trigger socket.io event for real-time Inbox display
      const io = req.app.get('io');
      if (io) {
        io.to(`client_${client.id}`).emit('new_message', {
          contact_id: contactId,
          contact_name: `Instagram User`,
          message: `Comment: "${commentText}"`
        });
      }

      // Try triggering a visual graph flow first
      const flowTriggered = await triggerFlow({
        clientId: client.id,
        contactId,
        platform: 'instagram',
        triggerType: 'keyword',
        triggerValue: commentText,
        io,
        postId: postId
      });

      if (flowTriggered) {
        // Reply to comment on Instagram
        try {
          await axios.post(
            `https://graph.facebook.com/v22.0/${commentId}/replies`,
            { message: "Thanks for your comment! 🙌 Check your DM for details." },
            { headers: { Authorization: `Bearer ${client.fb_page_token}`, "Content-Type": "application/json" } }
          );
          console.log("✅ Comment reply posted successfully");
        } catch (err) {
          console.log("⚠️ Meta API comment reply failed (simulating comment reply):");
          console.log(`💬 Reply to comment ${commentId}: "Thanks for your comment! 🙌 Check your DM for details."`);
        }
        return res.sendStatus(200);
      }

      // Check for Claude keyword match (hardcoded fallback)
      const cleanedComment = commentText.toLowerCase().trim().replace(/^#/, '');
      if (cleanedComment === 'claude') {
        console.log("🎯 Claude keyword match detected in comment!");

        // Reply to comment on Instagram
        try {
          await axios.post(
            `https://graph.facebook.com/v22.0/${commentId}/replies`,
            { message: "Thanks for your comment! 🙌 Check your DM for details." },
            { headers: { Authorization: `Bearer ${client.fb_page_token}`, "Content-Type": "application/json" } }
          );
          console.log("✅ Comment reply posted successfully");
        } catch (err) {
          console.log("⚠️ Meta API comment reply failed (simulating comment reply):");
          console.log(`💬 Reply to comment ${commentId}: "Thanks for your comment! 🙌 Check your DM for details."`);
        }

        // Send Step 1 DM to the commenter
        const step1Payload = {
          text: "Hey there! Glad you're here 😊 Tap below and I'll send you the access in just a moment ✨",
          quick_replies: [
            {
              content_type: "text",
              title: "Send me the access",
              payload: "CLAUDE_SEND_ACCESS"
            }
          ]
        };

        try {
          await sendInstagramMessage(senderId, step1Payload, client.fb_page_token);
        } catch (err) {
          console.log("⚠️ Meta API DM failed (simulating DM):");
          console.log(`💬 DM TO: ${senderId} | "${step1Payload.text}"`);
        }

        // Save outbound reply message
        await db.execute(
          `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
           VALUES (UUID(), ?, ?, 'outbound', 'instagram', ?)`,
          [client.id, contactId, JSON.stringify(step1Payload)]
        );

        // Trigger socket.io event for outbound reply in real-time
        if (io) {
          io.to(`client_${client.id}`).emit('new_message', {
            contact_id: contactId,
            contact_name: `Instagram User`,
            message: step1Payload.text
          });
        }

        return res.sendStatus(200);
      }

      // Query keywords configured in database for this client
      const [keywordRows] = await db.query(
        "SELECT * FROM keywords WHERE client_id = ? AND (platform = 'instagram' OR platform = 'all')",
        [client.id]
      );

      let matchedKeyword = null;
      for (const kw of keywordRows) {
        // If keyword is post-specific, it must match the postId
        if (kw.post_id && kw.post_id !== postId) {
          continue;
        }

        const textMatch = kw.match_type === 'exact'
          ? commentText.toLowerCase().trim() === kw.keyword.toLowerCase().trim()
          : commentText.toLowerCase().includes(kw.keyword.toLowerCase());

        if (textMatch) {
          matchedKeyword = kw;
          break;
        }
      }

      let replyText = "";
      let isAiReply = 0;

      if (matchedKeyword) {
        console.log("✅ Comment Keyword matched:", matchedKeyword.keyword);
        replyText = matchedKeyword.reply_text;
        await db.execute("UPDATE keywords SET hit_count = hit_count + 1 WHERE id = ?", [matchedKeyword.id]);
      } else {
        console.log("🤖 Comment: No keyword matched. Generating AI reply...");
        replyText = await generateAIReply(commentText, []);
        isAiReply = 1;
      }

      // Reply to comment on Instagram
      try {
        await axios.post(
          `https://graph.facebook.com/v22.0/${commentId}/replies`,
          { message: "Thanks for your comment! 🙌 Check your DM for details." },
          { headers: { Authorization: `Bearer ${client.fb_page_token}`, "Content-Type": "application/json" } }
        );
        console.log("✅ Comment reply posted successfully");
      } catch (err) {
        console.log("⚠️ Meta API comment reply failed (simulating comment reply):");
        console.log(`💬 Reply to comment ${commentId}: "Thanks for your comment! 🙌 Check your DM for details."`);
      }

      // Send DM to the commenter
      const waPhone = client.wa_phone_display || process.env.WA_PHONE_DISPLAY || "";
      const waLink = waPhone ? `\n\n💬 Chat on WhatsApp: https://wa.me/${waPhone}` : "";
      const fullDmText = replyText + waLink;

      try {
        await sendInstagramMessage(senderId, fullDmText, client.fb_page_token);
      } catch (err) {
        console.log("⚠️ Meta API DM failed (simulating DM):");
        console.log(`💬 DM TO: ${senderId} | "${fullDmText}"`);
      }

      // Save outbound reply message
      await db.execute(
        `INSERT INTO messages (id, client_id, contact_id, direction, platform, content, is_ai_reply)
         VALUES (UUID(), ?, ?, 'outbound', 'instagram', ?, ?)`,
        [client.id, contactId, replyText, isAiReply]
      );

      // Trigger socket.io event for outbound reply in real-time
      if (io) {
        io.to(`client_${client.id}`).emit('new_message', {
          contact_id: contactId,
          contact_name: `Instagram User`,
          message: replyText
        });
      }

      return res.sendStatus(200);
    }

    /*
    =========================================
    📩 INSTAGRAM DM FLOW
    =========================================
    */
    const messagingEvent = entry?.messaging?.[0];

    if (messagingEvent) {
      const senderId = messagingEvent?.sender?.id;
      const messageText = messagingEvent?.message?.text || messagingEvent?.postback?.title || "";
      const quickReplyPayload = messagingEvent?.message?.quick_reply?.payload;
      const postbackPayload = messagingEvent?.postback?.payload;
      const payload = quickReplyPayload || postbackPayload;

      const attachments = messagingEvent?.message?.attachments;
      const isStoryMention = attachments && attachments.some(att => att.type === 'story_mention');

      console.log("📩 Instagram DM/Postback received");
      console.log("👤 Sender:", senderId);
      console.log("💬 Message Text:", messageText);
      console.log("🏷️ Payload:", payload);
      console.log("📸 Is Story Mention:", isStoryMention);

      if (!senderId) {
        return res.sendStatus(200);
      }

      // Find or create contact using Instagram sender ID
      let [contacts] = await db.execute(
        "SELECT id FROM contacts WHERE client_id = ? AND phone = ? AND platform = 'instagram' LIMIT 1",
        [client.id, senderId]
      );
      let contactId;
      if (contacts.length) {
        contactId = contacts[0].id;
      } else {
        contactId = uuidv4();
        const profile = await fetchInstagramProfile(senderId, client.fb_page_token);
        await db.execute(
          "INSERT INTO contacts (id, client_id, name, phone, platform) VALUES (?, ?, ?, ?, 'instagram')",
          [contactId, client.id, profile.name, senderId]
        );
      }

      const contentToSave = isStoryMention
        ? "[Story Mention 📸]"
        : (messageText || (payload ? `[Button Clicked: ${payload}]` : ""));

      // Save incoming message in database
      await db.execute(
        `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
         VALUES (UUID(), ?, ?, 'inbound', 'instagram', ?)`,
        [client.id, contactId, contentToSave]
      );

      // Trigger socket.io event for incoming DM in real-time
      const io = req.app.get('io');
      if (io) {
        io.to(`client_${client.id}`).emit('new_message', {
          contact_id: contactId,
          contact_name: `Instagram User`,
          message: contentToSave
        });
      }

      // If Story Mention, try triggering a specific Story Mention flow
      if (isStoryMention) {
        console.log("📸 Triggering Story Mention visual flow...");
        const flowTriggered = await triggerFlow({
          clientId: client.id,
          contactId,
          platform: 'instagram',
          triggerType: 'story_mention',
          triggerValue: 'story_mention',
          io
        });
        if (flowTriggered) {
          return res.sendStatus(200);
        }
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
          platform: 'instagram',
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
          platform: 'instagram',
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
          platform: 'instagram',
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
        console.log("🎯 Triggering Step 2 of Claude flow");
        const step2Payload = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: "Almost there !",
                  subtitle: "Please visit my profile and tap follow to continue 😌",
                  buttons: [
                    {
                      type: "web_url",
                      url: "https://www.instagram.com/nexxlytic_test/",
                      title: "Visit Profile"
                    },
                    {
                      type: "postback",
                      title: "I'm following ✅",
                      payload: "CLAUDE_FOLLOWING_CONFIRMED"
                    }
                  ]
                }
              ]
            }
          }
        };

        try {
          await sendInstagramMessage(senderId, step2Payload, client.fb_page_token);
        } catch (err) {
          console.log("⚠️ Meta API template send failed. Falling back to quick replies:", err.message);
          await sendInstagramMessage(senderId, {
            text: "Almost there! Please visit my profile and tap follow to continue 😌\n\nProfile: https://www.instagram.com/nexxlytic_test/",
            quick_replies: [
              {
                content_type: "text",
                title: "I'm following ✅",
                payload: "CLAUDE_FOLLOWING_CONFIRMED"
              }
            ]
          }, client.fb_page_token);
        }

        const displayContent = JSON.stringify(step2Payload);
        await db.execute(
          `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
           VALUES (UUID(), ?, ?, 'outbound', 'instagram', ?)`,
          [client.id, contactId, displayContent]
        );

        if (io) {
          io.to(`client_${client.id}`).emit('new_message', {
            contact_id: contactId,
            contact_name: `Instagram User`,
            message: displayContent
          });
        }

        return res.sendStatus(200);
      }

      if (payload === "CLAUDE_FOLLOWING_CONFIRMED" || messageText.toLowerCase().trim() === "i'm following ✅") {
        console.log("🎯 Triggering Step 3 of Claude flow");
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
          await sendInstagramMessage(senderId, step3Text, client.fb_page_token);
        } catch (err) {
          console.log("⚠️ Meta API DM failed (simulating reply DM):");
          console.log(`💬 DM TO: ${senderId} | "${step3Text}"`);
        }

        await db.execute(
          `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
           VALUES (UUID(), ?, ?, 'outbound', 'instagram', ?)`,
          [client.id, contactId, step3Text]
        );

        if (io) {
          io.to(`client_${client.id}`).emit('new_message', {
            contact_id: contactId,
            contact_name: `Instagram User`,
            message: step3Text
          });
        }

        return res.sendStatus(200);
      }


      /*
      =========================================
      📞 PHONE DETECTION
      =========================================
      */
      const phone = extractPhone(messageText);

      if (phone) {
        console.log("📞 Phone captured:", phone);

        // Send WhatsApp confirmation message
        await sendWhatsAppMessage(
          phone,
          `Hey 👋 Welcome to ${client.business_name || client.name}.\nWe received your request successfully.\nOur team will contact you shortly.`
        );

        // Confirm on Instagram
        const confirmationReply = "✅ Thank you! Our team will contact you on WhatsApp shortly.";
        await sendInstagramMessage(senderId, confirmationReply, client.fb_page_token);

        // Save confirmation DM message
        await db.execute(
          `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
           VALUES (UUID(), ?, ?, 'outbound', 'instagram', ?)`,
          [client.id, contactId, confirmationReply]
        );

        // Trigger socket.io event for confirmation
        if (io) {
          io.to(`client_${client.id}`).emit('new_message', {
            contact_id: contactId,
            contact_name: `Instagram User`,
            message: confirmationReply
          });
        }

        return res.sendStatus(200);
      }

      /*
      =========================================
      🎯 KEYWORD FLOW
      =========================================
      */
      const [keywordRows] = await db.query(
        "SELECT * FROM keywords WHERE client_id = ? AND (platform = 'instagram' OR platform = 'all')",
        [client.id]
      );

      let matchedKeyword = null;
      for (const kw of keywordRows) {
        const textMatch = kw.match_type === 'exact'
          ? messageText.toLowerCase().trim() === kw.keyword.toLowerCase().trim()
          : messageText.toLowerCase().includes(kw.keyword.toLowerCase());

        if (textMatch) {
          matchedKeyword = kw;
          break;
        }
      }

      let reply = "";
      let isAiReply = 0;

      if (matchedKeyword) {
        console.log("✅ DM Keyword matched:", matchedKeyword.keyword);
        reply = matchedKeyword.reply_text;
        await db.execute("UPDATE keywords SET hit_count = hit_count + 1 WHERE id = ?", [matchedKeyword.id]);
      } else {
        /*
        =========================================
        🤖 NO KEYWORD MATCHED: AI REPLY
        =========================================
        */
        console.log("🤖 DM: No keyword matched. Generating AI reply...");
        const [rows] = await db.execute(
          `SELECT content, direction
           FROM messages
           WHERE contact_id = ?
           ORDER BY created_at DESC
           LIMIT 5`,
          [contactId]
        );

        const history = rows.reverse().map((msg) => ({
          role: msg.direction === "inbound" ? "user" : "assistant",
          content: msg.content,
        }));

        reply = await generateAIReply(messageText, history);
        isAiReply = 1;
      }

      // Send Instagram reply DM
      try {
        await sendInstagramMessage(senderId, reply, client.fb_page_token);
      } catch (err) {
        console.log("⚠️ Meta API DM failed (simulating reply DM):");
        console.log(`💬 DM TO: ${senderId} | "${reply}"`);
      }

      // Save outgoing reply message
      await db.execute(
        `INSERT INTO messages (id, client_id, contact_id, direction, platform, content, is_ai_reply)
         VALUES (UUID(), ?, ?, 'outbound', 'instagram', ?, ?)`,
        [client.id, contactId, reply, isAiReply]
      );

      // Trigger socket.io event for outbound reply in real-time
      if (io) {
        io.to(`client_${client.id}`).emit('new_message', {
          contact_id: contactId,
          contact_name: `Instagram User`,
          message: reply
        });
      }

      return res.sendStatus(200);
    }

    console.log("⚠️ Unknown event type");
    return res.sendStatus(200);
  } catch (error) {
    console.log("❌ WEBHOOK ERROR:", error.response?.data || error.message);

    return res.sendStatus(500);
  }
});

module.exports = router;
