const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { adminMiddleware } = require('../middleware/auth');

function getDB() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ===== جلب كل الماركات =====
router.get('/', async (req, res) => {
  try {
    const { origin } = req.query;
    let query = getDB().from('brands').select('*').order('name');
    if (origin) query = query.eq('origin', origin);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ brands: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== إضافة ماركة جديدة =====
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, origin } = req.body;
    if (!name || !origin) return res.status(400).json({ error: 'الاسم والأصل مطلوبان' });
    const { data, error } = await getDB().from('brands').insert({ name, origin }).select().single();
    if (error) throw error;
    res.json({ brand: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== جلب أسماء العطور حسب الماركة =====
router.get('/:brandId/perfumes', async (req, res) => {
  try {
    const { data, error } = await getDB()
      .from('perfume_names')
      .select('*')
      .eq('brand_id', req.params.brandId)
      .order('name');
    if (error) throw error;
    res.json({ perfumes: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== إضافة اسم عطر جديد =====
router.post('/:brandId/perfumes', adminMiddleware, async (req, res) => {
  try {
    const { name, gender, family } = req.body;
    if (!name) return res.status(400).json({ error: 'الاسم مطلوب' });
    const { data, error } = await getDB()
      .from('perfume_names')
      .insert({ brand_id: req.params.brandId, name, gender, family })
      .select().single();
    if (error) throw error;
    res.json({ perfume: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== حذف اسم عطر =====
router.delete('/perfumes/:id', adminMiddleware, async (req, res) => {
  try {
    await getDB().from('perfume_names').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== تصدير نسخة احتياطية كاملة =====
router.get('/backup/export', adminMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const [products, brands, perfumes, config, orders, custom] = await Promise.all([
      db.from('products').select('*'),
      db.from('brands').select('*'),
      db.from('perfume_names').select('*'),
      db.from('config').select('*'),
      db.from('orders').select('*'),
      db.from('custom_requests').select('*'),
    ]);

    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      products: products.data || [],
      brands: brands.data || [],
      perfume_names: perfumes.data || [],
      config: config.data || [],
      orders: orders.data || [],
      custom_requests: custom.data || [],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="parfums-backup-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(backup);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
