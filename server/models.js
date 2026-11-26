import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  phoneNormalized: { type: String, index: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  designation: { type: String, default: 'Administrator', trim: true, maxlength: 40 },
  role: { type: String, enum: ['admin'], default: 'admin' }
}, { timestamps: true });

const loginActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true }
}, { timestamps: true });
loginActivitySchema.index({ createdAt: -1 });

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  available: { type: Boolean, default: true }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  customerName: { type: String, default: 'Walk-in customer' },
  customerPhone: { type: String, default: '' },
  orderType: { type: String, enum: ['Dine-in', 'Takeaway'], default: 'Dine-in' },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 5, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card'], required: true }
}, { timestamps: true });

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'cafe' },
  cafeName: { type: String, default: 'Aam Bat God Cafe' },
  address: { type: String, default: 'Saswad, Maharashtra' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  workspaceLocation: { type: String, default: 'Saswad, Maharashtra', trim: true, minlength: 1, maxlength: 80 },
  workspaceName: { type: String, default: 'Admin workspace', trim: true, minlength: 1, maxlength: 40 },
  taxRate: { type: Number, default: 5, min: 0 },
  printPaperSize: { type: String, enum: ['a5', 'a4', 'thermal-80mm'], default: 'a5' },
  printOrientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const LoginActivity = mongoose.model('LoginActivity', loginActivitySchema);
export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export const Order = mongoose.model('Order', orderSchema);
export const Setting = mongoose.model('Setting', settingSchema);
