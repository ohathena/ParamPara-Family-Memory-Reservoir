const crypto = require('crypto');
const env = require('../config/env');
const { HttpError } = require('../middleware/error');

// Signed direct upload to Cloudinary: the browser sends the file straight to Cloudinary,
// our server never handles image bytes (keeps the free server fast and light).
// The signature locks the folder, the allowed formats and a max size, so the browser cannot change them.
function signUpload(familyId) {
  if (!env.cloudinary.enabled) throw new HttpError(503, 'Photo uploads are not set up on this server');
  const params = {
    allowed_formats: 'jpg,jpeg,png,webp,heic,gif',
    folder: `parampara/${familyId}`,
    timestamp: Math.floor(Date.now() / 1000),
    transformation: 'c_limit,w_2000,h_2000,q_auto', // stored images are never larger than 2000px
  };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(toSign + env.cloudinary.apiSecret).digest('hex');
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
    fields: { ...params, api_key: env.cloudinary.apiKey, signature },
    maxBytes: 8 * 1024 * 1024,
  };
}

module.exports = { signUpload };
