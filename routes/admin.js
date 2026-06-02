const express = require('express');
const router = express.Router();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { adminMiddleware } = require('../middleware/auth');

function getDB() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ===== Admin Dashboard HTML =====
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// ===== Admin Login =====
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_SECRET) {
    res.json({ success: true, token: process.env.ADMIN_SECRET });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

// ===== Orders =====
router.get('/api/orders', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = getDB().from('orders').select('*, users(phone)').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ orders: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/api/orders/:id/status', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','preparing','shipped','delivered','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { data } = await getDB().from('orders').update({ status }).eq('id', req.params.id).select().single();
    res.json({ order: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Users =====
router.get('/api/users', adminMiddleware, async (req, res) => {
  try {
    const { data } = await getDB().from('users').select('id,phone,is_blocked,created_at,last_login').order('created_at', { ascending: false });
    res.json({ users: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/api/users/:id/block', adminMiddleware, async (req, res) => {
  try {
    const { is_blocked } = req.body;
    const { data } = await getDB().from('users').update({ is_blocked }).eq('id', req.params.id).select().single();
    res.json({ success: true, user: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Products =====
router.get('/api/products', adminMiddleware, async (req, res) => {
  try {
    const { data } = await getDB().from('products').select('*').order('created_at', { ascending: false });
    res.json({ products: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/products', adminMiddleware, async (req, res) => {
  try {
    const { data } = await getDB().from('products').insert(req.body).select().single();
    res.json({ product: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/api/products/:id', adminMiddleware, async (req, res) => {
  try {
    const { data } = await getDB().from('products').update(req.body).eq('id', req.params.id).select().single();
    res.json({ product: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Config =====
router.patch('/api/config/:key', adminMiddleware, async (req, res) => {
  try {
    const { value } = req.body;
    await getDB().from('config').upsert({ key: req.params.key, value: String(value) }, { onConflict: 'key' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Custom Requests =====
router.get('/api/custom-requests', adminMiddleware, async (req, res) => {
  try {
    const { data } = await getDB().from('custom_requests').select('*, users(phone)').order('created_at', { ascending: false });
    res.json({ requests: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/api/custom-requests/:id/status', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const { data } = await getDB().from('custom_requests').update({ status }).eq('id', req.params.id).select().single();
    res.json({ request: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
