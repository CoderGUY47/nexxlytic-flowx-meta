const axios = require('axios');

const META_API = 'https://graph.facebook.com/v19.0';

exports.getInstagramProfile = async () => {
  try {
    const response = await axios.get(
      `${META_API}/me`,
      {
        params: {
          fields: 'id,name',
          access_token: process.env.META_PAGE_ACCESS_TOKEN
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error("META SERVICE ERROR:", error.response?.data || error.message);
    throw error;
  }
};