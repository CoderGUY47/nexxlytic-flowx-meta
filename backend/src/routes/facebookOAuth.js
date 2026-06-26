const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/db');

// Redirect user to Facebook Login
router.get('/facebook', (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).send("Missing client_id parameter");
  }

  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  
  // Determine backend redirect URL
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.get('host');
  const redirectUri = `${protocol}://${host}/api/oauth/facebook/callback`;

  // If no credentials are set, automatically run the mock/simulated flow in demo mode
  const isDemoMode = !appId || appId.startsWith("demo_") || appId === "placeholder" || !appSecret || appSecret === "placeholder";
  
  if (isDemoMode) {
    console.log(`🤖 FB OAuth: App credentials missing. Running simulated flow for client: ${client_id}`);
    const simulatedCallbackUrl = `${redirectUri}?code=mock_oauth_code&state=${client_id}`;
    return res.redirect(simulatedCallbackUrl);
  }

  // Production Facebook OAuth dialog
  const scopes = [
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'pages_manage_metadata',
    'pages_read_engagement'
  ].join(',');

  const fbAuthUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${client_id}`;
  return res.redirect(fbAuthUrl);
});

// OAuth Callback handler
router.get('/facebook/callback', async (req, res) => {
  const { code, state: clientId, error } = req.query;
  
  if (error) {
    console.error("❌ FB OAuth error from query:", error);
    return res.redirect(`http://localhost:3000/settings?oauth=failed&reason=${error}`);
  }

  if (!code || !clientId) {
    return res.redirect(`http://localhost:3000/settings?oauth=failed&reason=invalid_callback`);
  }

  try {
    if (code === 'mock_oauth_code') {
      // MOCK DEMO FLOW
      console.log(`🤖 Simulating Facebook OAuth success for client ID: ${clientId}`);
      
      const mockPageId = "10284572849";
      const mockFbPageToken = `demo_fb_page_token_abc_${Date.now()}`;
      const mockIgPageToken = `demo_ig_page_token_xyz_${Date.now()}`;
      const mockWaAccessToken = `demo_wa_page_token_wa_${Date.now()}`;
      const mockWaPhoneNumberId = "1114352238437100";

      // Save credentials in the database
      await db.query(
        `UPDATE clients 
         SET fb_page_id = ?, 
             fb_page_token = ?, 
             ig_page_token = ?,
             wa_access_token = ?,
             wa_phone_number_id = ?
         WHERE id = ?`,
        [mockPageId, mockFbPageToken, mockIgPageToken, mockWaAccessToken, mockWaPhoneNumberId, clientId]
      );
      
      console.log(`✅ Demo Meta credentials successfully saved in client: ${clientId}`);
      return res.redirect(`http://localhost:3000/settings?oauth=success`);
    }

    // PRODUCTION METALLIC OAUTH EXCHANGE
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/api/oauth/facebook/callback`;

    // 1. Exchange code for user access token
    const tokenRes = await axios.get(`https://graph.facebook.com/v22.0/oauth/access_token`, {
      params: {
        client_id: appId,
        redirect_uri: redirectUri,
        client_secret: appSecret,
        code: code
      }
    });

    const userAccessToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived user access token
    const longLivedRes = await axios.get(`https://graph.facebook.com/v22.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: userAccessToken
      }
    });

    const longLivedToken = longLivedRes.data.access_token;

    // 3. Get user's managed Facebook Pages
    const pagesRes = await axios.get(`https://graph.facebook.com/v22.0/me/accounts`, {
      params: { access_token: longLivedToken }
    });

    const pages = pagesRes.data.data;
    if (!pages || pages.length === 0) {
      return res.redirect(`http://localhost:3000/settings?oauth=failed&reason=no_pages_found`);
    }

    // Select the first Facebook page for onboarding automatically, or look for specific page
    const selectedPage = pages[0];
    const pageId = selectedPage.id;
    const pageAccessToken = selectedPage.access_token; // Long-lived page access token!

    // 4. Look up connected Instagram Business account
    let igPageToken = pageAccessToken; // Often same scope, but let's query the connected IG business id
    let igBusinessAccountId = null;
    
    try {
      const igRes = await axios.get(`https://graph.facebook.com/v22.0/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken
        }
      });
      igBusinessAccountId = igRes.data?.instagram_business_account?.id;
    } catch (err) {
      console.warn("⚠️ Could not query connected Instagram Business Account:", err.message);
    }

    // 5. Update database with retrieved credentials
    await db.query(
      `UPDATE clients 
       SET fb_page_id = ?, 
           fb_page_token = ?, 
           ig_page_token = ? 
       WHERE id = ?`,
      [pageId, pageAccessToken, pageAccessToken, clientId]
    );

    console.log(`✅ Production Meta tokens connected successfully for client: ${clientId}`);
    return res.redirect(`http://localhost:3000/settings?oauth=success`);

  } catch (err) {
    console.error("❌ FB OAuth Exception:", err.response?.data || err.message);
    return res.redirect(`http://localhost:3000/settings?oauth=failed&reason=server_exception`);
  }
});

module.exports = router;
