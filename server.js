require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const multer     = require('multer');
const bcrypt     = require('bcryptjs');
const mongoose   = require('mongoose');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shazznaturals';

mongoose.connect(MONGO_URI)
  .then(() => console.log('  ✅ MongoDB connected'))
  .catch(err => {
    console.error('  ❌ MongoDB connection failed:', err.message);
    console.error('  Make sure MONGODB_URI is set in your .env file');
    process.exit(1);
  });

// ─── Default Categories ───────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: 'Face Care',      emoji: '✨', description: 'Face wash, packs & toners' },
  { name: 'Lip Care',       emoji: '💋', description: 'Beetroot lip balm' },
  { name: 'Hair Care',      emoji: '💆', description: 'Oils, shampoos & powders' },
  { name: 'Natural Oils',   emoji: '🫙', description: 'Carrot, neem, aloe & more' },
  { name: 'Soaps',          emoji: '🧼', description: 'Handcrafted luxury soaps' },
  { name: 'Henna & Mehndi', emoji: '🌿', description: 'Henna, indigo & nail cones' },
  { name: 'Herbal Powders', emoji: '🪴', description: 'Multani mitti & more' },
  { name: 'Eye Care',       emoji: '👁',  description: 'Herbal kajal' },
  { name: 'Fragrances',     emoji: '🌸', description: 'Rose, jasmine & more' },
  { name: 'Soap Making',    emoji: '🎨', description: 'Molds & soap perfumes' },
  { name: 'Ornaments',      emoji: '💎', description: 'Handcrafted jewelry & accessories' },
];

// ─── Mongoose Schemas & Models ────────────────────────────────────────────────

const ProductSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  category:      { type: String, required: true },
  price:         { type: Number, required: true },
  originalPrice: { type: Number, default: null },
  description:   { type: String, default: '' },
  ingredients:   { type: String, default: '' },
  howToUse:      { type: String, default: '' },
  benefits:      [String],
  weight:        { type: String, default: '' },
  image:         { type: String, default: '/images/placeholder.jpg' },
  inStock:       { type: Boolean, default: true },
  featured:      { type: Boolean, default: false },
  badge:         { type: String, default: '' },
  rating:        { type: Number, default: 4.5 },
  reviewCount:   { type: Number, default: 0 },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, default: '' },
  password:  { type: String, required: true },
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  orderId:       { type: String, unique: true },
  customerId:    { type: String, default: 'guest' },
  customerName:  String,
  customerPhone: String,
  customerEmail: String,
  address:       String,
  pincode:       String,
  items:         [{
    productId: String, name: String, price: Number,
    image: String, quantity: Number, weight: String
  }],
  subtotal:      { type: Number, default: 0 },
  shippingCharge:{ type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  status:        { type: String, default: 'Pending' },
  paymentMethod: { type: String, default: 'COD' },
  orderSource:   { type: String, default: 'website' }, // 'website' or 'whatsapp'
  notes:         { type: String, default: '' },
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  key:               { type: String, default: 'main', unique: true },
  siteName:          { type: String, default: "Shazz Natural's" },
  tagline:           { type: String, default: 'Pure Nature. Pure Kerala. Pure You.' },
  logo:              { type: String, default: '/images/logo.svg' },
  heroImage:         { type: String, default: '' },
  aboutImage:        { type: String, default: '' },
  phone:             { type: String, default: '+91 79023 02884' },
  whatsapp:          { type: String, default: '917902302884' },
  callmebotApiKey:   { type: String, default: '' },
  email:             { type: String, default: 'shazznaturals@gmail.com' },
  address:           { type: String, default: 'Kerala, India' },
  aboutUs:           { type: String, default: "Shazz Natural's is a Kerala-based brand crafting 100% natural, handmade beauty products." },
  instagram:         { type: String, default: '' },
  facebook:          { type: String, default: '' },
  youtube:           { type: String, default: '' },
  freeShippingAbove: { type: Number, default: 500 },
  shippingCharge:    { type: Number, default: 60 },
  categoryImages:    { type: mongoose.Schema.Types.Mixed, default: {} },
  heroSlides:        { type: mongoose.Schema.Types.Mixed, default: [{image:'',title:'',subtitle:''},{image:'',title:'',subtitle:''},{image:'',title:'',subtitle:''},{image:'',title:'',subtitle:''},{image:'',title:'',subtitle:''},{image:'',title:'',subtitle:''},{image:'',title:'',subtitle:''}] },
  categories:        { type: mongoose.Schema.Types.Mixed, default: DEFAULT_CATEGORIES },
}, { timestamps: true });

const Product  = mongoose.model('Product',  ProductSchema);
const User     = mongoose.model('User',     UserSchema);
const Order    = mongoose.model('Order',    OrderSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'shazz-naturals-kerala-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ─── Image Storage (Cloudinary in production, local in dev) ──────────────────
let storageEngine, getImageUrl;

if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  // If CLOUDINARY_URL is set, the SDK reads it automatically
  storageEngine = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'shazz-naturals', allowed_formats: ['jpg','jpeg','png','gif','webp'] },
  });
  getImageUrl = (file) => file.path;
} else {
  const uploadDir = path.join(__dirname, 'uploads', 'images');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  storageEngine = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
  });
  getImageUrl = (file) => '/uploads/images/' + file.filename;
}

const upload = multer({
  storage: storageEngine,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpe?g|png|gif|webp)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const requireAdmin    = (req, res, next) => req.session.user?.role === 'admin'    ? next() : res.status(401).json({ error: 'Admin access required' });
const requireAuth     = (req, res, next) => req.session.user                      ? next() : res.status(401).json({ error: 'Login required' });

// ─────────────────── AUTH ────────────────────────────────────────────────────

app.post('/api/auth/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'Shaas125' && password === 'Shaasadmin') {
    req.session.user = { id: 'admin', role: 'admin', name: 'Admin', username };
    return res.json({ success: true, user: req.session.user });
  }
  res.status(401).json({ error: 'Invalid admin credentials' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.user = { id: user._id.toString(), role: 'customer', name: user.name, email: user.email };
      return res.json({ success: true, user: req.session.user });
    }
    res.status(401).json({ error: 'Invalid email or password' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), phone: phone || '', password: bcrypt.hashSync(password, 10) });
    req.session.user = { id: user._id.toString(), role: 'customer', name: user.name, email: user.email };
    res.json({ success: true, user: req.session.user });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ success: true })));
app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }));

// ─────────────────── PRODUCTS ────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    if (req.query.featured === 'true') filter.featured = true;
    let products = await Product.find(filter).lean();
    if (req.query.search) {
      const s = req.query.search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
    }
    res.json({ products: products.map(p => ({ ...p, id: p._id.toString() })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: { ...p, id: p._id.toString() } });
  } catch(e) { res.status(404).json({ error: 'Product not found' }); }
});

app.post('/api/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.create({
      name:          req.body.name,
      category:      req.body.category,
      price:         parseFloat(req.body.price) || 0,
      originalPrice: parseFloat(req.body.originalPrice) || null,
      description:   req.body.description || '',
      ingredients:   req.body.ingredients || '',
      howToUse:      req.body.howToUse || '',
      benefits:      (req.body.benefits || '').split('\n').map(b => b.trim()).filter(Boolean),
      weight:        req.body.weight || '',
      image:         req.file ? getImageUrl(req.file) : '/images/placeholder.jpg',
      inStock:       req.body.inStock !== 'false',
      featured:      req.body.featured === 'true',
      badge:         req.body.badge || '',
    });
    res.json({ success: true, product: { ...product.toObject(), id: product._id.toString() } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const upd = { ...req.body };
    if (upd.price)         upd.price         = parseFloat(upd.price);
    if (upd.originalPrice) upd.originalPrice = parseFloat(upd.originalPrice);
    if (typeof upd.benefits === 'string') upd.benefits = upd.benefits.split('\n').map(b => b.trim()).filter(Boolean);
    if (typeof upd.inStock  === 'string') upd.inStock  = upd.inStock !== 'false';
    if (typeof upd.featured === 'string') upd.featured = upd.featured === 'true';
    const product = await Product.findByIdAndUpdate(req.params.id, upd, { new: true }).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product: { ...product, id: product._id.toString() } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products/:id/image', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const product = await Product.findByIdAndUpdate(req.params.id, { image: getImageUrl(req.file) }, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, image: product.image });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────── SETTINGS ────────────────────────────────────────────────

app.get('/api/settings', async (req, res) => {
  try {
    let s = await Settings.findOne({ key: 'main' }).lean();
    if (!s) s = await Settings.create({ key: 'main' });
    if (!s.heroSlides || !Array.isArray(s.heroSlides)) s.heroSlides = [];
    while (s.heroSlides.length < 7) s.heroSlides.push({image:'',title:'',subtitle:'',label:''});
    if (!s.categoryImages || typeof s.categoryImages !== 'object') s.categoryImages = {};
    res.json(s);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', requireAdmin, async (req, res) => {
  try {
    const s = await Settings.findOneAndUpdate({ key: 'main' }, { ...req.body, key: 'main' }, { new: true, upsert: true }).lean();
    res.json({ success: true, settings: s });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/logo', requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const s = await Settings.findOneAndUpdate({ key: 'main' }, { logo: getImageUrl(req.file) }, { new: true, upsert: true });
    res.json({ success: true, logo: s.logo });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/category-image/:key', requireAdmin, upload.single('categoryImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const key = req.params.key;
    const url = getImageUrl(req.file);
    const s = await Settings.findOne({ key: 'main' });
    const categoryImages = s ? (s.categoryImages || {}) : {};
    categoryImages[key] = url;
    await Settings.findOneAndUpdate({ key: 'main' }, { $set: { categoryImages } }, { new: true, upsert: true });
    res.json({ success: true, key, url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/hero-image', requireAdmin, upload.single('heroImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const s = await Settings.findOneAndUpdate({ key: 'main' }, { heroImage: getImageUrl(req.file) }, { new: true, upsert: true });
    res.json({ success: true, heroImage: s.heroImage });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/about-image', requireAdmin, upload.single('aboutImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const s = await Settings.findOneAndUpdate({ key: 'main' }, { aboutImage: getImageUrl(req.file) }, { new: true, upsert: true });
    res.json({ success: true, aboutImage: s.aboutImage });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/slide-image/:index', requireAdmin, upload.single('slideImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const idx = parseInt(req.params.index);
    if (isNaN(idx) || idx < 0 || idx > 6) return res.status(400).json({ error: 'Invalid slide index' });
    const url = getImageUrl(req.file);
    const s = await Settings.findOne({ key: 'main' });
    const raw = s && s.heroSlides && Array.isArray(s.heroSlides) ? JSON.parse(JSON.stringify(s.heroSlides)) : [];
    while (raw.length < 7) raw.push({image:'',title:'',subtitle:'',label:''});
    raw[idx] = { ...raw[idx], image: url };
    await Settings.findOneAndUpdate({ key: 'main' }, { $set: { heroSlides: raw } }, { new: true, upsert: true });
    res.json({ success: true, index: idx, url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/slide-text/:index', requireAdmin, async (req, res) => {
  try {
    const idx = parseInt(req.params.index);
    if (isNaN(idx) || idx < 0 || idx > 6) return res.status(400).json({ error: 'Invalid slide index' });
    const { title, subtitle, label } = req.body;
    const s = await Settings.findOne({ key: 'main' });
    const raw = s && s.heroSlides && Array.isArray(s.heroSlides) ? JSON.parse(JSON.stringify(s.heroSlides)) : [];
    while (raw.length < 7) raw.push({image:'',title:'',subtitle:'',label:''});
    raw[idx] = { ...raw[idx], title: title || '', subtitle: subtitle || '', label: label || '' };
    await Settings.findOneAndUpdate({ key: 'main' }, { $set: { heroSlides: raw } }, { new: true, upsert: true });
    res.json({ success: true, title, subtitle, label });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────── CATEGORIES ──────────────────────────────────────────────

app.get('/api/categories', async (req, res) => {
  try {
    let s = await Settings.findOne({ key: 'main' }).lean();
    if (!s) s = await Settings.create({ key: 'main' });
    const categories = (s.categories && s.categories.length) ? s.categories : DEFAULT_CATEGORIES;
    res.json({ categories });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  try {
    const { name, emoji, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const s = await Settings.findOne({ key: 'main' }).lean();
    const categories = (s && s.categories && s.categories.length) ? [...s.categories] : [...DEFAULT_CATEGORIES];
    if (categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase()))
      return res.status(400).json({ error: 'Category already exists' });
    categories.push({ name: name.trim(), emoji: emoji || '🌿', description: description || '' });
    await Settings.findOneAndUpdate({ key: 'main' }, { $set: { categories } }, { new: true, upsert: true });
    res.json({ success: true, categories });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/categories/:name', requireAdmin, async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.name);
    const { name, emoji, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const s = await Settings.findOne({ key: 'main' }).lean();
    let categories = (s && s.categories && s.categories.length) ? [...s.categories] : [...DEFAULT_CATEGORIES];
    const idx = categories.findIndex(c => c.name === oldName);
    if (idx === -1) return res.status(404).json({ error: 'Category not found' });
    categories[idx] = { ...categories[idx], name: name.trim(), emoji: emoji || categories[idx].emoji, description: description ?? categories[idx].description };
    await Settings.findOneAndUpdate({ key: 'main' }, { $set: { categories } }, { new: true, upsert: true });
    res.json({ success: true, categories });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/categories/:name', requireAdmin, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const s = await Settings.findOne({ key: 'main' }).lean();
    let categories = (s && s.categories && s.categories.length) ? [...s.categories] : [...DEFAULT_CATEGORIES];
    categories = categories.filter(c => c.name !== name);
    await Settings.findOneAndUpdate({ key: 'main' }, { $set: { categories } }, { new: true, upsert: true });
    res.json({ success: true, categories });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────── CART (Session) ──────────────────────────────────────────

app.get('/api/cart', (req, res) => res.json({ cart: req.session.cart || [] }));

app.post('/api/cart', async (req, res) => {
  try {
    if (!req.session.cart) req.session.cart = [];
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const existing = req.session.cart.find(i => i.productId === productId);
    if (existing) existing.quantity += parseInt(quantity);
    else req.session.cart.push({ productId, name: product.name, price: product.price, image: product.image, quantity: parseInt(quantity), weight: product.weight });
    res.json({ success: true, cart: req.session.cart });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/cart/:productId', (req, res) => {
  if (!req.session.cart) req.session.cart = [];
  const qty = parseInt(req.body.quantity);
  if (qty <= 0) req.session.cart = req.session.cart.filter(i => i.productId !== req.params.productId);
  else { const item = req.session.cart.find(i => i.productId === req.params.productId); if (item) item.quantity = qty; }
  res.json({ success: true, cart: req.session.cart });
});

app.delete('/api/cart/:productId', (req, res) => {
  req.session.cart = (req.session.cart || []).filter(i => i.productId !== req.params.productId);
  res.json({ success: true, cart: req.session.cart });
});

app.delete('/api/cart', (req, res) => { req.session.cart = []; res.json({ success: true }); });

// ─────────────────── ORDERS ──────────────────────────────────────────────────

async function notifyAdminWhatsApp(message) {
  try {
    const s = await Settings.findOne({ key: 'main' }).lean();
    if (!s || !s.callmebotApiKey || !s.whatsapp) return;
    const phone = s.whatsapp.replace(/[^0-9]/g, '');
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${s.callmebotApiKey}`;
    await fetch(url);
  } catch(e) { console.warn('WhatsApp notify failed:', e.message); }
}

app.post('/api/orders/whatsapp', async (req, res) => {
  try {
    const { customerName, customerPhone, address, pincode, items } = req.body;
    if (!customerName || !customerPhone) return res.status(400).json({ error: 'Name and phone required' });
    if (!items || !items.length) return res.status(400).json({ error: 'No items in order' });
    const s = await Settings.findOne({ key: 'main' }).lean();
    const freeShippingAbove = s?.freeShippingAbove ?? 500;
    const shippingRate = s?.shippingCharge ?? 60;
    const subtotal = items.reduce((acc, i) => acc + (Number(i.price) * Number(i.quantity)), 0);
    const shippingCharge = subtotal >= freeShippingAbove ? 0 : shippingRate;
    const total = subtotal + shippingCharge;
    const order = await Order.create({
      orderId:       'ORD-WA-' + Date.now(),
      customerId:    req.session.user?.id || 'guest',
      customerName,
      customerPhone,
      address:       address || '',
      pincode:       pincode || '',
      items:         items.map(i => ({ name: i.name, price: Number(i.price), quantity: Number(i.quantity), weight: i.weight || '', productId: i.productId || '', image: i.image || '' })),
      subtotal,
      shippingCharge,
      total,
      orderSource:   'whatsapp',
      status:        'Pending',
      paymentMethod: 'COD',
    });
    req.session.cart = [];
    res.json({ success: true, orderId: order.orderId });

    const itemsList = order.items.map(i => `- ${i.name} x${i.quantity}`).join('\n');
    const shippingLine = order.shippingCharge === 0 ? 'Shipping: FREE' : `Shipping: ₹${order.shippingCharge}`;
    notifyAdminWhatsApp(
      `🛒 New Order ${order.orderId}\nName: ${order.customerName}\nPhone: ${order.customerPhone}\nPayment: ${order.paymentMethod}\nProducts: ₹${order.subtotal}\n${shippingLine}\nTotal: ₹${order.total}\n${itemsList}`
    );
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const cart = req.session.cart || [];
    if (!cart.length) return res.status(400).json({ error: 'Cart is empty' });
    const s = await Settings.findOne({ key: 'main' }).lean();
    const freeShippingAbove = s?.freeShippingAbove ?? 500;
    const shippingRate = s?.shippingCharge ?? 60;
    const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const shippingCharge = subtotal >= freeShippingAbove ? 0 : shippingRate;
    const total = subtotal + shippingCharge;
    const order = await Order.create({
      orderId:       'ORD-' + Date.now(),
      customerId:    req.session.user?.id || 'guest',
      customerName:  req.body.name,
      customerPhone: req.body.phone,
      customerEmail: req.body.email,
      address:       req.body.address,
      pincode:       req.body.pincode,
      items:         [...cart],
      subtotal,
      shippingCharge,
      total,
      paymentMethod: req.body.paymentMethod || 'COD',
    });
    req.session.cart = [];
    res.json({ success: true, order: { ...order.toObject(), id: order.orderId } });

    const itemsList = order.items.map(i => `- ${i.name} x${i.quantity}`).join('\n');
    const shippingLine = order.shippingCharge === 0 ? 'Shipping: FREE' : `Shipping: ₹${order.shippingCharge}`;
    notifyAdminWhatsApp(
      `🛒 New Order ${order.orderId}\nName: ${order.customerName}\nPhone: ${order.customerPhone}\nPayment: ${order.paymentMethod}\nProducts: ₹${order.subtotal}\n${shippingLine}\nTotal: ₹${order.total}\n${itemsList}`
    );
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/my', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.session.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ orders: orders.map(o => ({ ...o, id: o.orderId })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json({ orders: orders.map(o => ({ ...o, id: o.orderId })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate({ orderId: req.params.id }, { status: req.body.status }, { new: true }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order: { ...order, id: order.orderId } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, address, pincode, items, paymentMethod, notes } = req.body;
    if (!customerName || !customerPhone) return res.status(400).json({ error: 'Customer name and phone are required' });
    if (!items || !items.length) return res.status(400).json({ error: 'At least one item is required' });
    const total = items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
    const order = await Order.create({
      orderId:       'ORD-WA-' + Date.now(),
      customerId:    'whatsapp',
      customerName,
      customerPhone,
      customerEmail: customerEmail || '',
      address:       address || '',
      pincode:       pincode || '',
      items:         items.map(i => ({ name: i.name, price: Number(i.price), quantity: Number(i.quantity), weight: i.weight || '', productId: '', image: '' })),
      total,
      paymentMethod: paymentMethod || 'COD',
      orderSource:   'whatsapp',
      notes:         notes || '',
    });
    res.json({ success: true, order: { ...order.toObject(), id: order.orderId } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/customers', requireAdmin, async (req, res) => {
  try {
    const customers = await User.find().select('-password').lean();
    res.json({ customers });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [products, customers, orders] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments(),
      Order.find().lean()
    ]);
    const activeOrders = orders.filter(o => o.status !== 'Cancelled');
    const revenue = activeOrders.reduce((s, o) => s + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    res.json({ products, customers, orders: activeOrders.length, pendingOrders, revenue, recentOrders: orders.slice(0, 5).map(o => ({ ...o, id: o.orderId })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/sales-report', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().lean();
    const by = req.query.by || 'product';

    if (by === 'category') {
      const products = await Product.find().lean();
      const catMap = {};
      products.forEach(p => { catMap[p._id.toString()] = p.category; });
      const map = {};
      orders.forEach(order => {
        (order.items || []).forEach(item => {
          const cat = catMap[item.productId] || 'Unknown';
          if (!map[cat]) map[cat] = { category: cat, unitsSold: 0, revenue: 0 };
          map[cat].unitsSold += item.quantity || 1;
          map[cat].revenue  += (item.price || 0) * (item.quantity || 1);
        });
      });
      return res.json({ report: Object.values(map).sort((a, b) => b.revenue - a.revenue) });
    }

    const map = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.productId || item.name;
        if (!map[key]) map[key] = { name: item.name, image: item.image || '', unitsSold: 0, revenue: 0 };
        map[key].unitsSold += item.quantity || 1;
        map[key].revenue  += (item.price || 0) * (item.quantity || 1);
      });
    });
    res.json({ report: Object.values(map).sort((a, b) => b.unitsSold - a.unitsSold) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Catch-all
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) res.sendFile(path.join(__dirname, 'public', 'index.html'));
  else res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log('\n  🌿 Shazz Natural\'s is live!');
  console.log(`  🔗 Website : http://localhost:${PORT}`);
  console.log(`  🔐 Admin   : http://localhost:${PORT}/admin/login.html\n`);
});
