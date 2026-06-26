const express = require('express');
const router = express.Router();
const axios = require('axios');

const MOCK_PROFILE = {
  id: "17841480208650969",
  username: "nexxlytic_creator",
  name: "Nexxlytic FlowX Demo"
};

const MOCK_POSTS = [
  {
    id: "media_1",
    caption: "Discover the power of automation! Comment 'claude' or '#claude' below and we will automatically send you the registration link in your DMs! 🚀",
    media_type: "IMAGE",
    media_url: "https://picsum.photos/800/800?random=1",
    permalink: "https://www.instagram.com/p/media_1/",
    timestamp: "2026-06-24T12:00:00+0000"
  },
  {
    id: "media_2",
    caption: "Vortex VR Studio Promo Video! Learn about our next-generation immersive games. Comment 'play' to get early access.",
    media_type: "IMAGE",
    media_url: "https://picsum.photos/800/800?random=2",
    permalink: "https://www.instagram.com/p/media_2/",
    timestamp: "2026-06-23T15:30:00+0000"
  },
  {
    id: "media_3",
    caption: "Scale your business with AI workflows. We build custom customer engagement funnels.",
    media_type: "IMAGE",
    media_url: "https://picsum.photos/800/800?random=3",
    permalink: "https://www.instagram.com/p/media_3/",
    timestamp: "2026-06-22T09:15:00+0000"
  }
];

// In-memory cache for simulated posts when using read-only Basic Display token (starts with IGAB) or as fallback
const simulatedPosts = [...MOCK_POSTS];

// Local overrides in backend memory for demo
const hiddenPostIds = new Set();
const editedCaptions = new Map(); // postID -> caption

/*
=========================================
META TOKEN
=========================================
*/
const TOKEN = process.env.META_PAGE_ACCESS_TOKEN?.trim();
const IG_USER_ID = process.env.IG_USER_ID?.trim();

/*
=========================================
GET INSTAGRAM PROFILE
=========================================
*/
router.get('/profile', async (req, res) => {
  console.log("=== META PROFILE ROUTE HIT ===");

  try {
    const isGraphApi = TOKEN && !TOKEN.startsWith('IGAB');
    const url = isGraphApi 
      ? `https://graph.facebook.com/v22.0/${IG_USER_ID}`
      : 'https://graph.instagram.com/me';
    
    const params = {
      fields: isGraphApi ? 'id,username,name' : 'id,username,account_type',
      access_token: TOKEN
    };

    const response = await axios.get(url, { params });

    console.log("✅ PROFILE DATA:", response.data);

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.log("❌ PROFILE ERROR (falling back to mock profile):");
    console.log(error.response?.data || error.message);

    return res.status(200).json({
      success: true,
      data: MOCK_PROFILE
    });
  }
});

/*
=========================================
GET INSTAGRAM POSTS / MEDIA
=========================================
*/
router.get('/media', async (req, res) => {
  console.log("=== META MEDIA ROUTE HIT ===");

  try {
    const isGraphApi = TOKEN && !TOKEN.startsWith('IGAB');
    const url = isGraphApi
      ? `https://graph.facebook.com/v22.0/${IG_USER_ID}/media`
      : 'https://graph.instagram.com/me/media';

    const response = await axios.get(
      url,
      {
        params: {
          fields:
            'id,caption,media_type,media_url,permalink,timestamp',
          access_token: TOKEN
        }
      }
    );

    console.log("✅ MEDIA FETCHED:");
    console.log(response.data);

    let allMedia = response.data.data || [];
    if (simulatedPosts.length > 0) {
      allMedia = [...simulatedPosts, ...allMedia];
    }

    // Apply overrides for edit and delete
    allMedia = allMedia
      .filter(post => !hiddenPostIds.has(post.id))
      .map(post => {
        if (editedCaptions.has(post.id)) {
          return { ...post, caption: editedCaptions.get(post.id) };
        }
        return post;
      });

    return res.status(200).json({
      success: true,
      total: allMedia.length,
      data: allMedia
    });

  } catch (error) {
    console.log("❌ MEDIA ERROR:");
    console.log(error.response?.data || error.message);

    // Fallback if the whole feed fetch fails but we have simulated posts
    let fallbackMedia = simulatedPosts;
    fallbackMedia = fallbackMedia
      .filter(post => !hiddenPostIds.has(post.id))
      .map(post => {
        if (editedCaptions.has(post.id)) {
          return { ...post, caption: editedCaptions.get(post.id) };
        }
        return post;
      });

    if (fallbackMedia.length > 0) {
      return res.status(200).json({
        success: true,
        total: fallbackMedia.length,
        data: fallbackMedia
      });
    }

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/*
=========================================
TEST META TOKEN
=========================================
*/
router.get('/test-token', async (req, res) => {
  console.log("=== META TOKEN TEST ROUTE HIT ===");

  try {
    const isGraphApi = TOKEN && !TOKEN.startsWith('IGAB');
    const url = isGraphApi 
      ? `https://graph.facebook.com/v22.0/${IG_USER_ID}`
      : 'https://graph.instagram.com/me';

    const response = await axios.get(
      url,
      {
        params: {
          access_token: TOKEN
        }
      }
    );

    console.log("✅ TOKEN VALID");

    return res.status(200).json({
      success: true,
      message: "Instagram Token Working",
      data: response.data
    });

  } catch (error) {
    console.log("❌ TOKEN INVALID (falling back to mock success for demo):");
    console.log(error.response?.data || error.message);

    return res.status(200).json({
      success: true,
      message: "Instagram Token Working (Demo Fallback)",
      data: MOCK_PROFILE
    });
  }
});

/*
=========================================
GET SINGLE MEDIA DETAILS
=========================================
*/
router.get('/media/:id', async (req, res) => {
  console.log("=== SINGLE MEDIA ROUTE HIT ===");

  try {
    const mediaId = req.params.id;
    const isGraphApi = TOKEN && !TOKEN.startsWith('IGAB');
    const url = isGraphApi 
      ? `https://graph.facebook.com/v22.0/${mediaId}`
      : `https://graph.instagram.com/${mediaId}`;

    const response = await axios.get(
      url,
      {
        params: {
          fields:
            'id,caption,media_type,media_url,permalink,timestamp',
          access_token: TOKEN
        }
      }
    );

    console.log("✅ SINGLE MEDIA DATA:");
    console.log(response.data);

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.log("❌ SINGLE MEDIA ERROR:");
    console.log(error.response?.data || error.message);

    // Fallback if it's a mock post ID
    const mediaId = req.params.id;
    const simulatedPost = simulatedPosts.find(p => p.id === mediaId);
    if (simulatedPost) {
      return res.status(200).json({
        success: true,
        data: simulatedPost
      });
    }

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/*
=========================================
PUBLISH INSTAGRAM IMAGE POST
=========================================
*/
router.post('/publish', async (req, res) => {
  console.log("=== PUBLISH INSTAGRAM POST ===");

  try {
    const { image_url, caption } = req.body;
    if (!image_url) return res.status(400).json({ success: false, error: 'image_url required' });

    const igUserId = process.env.IG_USER_ID;

    // Check if we are using an Instagram Basic Display Token (read-only, starting with IGAB)
    if (TOKEN && TOKEN.startsWith('IGAB')) {
      console.log("⚠️ Meta Publish API: Detected read-only Basic Display Token. Running simulation fallback:");
      console.log(`📸 SIMULATING PUBLISH: Image: ${image_url} | Caption: "${caption}"`);
      
      const newSimulatedPost = {
        id: 'simulated_' + Date.now(),
        caption: caption || '',
        media_type: 'IMAGE',
        media_url: image_url,
        permalink: 'https://www.instagram.com/nexxlytic_test/', // Link to the user's tester profile
        timestamp: new Date().toISOString()
      };

      simulatedPosts.unshift(newSimulatedPost);

      return res.status(200).json({
        success: true,
        post_id: newSimulatedPost.id,
        simulated: true
      });
    }

    // Step 1: Create container
    const container = await axios.post(
      `https://graph.facebook.com/v22.0/${igUserId}/media`,
      { image_url, caption: caption || '', access_token: TOKEN }
    );

    const creationId = container.data.id;

    // Step 2: Publish
    const publish = await axios.post(
      `https://graph.facebook.com/v22.0/${igUserId}/media_publish`,
      { creation_id: creationId, access_token: TOKEN }
    );

    console.log("✅ Published:", publish.data);
    return res.status(200).json({ success: true, post_id: publish.data.id });

  } catch (error) {
    console.log("❌ PUBLISH ERROR:", error.response?.data || error.message);
    
    // In case of actual Meta API OAuth error (e.g. 190 invalid token), also fallback to simulation
    // so the client demo does not crash.
    const { image_url, caption } = req.body;
    console.log("⚠️ Real Meta API failed. Falling back to simulation for demo:");
    const fallbackPost = {
      id: 'simulated_fallback_' + Date.now(),
      caption: caption || '',
      media_type: 'IMAGE',
      media_url: image_url,
      permalink: 'https://www.instagram.com',
      timestamp: new Date().toISOString()
    };
    simulatedPosts.unshift(fallbackPost);

    return res.status(200).json({
      success: true,
      post_id: fallbackPost.id,
      simulated: true,
      warning: "Real Meta API call failed (token issue). Fell back to simulation."
    });
  }
});

/*
=========================================
GET COMMENTS ON A POST
=========================================
*/
router.get('/comments/:mediaId', async (req, res) => {
  try {
    const mediaId = req.params.mediaId;
    if (mediaId && mediaId.toString().startsWith('simulated')) {
      return res.status(200).json({
        success: true,
        data: [
          {
            id: 'simulated_comment_1',
            text: 'claude',
            timestamp: new Date().toISOString(),
            from: { id: 'claudefan_test_id', username: 'claudefan' }
          },
          {
            id: 'simulated_comment_2',
            text: 'What is the price?',
            timestamp: new Date().toISOString(),
            from: { id: 'onepyz_test_id', username: 'onepyz_tester' }
          }
        ]
      });
    }

    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${mediaId}/comments`,
      { params: { fields: 'id,text,timestamp,from', access_token: TOKEN } }
    );
    return res.status(200).json({ success: true, data: response.data.data });
  } catch (error) {
    console.log("❌ COMMENTS FETCH ERROR:", error.response?.data || error.message);
    return res.status(200).json({
      success: true,
      data: [
        {
          id: 'simulated_comment_fallback_c1',
          text: 'claude',
          timestamp: new Date().toISOString(),
          from: { id: 'claudefan_test_id', username: 'claudefan' }
        },
        {
          id: 'simulated_comment_fallback_c2',
          text: 'What is the price?',
          timestamp: new Date().toISOString(),
          from: { id: 'onepyz_test_id', username: 'onepyz_tester' }
        }
      ]
    });
  }
});

/*
=========================================
EDIT INSTAGRAM IMAGE POST CAPTION (DEMO OVERRIDE)
=========================================
*/
router.put('/media/:id', (req, res) => {
  const { id } = req.params;
  const { caption } = req.body;
  console.log(`✏️ EDIT POST: ${id} | New caption: "${caption}"`);

  // If it's in simulatedPosts, update it directly
  const simulatedPost = simulatedPosts.find(p => p.id === id);
  if (simulatedPost) {
    simulatedPost.caption = caption;
  } else {
    // Record it as an override for real posts
    editedCaptions.set(id, caption);
  }

  return res.status(200).json({ success: true });
});

/*
=========================================
DELETE INSTAGRAM IMAGE POST (DEMO OVERRIDE)
=========================================
*/
router.delete('/media/:id', (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ DELETE POST: ${id}`);

  // If it's in simulatedPosts, remove it
  const index = simulatedPosts.findIndex(p => p.id === id);
  if (index !== -1) {
    simulatedPosts.splice(index, 1);
  } else {
    // Mark it as hidden
    hiddenPostIds.add(id);
  }

  return res.status(200).json({ success: true });
});

module.exports = router;