const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

module.exports = async function connectDB() {
  if (!env.mongoUri) throw new Error('Missing MONGO_URI in environment');
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 });
  console.log('MongoDB connected');
};
