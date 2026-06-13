require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const cron = require('node-cron');
const whatsappService = require('./whatsappService');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Connect MongoDB ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ─── Schemas & Models ─────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

const CreditorSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  mobile:      { type: String, default: '' },
  balance:     { type: Number, default: 0 },
  price_group: { type: String, default: 'standard' },
  is_active:   { type: Boolean, default: true },
});
const Creditor = mongoose.model('Creditor', CreditorSchema);

const ItemSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  price:      { type: Number, required: true },
  is_active:  { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});
const Item = mongoose.model('Item', ItemSchema);

const BillItemSchema = new mongoose.Schema({
  item_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  item_name:  String,
  quantity:   Number,
  price:      Number,
  subtotal:   Number,
}, { _id: false });

const BillSchema = new mongoose.Schema({
  creditor_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Creditor', required: true },
  items:           [BillItemSchema],
  total:           { type: Number, required: true },
  type:            { type: String, enum: ['SALE', 'REFUND'], default: 'SALE' },
  refunded:        { type: Boolean, default: false },
  refunded_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  refunded_at:     { type: Date, default: null },
  refunded_amount: { type: Number, default: 0 },
  created_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at:      { type: Date, default: Date.now },
});
const Bill = mongoose.model('Bill', BillSchema);

const LoginLogSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  login_time:  { type: Date, default: Date.now },
  logout_time: { type: Date, default: null },
  ip_address:  { type: String, default: '' },
});
const LoginLog = mongoose.model('LoginLog', LoginLogSchema);

const CreditorAuditSchema = new mongoose.Schema({
  creditor_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Creditor' },
  action:         String,
  old_balance:    Number,
  new_balance:    Number,
  amount_changed: Number,
  notes:          String,
  changed_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changed_at:     { type: Date, default: Date.now },
});
const CreditorAudit = mongoose.model('CreditorAudit', CreditorAuditSchema);

const DuplicateReceiptSchema = new mongoose.Schema({
  bill_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
  printed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  printed_at: { type: Date, default: Date.now },
});
const DuplicateReceipt = mongoose.model('DuplicateReceipt', DuplicateReceiptSchema);

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper: map _id → id
const toId = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  return obj;
};

// Helper: normalise a single bill item (handles old bills with `name`/`qty` fields)
const normalizeItem = (item) => ({
  item_id:   item.item_id,
  item_name: item.item_name || item.name || 'Unknown',
  quantity:  item.quantity  ?? item.qty  ?? 0,
  price:     item.price     ?? 0,
  subtotal:  item.subtotal  ?? ((item.quantity ?? item.qty ?? 0) * (item.price ?? 0)),
});

// Helper: convert a Bill doc to plain JSON with normalised items
const billToJson = (doc) => {
  const obj = toId(doc);
  if (Array.isArray(obj.items)) obj.items = obj.items.map(normalizeItem);
  return obj;
};

// Helper: Generate PDF Buffer for a Bill
const generateBillPdfBuffer = (bill) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fontSize(20).text('Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Bill ID: ${bill._id}`);
      doc.text(`Date: ${new Date(bill.created_at).toLocaleString('en-IN')}`);
      doc.text(`Creditor: ${bill.creditor_id?.name || 'N/A'}`);
      doc.text(`Mobile: ${bill.creditor_id?.mobile || 'N/A'}`);
      doc.moveDown();
      doc.text('Items:', { underline: true });
      bill.items.forEach((item) => {
        const name     = item.item_name || item.name     || 'Unknown';
        const qty      = item.quantity  ?? item.qty      ?? 0;
        const price    = item.price     ?? 0;
        const subtotal = item.subtotal  ?? (qty * price);
        doc.text(`  ${name} x${qty}  @ ₹${price}  = ₹${subtotal}`);
      });
      doc.moveDown();
      doc.fontSize(14).text(`Total: ₹${bill.total}`, { bold: true });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// Helper: Generate PDF Buffer for a Refund
const generateRefundPdfBuffer = (bill) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fontSize(20).text('REFUND RECEIPT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Refund ID : ${bill._id}`);
      doc.text(`Date      : ${new Date(bill.created_at).toLocaleString('en-IN')}`);
      doc.text(`Creditor  : ${bill.creditor_id?.name || 'N/A'}`);
      doc.text(`Mobile    : ${bill.creditor_id?.mobile || 'N/A'}`);
      doc.text(`Processed by: ${bill.created_by?.username || 'N/A'}`);
      doc.moveDown();
      doc.text('Refunded Items:', { underline: true });
      bill.items.forEach((item) => {
        const name     = item.item_name || item.name     || 'Unknown';
        const qty      = item.quantity  ?? item.qty      ?? 0;
        const price    = item.price     ?? 0;
        const subtotal = item.subtotal  ?? (qty * price);
        doc.text(`  ${name}  ${qty} x ₹${price}  =  −₹${subtotal}`);
      });
      doc.moveDown();
      doc.fontSize(14).text(`TOTAL REFUNDED: −₹${bill.total}`, { bold: true });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    await LoginLog.create({ user_id: user._id, ip_address: ip });

    res.json({ token, user: { id: user._id.toString(), username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', authMiddleware, async (req, res) => {
  try {
    await LoginLog.findOneAndUpdate(
      { user_id: req.user.id, logout_time: null },
      { logout_time: new Date() },
      { sort: { login_time: -1 } }
    );
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Creditors ────────────────────────────────────────────────────────────────
app.get('/api/creditors', authMiddleware, async (req, res) => {
  try {
    const creditors = await Creditor.find({ is_active: true }).sort('name');
    res.json(creditors.map(toId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/creditors', authMiddleware, async (req, res) => {
  try {
    const { name, mobile, balance, price_group } = req.body;
    const creditor = await Creditor.create({ name, mobile, balance: balance || 0, price_group: price_group || 'standard' });
    await CreditorAudit.create({
      creditor_id: creditor._id,
      action: 'CREATED',
      old_balance: 0,
      new_balance: creditor.balance,
      amount_changed: creditor.balance,
      notes: 'Creditor created',
      changed_by: req.user.id,
    });
    res.status(201).json(toId(creditor));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/creditors/:id', authMiddleware, async (req, res) => {
  try {
    const { name, mobile, price_group, is_active } = req.body;
    const creditor = await Creditor.findByIdAndUpdate(
      req.params.id,
      { name, mobile, price_group, is_active },
      { new: true }
    );
    if (!creditor) return res.status(404).json({ error: 'Creditor not found' });
    res.json(toId(creditor));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/creditors/:id/update-balance', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { amount_deposited } = req.body;
      const creditor = await Creditor.findById(req.params.id).session(session);
      if (!creditor) throw new Error('Creditor not found');
      const old_balance = creditor.balance;
      const new_balance = old_balance + Number(amount_deposited);
      creditor.balance = new_balance;
      await creditor.save({ session });
      await CreditorAudit.create([{
        creditor_id: creditor._id,
        action: 'DEPOSIT',
        old_balance,
        new_balance,
        amount_changed: Number(amount_deposited),
        notes: `Deposit of ${amount_deposited}`,
        changed_by: req.user.id,
      }], { session });
    });
    const updated = await Creditor.findById(req.params.id);
    res.json(toId(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  } finally {
    session.endSession();
  }
});

app.get('/api/creditors/:id/receipts', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const filter = { creditor_id: req.params.id };
    if (start_date || end_date) {
      filter.created_at = {};
      if (start_date) filter.created_at.$gte = new Date(start_date);
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        filter.created_at.$lte = end;
      }
    }
    const bills = await Bill.find(filter).populate('creditor_id', 'name').sort({ created_at: -1 });
    res.json(bills.map(toId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/creditors/:id/changes', authMiddleware, async (req, res) => {
  try {
    const audits = await CreditorAudit.find({ creditor_id: req.params.id })
      .populate('changed_by', 'username')
      .sort({ changed_at: -1 });
    res.json(audits.map(toId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/creditors/:id/audit', authMiddleware, async (req, res) => {
  try {
    const audits = await CreditorAudit.find({ creditor_id: req.params.id })
      .populate('changed_by', 'username')
      .sort({ changed_at: -1 });
    res.json(audits.map(toId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Items ────────────────────────────────────────────────────────────────────
app.get('/api/items', authMiddleware, async (req, res) => {
  try {
    const items = await Item.find({ is_active: true }).sort('name');
    res.json(items.map(toId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/items', authMiddleware, async (req, res) => {
  try {
    const { name, price } = req.body;
    const item = await Item.create({ name, price });
    res.status(201).json(toId(item));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/items/:id', authMiddleware, async (req, res) => {
  try {
    const { name, price, is_active } = req.body;
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { name, price, is_active, updated_at: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(toId(item));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Bills ────────────────────────────────────────────────────────────────────
app.post('/api/bills', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let billId;
    await session.withTransaction(async () => {
      const { creditor_id, items, total } = req.body;
      const creditor = await Creditor.findById(creditor_id).session(session);
      if (!creditor) throw new Error('Creditor not found');

      const [bill] = await Bill.create([{
        creditor_id,
        items,
        total,
        type: 'SALE',
        created_by: req.user.id,
      }], { session });

      billId = bill._id.toString();

      const old_balance = creditor.balance;
      const new_balance = old_balance - Number(total);
      creditor.balance = new_balance;
      await creditor.save({ session });

      await CreditorAudit.create([{
        creditor_id,
        action: 'SALE',
        old_balance,
        new_balance,
        amount_changed: -Number(total),
        notes: `Bill #${billId}`,
        changed_by: req.user.id,
      }], { session });
    });

    const bill = await Bill.findById(billId).populate('creditor_id', 'name mobile').populate('created_by', 'username');
    
    // Asynchronously send WhatsApp notification
    if (bill && bill.creditor_id && bill.creditor_id.mobile) {
      (async () => {
        try {
          const pdfBuffer = await generateBillPdfBuffer(bill);
          const caption = `Hello *${bill.creditor_id.name}*, here is your receipt for your purchase today at Dairy Display Delight. Total bill amount: *₹${bill.total}*.`;
          await whatsappService.sendPdfReceipt(
            bill.creditor_id.mobile,
            pdfBuffer,
            `receipt-${bill._id}.pdf`,
            caption
          );
        } catch (werr) {
          console.error('⚠️ Auto WhatsApp receipt notification failed:', werr.message);
        }
      })();
    }

    res.status(201).json({ ...billToJson(bill), id: billId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  } finally {
    session.endSession();
  }
});

app.get('/api/bills/today', authMiddleware, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const bills = await Bill.find({ created_at: { $gte: start, $lte: end } })
      .populate('creditor_id', 'name')
      .populate('created_by', 'username')
      .sort({ created_at: -1 });
    res.json(bills.map(billToJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/bills/refunded', authMiddleware, async (req, res) => {
  try {
    const bills = await Bill.find({ refunded: true })
      .populate('creditor_id', 'name')
      .populate('created_by', 'username')
      .populate('refunded_by', 'username')
      .sort({ refunded_at: -1 });
    res.json(bills.map(billToJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/bills', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const filter = { refunded: false };
    if (start_date || end_date) {
      filter.created_at = {};
      if (start_date) filter.created_at.$gte = new Date(start_date);
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        filter.created_at.$lte = end;
      }
    }
    const bills = await Bill.find(filter)
      .populate('creditor_id', 'name')
      .populate('created_by', 'username')
      .sort({ created_at: -1 });
    res.json(bills.map(billToJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/bills/:id/refund', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const bill = await Bill.findById(req.params.id).session(session);
      if (!bill) throw new Error('Bill not found');
      if (bill.refunded) throw new Error('Bill already refunded');

      bill.refunded = true;
      bill.refunded_by = req.user.id;
      bill.refunded_at = new Date();
      bill.refunded_amount = bill.total;
      await bill.save({ session });

      const creditor = await Creditor.findById(bill.creditor_id).session(session);
      const old_balance = creditor.balance;
      const new_balance = old_balance + Number(bill.total);
      creditor.balance = new_balance;
      await creditor.save({ session });

      await CreditorAudit.create([{
        creditor_id: bill.creditor_id,
        action: 'REFUND',
        old_balance,
        new_balance,
        amount_changed: Number(bill.total),
        notes: `Refund for bill #${bill._id}`,
        changed_by: req.user.id,
      }], { session });
    });

    const updated = await Bill.findById(req.params.id)
      .populate('creditor_id', 'name mobile')
      .populate('created_by', 'username')
      .populate('refunded_by', 'username');
    
    // Asynchronously send WhatsApp refund notification
    if (updated && updated.creditor_id && updated.creditor_id.mobile) {
      (async () => {
        try {
          const pdfBuffer = await generateRefundPdfBuffer(updated);
          const caption = `Hello *${updated.creditor_id.name}*, here is your refund receipt from Dairy Display Delight. Total refund amount: *₹${updated.total}*.`;
          await whatsappService.sendPdfReceipt(
            updated.creditor_id.mobile,
            pdfBuffer,
            `refund-${updated._id}.pdf`,
            caption
          );
        } catch (werr) {
          console.error('⚠️ Auto WhatsApp refund notification failed:', werr.message);
        }
      })();
    }

    res.json(billToJson(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  } finally {
    session.endSession();
  }
});

// ─── Refunds ──────────────────────────────────────────────────────────────────
app.post('/api/refunds', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let refundBillId;
    await session.withTransaction(async () => {
      const { creditor_id, items, total } = req.body;
      const creditor = await Creditor.findById(creditor_id).session(session);
      if (!creditor) throw new Error('Creditor not found');

      const [refundBill] = await Bill.create([{
        creditor_id,
        items,
        total,
        type: 'REFUND',
        refunded: true,
        refunded_by: req.user.id,
        refunded_at: new Date(),
        refunded_amount: total,
        created_by: req.user.id,
      }], { session });

      refundBillId = refundBill._id.toString();

      const old_balance = creditor.balance;
      const new_balance = old_balance + Number(total);
      creditor.balance = new_balance;
      await creditor.save({ session });

      await CreditorAudit.create([{
        creditor_id,
        action: 'REFUND',
        old_balance,
        new_balance,
        amount_changed: Number(total),
        notes: `Refund bill #${refundBillId}`,
        changed_by: req.user.id,
      }], { session });
    });

    const refundBill = await Bill.findById(refundBillId)
      .populate('creditor_id', 'name mobile')
      .populate('created_by', 'username');
    
    // Asynchronously send WhatsApp refund notification
    if (refundBill && refundBill.creditor_id && refundBill.creditor_id.mobile) {
      (async () => {
        try {
          const pdfBuffer = await generateRefundPdfBuffer(refundBill);
          const caption = `Hello *${refundBill.creditor_id.name}*, here is your refund receipt from Dairy Display Delight. Total refund amount: *₹${refundBill.total}*.`;
          await whatsappService.sendPdfReceipt(
            refundBill.creditor_id.mobile,
            pdfBuffer,
            `refund-${refundBill._id}.pdf`,
            caption
          );
        } catch (werr) {
          console.error('⚠️ Auto WhatsApp refund notification failed:', werr.message);
        }
      })();
    }

    res.status(201).json(billToJson(refundBill));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  } finally {
    session.endSession();
  }
});

app.get('/api/refunds/today', authMiddleware, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const bills = await Bill.find({ refunded: true, refunded_at: { $gte: start, $lte: end } })
      .populate('creditor_id', 'name')
      .populate('created_by', 'username')
      .sort({ refunded_at: -1 });
    res.json(bills.map(toId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Receipts ─────────────────────────────────────────────────────────────────
app.get('/api/receipts/:billId/preview', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId)
      .populate('creditor_id', 'name mobile balance')
      .populate('created_by', 'username');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(billToJson(bill));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/receipts/:billId/download', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId)
      .populate('creditor_id', 'name mobile balance')
      .populate('created_by', 'username');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const pdfBuffer = await generateBillPdfBuffer(bill);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${bill._id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/receipts/:billId/print', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId)
      .populate('creditor_id', 'name mobile')
      .populate('created_by', 'username');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    await DuplicateReceipt.create({ bill_id: bill._id, printed_by: req.user.id });

    res.json({ message: 'Print job sent', bill: billToJson(bill) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/receipts', authMiddleware, async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const [bills, total] = await Promise.all([
      Bill.find()
        .populate('creditor_id', 'name')
        .populate('created_by', 'username')
        .sort({ created_at: -1 })
        .skip(offset)
        .limit(limit),
      Bill.countDocuments(),
    ]);
    res.json({ bills: bills.map(billToJson), total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Duplicates ───────────────────────────────────────────────────────────────
app.get('/api/duplicates', authMiddleware, async (req, res) => {
  try {
    const dupes = await DuplicateReceipt.find()
      .populate('bill_id')
      .populate('printed_by', 'username')
      .sort({ printed_at: -1 });
    res.json(dupes.map(toId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Login Logs ───────────────────────────────────────────────────────────────
app.get('/api/logs/login', authMiddleware, async (req, res) => {
  try {
    const logs = await LoginLog.find()
      .populate('user_id', 'username')
      .sort({ login_time: -1 })
      .limit(100);
    res.json(logs.map(toId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Refund PDF download ──────────────────────────────────────────────────────
app.get('/api/refunds/:id/download', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('creditor_id', 'name mobile balance')
      .populate('created_by', 'username');
    if (!bill) return res.status(404).json({ error: 'Refund not found' });

    const pdfBuffer = await generateRefundPdfBuffer(bill);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=refund-${bill._id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/refunds/:id/print', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('creditor_id', 'name mobile')
      .populate('created_by', 'username');
    if (!bill) return res.status(404).json({ error: 'Refund not found' });
    await DuplicateReceipt.create({ bill_id: bill._id, printed_by: req.user.id });
    res.json({ message: 'Refund print job sent', bill: billToJson(bill) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────
app.get('/api/reports/credit', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const filter = {};
    if (start_date || end_date) {
      filter.created_at = {};
      if (start_date) filter.created_at.$gte = new Date(start_date);
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        filter.created_at.$lte = end;
      }
    }
    const bills = await Bill.find(filter)
      .populate('creditor_id', 'name mobile balance')
      .populate('created_by', 'username')
      .sort({ created_at: -1 });
    res.json(bills.map(billToJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── WhatsApp Integration API Endpoints ─────────────────────────────────────────
app.get('/api/whatsapp/status', authMiddleware, (req, res) => {
  try {
    res.json(whatsappService.getStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/disconnect', authMiddleware, async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ message: 'Disconnected WhatsApp successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills/:id/send-whatsapp', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('creditor_id', 'name mobile')
      .populate('created_by', 'username');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (!bill.creditor_id || !bill.creditor_id.mobile) {
      return res.status(400).json({ error: 'Creditor has no mobile number registered.' });
    }

    const pdfBuffer = await generateBillPdfBuffer(bill);
    const caption = `Hello *${bill.creditor_id.name}*, here is your receipt for your purchase today at Dairy Display Delight. Total bill amount: *₹${bill.total}*.`;
    
    await whatsappService.sendPdfReceipt(
      bill.creditor_id.mobile,
      pdfBuffer,
      `receipt-${bill._id}.pdf`,
      caption
    );

    res.json({ message: 'Receipt sent successfully via WhatsApp.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/creditors/:id/send-reminder', authMiddleware, async (req, res) => {
  try {
    const creditor = await Creditor.findById(req.params.id);
    if (!creditor) return res.status(404).json({ error: 'Creditor not found' });
    if (!creditor.mobile) {
      return res.status(400).json({ error: 'Creditor has no mobile number registered.' });
    }

    const outstandingAmount = Math.abs(creditor.balance);
    const text = `Hello *${creditor.name}*, this is a reminder of your current outstanding balance at Dairy Display Delight. Outstanding Amount: *₹${outstandingAmount}*. Please clear your dues at your earliest convenience. Thank you!`;
    
    await whatsappService.sendTextMessage(creditor.mobile, text);
    
    // Log manual reminder in audits
    await CreditorAudit.create({
      creditor_id: creditor._id,
      action: 'REMINDER',
      old_balance: creditor.balance,
      new_balance: creditor.balance,
      amount_changed: 0,
      notes: 'Manual WhatsApp reminder sent',
      changed_by: req.user.id,
    });

    res.json({ message: 'Outstanding balance reminder sent successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Weekly Automated Cron Reminders ───────────────────────────────────────────
// Run every Sunday at 6 PM (18:00)
cron.schedule('0 18 * * 0', async () => {
  console.log('⏰ Starting weekly WhatsApp outstanding due reminders cron job...');
  try {
    const creditors = await Creditor.find({ is_active: true, balance: { $lt: 0 } });
    console.log(`Found ${creditors.length} creditors with outstanding balance.`);
    for (const creditor of creditors) {
      if (creditor.mobile) {
        const outstandingAmount = Math.abs(creditor.balance);
        const text = `Hello *${creditor.name}*, this is a weekly reminder of your current outstanding balance at Dairy Display Delight. Outstanding Amount: *₹${outstandingAmount}*. Please clear your dues at your earliest convenience. Thank you!`;
        try {
          await whatsappService.sendTextMessage(creditor.mobile, text);
          await CreditorAudit.create({
            creditor_id: creditor._id,
            action: 'REMINDER',
            old_balance: creditor.balance,
            new_balance: creditor.balance,
            amount_changed: 0,
            notes: 'Weekly automated WhatsApp reminder sent',
          });
        } catch (err) {
          console.error(`⚠️ Failed to send weekly reminder to ${creditor.name} (${creditor.mobile}):`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Weekly reminder cron job failed:', err);
  }
});

// ─── Start Server & Initialize WhatsApp ─────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`POS Server running on port ${PORT}`);
  whatsappService.initializeClient();
});
