// One place that reads and checks environment variables.
// Fail fast with a clear message instead of crashing later with a confusing one.
require('dotenv').config({ quiet: true });

const list = (s, fallback) => (s || fallback).split(',').map((x) => x.trim()).filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // several allowed frontends can be comma separated
  clientUrls: list(process.env.CLIENT_URL, 'http://localhost:5173'),
  trustProxy: process.env.TRUST_PROXY === 'true', // set to true when hosted behind a proxy (Render, Railway...)

  // Email (password reset). Uses an HTTPS API, because free hosts (Render) block SMTP ports.
  //   EMAIL_PROVIDER=brevo  (free, no own domain needed)   or   resend
  email: {
    provider: (process.env.EMAIL_PROVIDER || '').toLowerCase(),
    apiKey: process.env.EMAIL_API_KEY || '',
    from: process.env.MAIL_FROM || '',
    fromName: process.env.MAIL_FROM_NAME || 'ParamPara',
  },

  // Photo uploads go straight from the browser to Cloudinary (free tier). The server only signs them.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};
env.isTest = env.nodeEnv === 'test';
env.isProd = env.nodeEnv === 'production';
// links inside emails point here (first CLIENT_URL unless APP_URL is set)
env.appUrl = (process.env.APP_URL || env.clientUrls[0]).replace(/\/$/, '');
env.email.enabled = ['brevo', 'resend'].includes(env.email.provider) && !!env.email.apiKey && !!env.email.from;
env.cloudinary.enabled = !!(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

if (!env.jwtSecret) throw new Error('Missing JWT_SECRET in environment');
if (env.isProd && env.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');
if (!env.isProd && env.jwtSecret.length < 16) console.warn('Warning: JWT_SECRET is short, use a long random string');
if (env.email.provider && !env.email.enabled && !env.isTest) console.warn('Warning: EMAIL_PROVIDER is set but EMAIL_API_KEY or MAIL_FROM is missing, emails are off');

module.exports = env;
