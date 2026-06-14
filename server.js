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
  total:         { type: Number, default: 0 },
  status:        { type: String, default: 'Pending' },
  paymentMethod: { type: String, default: 'COD' },
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  key:               { type: String, default: 'main', unique: true },
  siteName:          { type: String, default: "Shazz Natural's" },
  tagline:           { type: String, default: 'Pure Nature. Pure Kerala. Pure You.' },
  logo:              { type: String, default: '/images/logo.svg' },
  heroImage:         { type: String, default: '' },
  phone:             { type: String, default: '+91 79023 02884' },
  whatsapp:          { type: String, default: '917902302884' },
  email:             { type: String, default: 'shazznaturals@gmail.com' },
  address:           { type: String, default: 'Kerala, India' },
  aboutUs:           { type: String, default: "Shazz Natural's is a Kerala-based brand crafting 100% natural, handmade beauty products." },
  instagram:         { type: String, default: '' },
  facebook:          { type: String, default: '' },
  youtube:           { type: String, default: '' },
  freeShippingAbove: { type: Number, default: 500 },
  shippingCharge:    { type: Number, default: 60 },
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

if (process.env.CLOUDINARY_CLOUD_NAME) {
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
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

app.post('/api/settings/hero-image', requireAdmin, upload.single('heroImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const s = await Settings.findOneAndUpdate({ key: 'main' }, { heroImage: getImageUrl(req.file) }, { new: true, upsert: true });
    res.json({ success: true, heroImage: s.heroImage });
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

app.post('/api/orders', async (req, res) => {
  try {
    const cart = req.session.cart || [];
    if (!cart.length) return res.status(400).json({ error: 'Cart is empty' });
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const order = await Order.create({
      orderId:       'ORD-' + Date.now(),
      customerId:    req.session.user?.id || 'guest',
      customerName:  req.body.name,
      customerPhone: req.body.phone,
      customerEmail: req.body.email,
      address:       req.body.address,
      pincode:       req.body.pincode,
      items:         [...cart],
      total,
      paymentMethod: req.body.paymentMethod || 'COD',
    });
    req.session.cart = [];
    res.json({ success: true, order: { ...order.toObject(), id: order.orderId } });
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
    const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    res.json({ products, customers, orders: orders.length, revenue, recentOrders: orders.slice(0, 5).map(o => ({ ...o, id: o.orderId })) });
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
