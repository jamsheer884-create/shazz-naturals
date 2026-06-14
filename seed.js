// Run this once to load all products into MongoDB
// Command: node seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shazznaturals';

const ProductSchema = new mongoose.Schema({
  name: String, category: String, price: Number, originalPrice: Number,
  description: String, ingredients: String, howToUse: String, benefits: [String],
  weight: String, image: String, inStock: Boolean, featured: Boolean,
  badge: String, rating: Number, reviewCount: Number,
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({ key: String }, { strict: false });

const Product  = mongoose.model('Product',  ProductSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

async function seed() {
  console.log('\n🌿 Shazz Natural\'s – Database Seeder\n');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Seed products
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));
  const products = data.products || [];

  const existing = await Product.countDocuments();
  if (existing > 0) {
    console.log(`⚠️  ${existing} products already exist in database. Skipping product seed.`);
    console.log('   (Delete all products from admin panel first if you want to re-seed)');
  } else {
    // Remove the old string IDs (MongoDB will create its own _id)
    const cleanProducts = products.map(({ id, ...p }) => p);
    await Product.insertMany(cleanProducts);
    console.log(`✅ ${cleanProducts.length} products loaded into MongoDB`);
  }

  // Seed default settings
  const settingsExist = await Settings.findOne({ key: 'main' });
  if (!settingsExist) {
    const settingsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'settings.json'), 'utf8'));
    await Settings.create({ ...settingsData, key: 'main' });
    console.log('✅ Default settings loaded into MongoDB');
  } else {
    console.log('⚠️  Settings already exist. Skipping.');
  }

  console.log('\n🎉 Database ready! Now run: node server.js\n');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
