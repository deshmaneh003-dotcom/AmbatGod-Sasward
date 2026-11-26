import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { User, LoginActivity, MenuItem, Order, Setting } from './models.js';
import { menuItemsFromPosters } from './menuData.js';

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;
const cafeTimeZone = 'Asia/Kolkata';
const dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const cafeDateParts = (date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: cafeTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
}).formatToParts(date).filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]));
const cafeDayStart = (date) => {
  const { year, month, day } = cafeDateParts(date);
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
};
const phoneCandidates = (value) => {
  const digits = value.replace(/\D/g, '');
  const candidates = new Set([digits]);
  if (digits.length === 10) candidates.add(`91${digits}`);
  if (digits.length === 12 && digits.startsWith('91')) candidates.add(digits.slice(2));
  if (digits.length === 11 && digits.startsWith('0')) {
    candidates.add(digits.slice(1));
    candidates.add(`91${digits.slice(1)}`);
  }
  return [...candidates];
};
const phoneSearch = (candidates) => ({
  $or: candidates.flatMap((digits) => [
    { phoneNormalized: digits },
    { phone: { $regex: `^\\+?${digits.split('').join('[\\s().-]*')}$` } }
  ])
});
const parseCafeDay = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : cafeDayStart(date);
};
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !jwtSecret) return res.status(401).json({ message: 'Please sign in to continue.' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, phone, username, password, confirmPassword } = req.body;
  if (![name, email, phone, username, password, confirmPassword].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ message: 'Please complete every field.' });
  }
  if (name.trim().length < 2) return res.status(400).json({ message: 'Please enter your full name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (!/^[+()\d\s-]{7,20}$/.test(phone.trim())) return res.status(400).json({ message: 'Enter a valid phone number.' });
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username.trim())) return res.status(400).json({ message: 'Username must be 3–30 characters and use letters, numbers, dots, underscores or hyphens.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });
  if (await User.exists({})) return res.status(403).json({ message: 'Admin registration is closed. Please ask the cafe owner for access.' });
  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
  if (exists) return res.status(409).json({ message: 'That email or username is already registered.' });
  const user = await User.create({
    name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(),
    phoneNormalized: phone.replace(/\D/g, ''),
    username: username.trim().toLowerCase(), password: await bcrypt.hash(password, 12)
  });
  return res.status(201).json({ message: 'Your account is ready. Welcome!', user: { id: user.id, name: user.name, email: user.email, username: user.username, designation: user.designation } });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { identifier, password } = req.body;
  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
    return res.status(400).json({ message: 'Enter your email address or phone number and password.' });
  }
  if (!jwtSecret) return res.status(503).json({ message: 'Server setup is incomplete: set JWT_SECRET in .env and restart the API.' });
  const value = identifier.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  let user;
  if (isEmail) {
    user = await User.findOne({ email: value.toLowerCase() });
  } else {
    const digits = value.replace(/\D/g, '');
    if (!/^[+()\d\s.-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
      return res.status(400).json({ message: 'Enter a valid email address or phone number.' });
    }
    user = await User.findOne(phoneSearch(phoneCandidates(value)));
  }
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Email/phone or password is incorrect.' });
  await LoginActivity.create({ userId: user._id, name: user.name, email: user.email });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, jwtSecret, { expiresIn: '7d' });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, username: user.username, designation: user.designation } });
}));

app.get('/api/auth/login-history', requireAuth, asyncRoute(async (_req, res) => {
  const history = await LoginActivity.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .select('name email createdAt')
    .lean();
  return res.json(history);
}));

app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  return res.json(user);
}));
app.put('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const { name, email, phone, username } = req.body;
  if (![name, email, phone, username].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ message: 'Name, email, phone and username are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (!/^[+()\d\s-]{7,20}$/.test(phone.trim())) return res.status(400).json({ message: 'Enter a valid phone number.' });
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username.trim())) return res.status(400).json({ message: 'Username must be 3–30 characters and use letters, numbers, dots, underscores or hyphens.' });
  const duplicate = await User.findOne({
    _id: { $ne: req.user.id },
    $or: [{ email: email.trim().toLowerCase() }, { username: username.trim().toLowerCase() }]
  });
  if (duplicate) return res.status(409).json({ message: 'That email or username is already in use.' });
  const user = await User.findByIdAndUpdate(req.user.id, {
    name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), phoneNormalized: phone.replace(/\D/g, ''),
    username: username.trim().toLowerCase()
  }, { new: true, runValidators: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  return res.json(user);
}));
app.patch('/api/auth/me/designation', requireAuth, asyncRoute(async (req, res) => {
  const designation = typeof req.body.designation === 'string' ? req.body.designation.trim() : '';
  if (!designation || designation.length > 40) return res.status(400).json({ message: 'Enter a designation with 1 to 40 characters.' });
  const user = await User.findByIdAndUpdate(req.user.id, { designation }, { new: true, runValidators: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  return res.json(user);
}));

app.get('/api/menu', requireAuth, asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.available === 'true') filter.available = true;
  if (req.query.search) filter.name = { $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  return res.json(await MenuItem.find(filter).sort({ _id: 1 }));
}));

app.post('/api/menu', requireAuth, asyncRoute(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const submittedPrice = req.body?.price;
  const price = Number(submittedPrice);
  if (!name || name.length > 80) return res.status(400).json({ message: 'Enter an item name with no more than 80 characters.' });
  if (submittedPrice === '' || submittedPrice === null || submittedPrice === undefined || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ message: 'Enter a valid item price.' });
  }
  const item = await MenuItem.create({ name, price, available: true });
  return res.status(201).json(item);
}));
app.put('/api/menu/:id', requireAuth, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'That menu item ID is invalid.' });
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const submittedPrice = req.body?.price;
  const price = Number(submittedPrice);
  if (!name || name.length > 80) return res.status(400).json({ message: 'Enter an item name with no more than 80 characters.' });
  if (submittedPrice === '' || submittedPrice === null || submittedPrice === undefined || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ message: 'Enter a valid item price.' });
  }
  const item = await MenuItem.findByIdAndUpdate(req.params.id, { name, price }, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: 'Menu item not found.' });
  return res.json(item);
}));
app.delete('/api/menu/:id', requireAuth, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'That menu item ID is invalid.' });
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Menu item not found.' });
  return res.json({ message: `${item.name} deleted from the menu.` });
}));
app.post('/api/menu/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a PNG, JPG, GIF or WEBP image under 5 MB.' });
  return res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) {
      const start = parseCafeDay(req.query.from);
      if (!start) return res.status(400).json({ message: 'Use a valid start date.' });
      filter.createdAt.$gte = start;
    }
    if (req.query.to) {
      const end = parseCafeDay(req.query.to);
      if (!end) return res.status(400).json({ message: 'Use a valid end date.' });
      filter.createdAt.$lte = new Date(end.getTime() + 86400000 - 1);
    }
  }
  return res.json(await Order.find(filter).sort({ createdAt: -1 }).limit(500));
}));
app.post('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const { items, paymentMethod, customerName, customerPhone, orderType } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Add at least one item to the order.' });
  if (!items.every((item) => item && typeof item.menuItem === 'string' && mongoose.isValidObjectId(item.menuItem) && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0)) {
    return res.status(400).json({ message: 'Each order item needs a valid menu item and a positive whole-number quantity.' });
  }
  if (!['Cash', 'UPI', 'Card'].includes(paymentMethod)) return res.status(400).json({ message: 'Choose a valid payment method.' });
  const ids = items.map((item) => item.menuItem);
  const menuItems = await MenuItem.find({ _id: { $in: ids }, available: true });
  if (menuItems.length !== new Set(ids.map(String)).size) return res.status(400).json({ message: 'One or more items are no longer available.' });
  const canonicalItems = items.map((item) => {
    const menuItem = menuItems.find((candidate) => candidate.id === String(item.menuItem));
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw Object.assign(new Error('Item quantities must be positive whole numbers.'), { status: 400 });
    return { menuItem: menuItem.id, name: menuItem.name, quantity, price: menuItem.price };
  });
  const subtotal = canonicalItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await Order.create({
    billNumber: `ABG-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    items: canonicalItems, subtotal, discount: 0, taxRate: 0, tax: 0,
    total: Number(subtotal.toFixed(2)),
    paymentMethod, customerName: customerName?.trim() || 'Walk-in customer',
    customerPhone: customerPhone?.trim() || '', orderType: orderType === 'Takeaway' ? 'Takeaway' : 'Dine-in'
  });
  return res.status(201).json(order);
}));

app.get('/api/settings', requireAuth, asyncRoute(async (_req, res) => {
  return res.json(await Setting.findOneAndUpdate({ key: 'cafe' }, {}, { new: true, upsert: true, setDefaultsOnInsert: true }));
}));
app.put('/api/settings', requireAuth, asyncRoute(async (req, res) => {
  const settings = await Setting.findOneAndUpdate({ key: 'cafe' }, req.body, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  return res.json(settings);
}));

app.get('/api/dashboard', requireAuth, asyncRoute(async (_req, res) => {
  const now = new Date();
  const { year, month } = cafeDateParts(now);
  const today = cafeDayStart(now);
  const startWeek = new Date(today);
  startWeek.setUTCDate(startWeek.getUTCDate() - 6);
  const monthStart = new Date(Date.UTC(Number(year), Number(month) - 6, 1) - (5.5 * 60 * 60 * 1000));
  const [todayOrders, totalOrders, menuCount, customerCount, recentOrders, weekly, monthly, popular, methods] = await Promise.all([
    Order.find({ createdAt: { $gte: today } }),
    Order.countDocuments(),
    MenuItem.countDocuments({ available: true }),
    Order.distinct('customerPhone', { customerPhone: { $ne: '' } }),
    Order.find().sort({ createdAt: -1 }).limit(5),
    Order.aggregate([{ $match: { createdAt: { $gte: startWeek } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: cafeTimeZone } }, sales: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: cafeTimeZone } }, sales: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: new Date(now.getTime() - 30 * 86400000) } } }, { $unwind: '$items' }, { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } }, { $sort: { quantity: -1 } }, { $limit: 5 }]),
    Order.aggregate([{ $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } }])
  ]);
  return res.json({
    todaySales: todayOrders.reduce((sum, order) => sum + order.total, 0),
    todayOrders: todayOrders.length, totalOrders, menuCount, customerCount: customerCount.length,
    recentOrders,
    weekly: Array.from({ length: 7 }, (_v, index) => {
      const date = new Date(startWeek.getTime() + index * 86400000);
      const { year: dayYear, month: dayMonth, day } = cafeDateParts(date);
      const key = `${dayYear}-${dayMonth}-${day}`;
      return { label: new Intl.DateTimeFormat('en-IN', { timeZone: cafeTimeZone, weekday: 'short' }).format(date), sales: weekly.find((entry) => entry._id === key)?.sales || 0 };
    }),
    monthly: Array.from({ length: 6 }, (_v, index) => {
      const date = new Date(Date.UTC(Number(year), Number(month) - 6 + index, 1, 12));
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      return { label: new Intl.DateTimeFormat('en-IN', { timeZone: cafeTimeZone, month: 'short' }).format(date), sales: monthly.find((entry) => entry._id === key)?.sales || 0 };
    }),
    popular, methods
  });
}));

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must be valid JSON.' });
  console.error(err.message || err.name || 'Request failed');
  if (err instanceof multer.MulterError) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : 'The image could not be uploaded.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map((item) => item.message).join(' ') });
  if (err.name === 'CastError') return res.status(400).json({ message: 'That record could not be found.' });
  if (err.code === 11000) return res.status(409).json({ message: 'That record already exists.' });
  const message = err.status ? err.message : process.env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : err.message;
  return res.status(err.status || 500).json({ message: message || 'Unexpected server error. Check the API logs for details.' });
});

if (!jwtSecret) throw new Error('JWT_SECRET must be configured before starting the API.');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aam-bat-god-cafe')
  .then(async () => {
    const menuCollectionExists = await mongoose.connection.db
      .listCollections({ name: MenuItem.collection.name }, { nameOnly: true })
      .hasNext();
    if (!menuCollectionExists) await MenuItem.insertMany(menuItemsFromPosters);
    if (!await Setting.exists({ key: 'cafe' })) await Setting.create({ key: 'cafe' });
    app.listen(port, () => console.log(`Cafe API listening on http://localhost:${port}`));
  })
  .catch((error) => { console.error('Could not connect to MongoDB:', error.message); process.exit(1); });
