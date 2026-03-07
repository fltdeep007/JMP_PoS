require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const existing = await User.findOne({ username: 'admin' });
  if (existing) {
    console.log('ℹ️  Admin user already exists — skipping.');
  } else {
    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', password: hashed });
    console.log('✅ Admin user created  (username: admin | password: admin123)');
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
