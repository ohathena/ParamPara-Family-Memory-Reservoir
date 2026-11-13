require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    console.error('Missing MONGO_URI or JWT_SECRET in .env');
    process.exit(1);
  }
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
