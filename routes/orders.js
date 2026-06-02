const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ===== إنشاء طلب جديد =====
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, delivery_area, notes } = req.body;
    const userId = req.user.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'لا توجد منتجات في الطلب' });
    }

    // حساب السعر
    const STANDARD_PRICE = 4.000;
    const DELIVERY_PRICE = delivery_area === 'far' ? 3.000 : 2.000; // مناطق بعيدة مثل صباح الأحمد

    let total = 0;
    const orderItems = items.map(item => {
      const price = item.is_privee ? item.price : STANDARD_PRICE;
      total += price;
      return { ...item, price };
    });
    total += DELIVERY_PRICE;

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        items: orderItems,
        subtotal: total - DELIVERY_PRICE,
        delivery_fee: DELIVERY_PRICE,
        total,
        delivery_area,
        notes,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, order });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'فشل إنشاء الطلب' });
  }
});

// ===== طلبات المستخدم =====
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'فشل جلب الطلبات' });
  }
});

// ===== طلب مخصص (عطر غير موجود) =====
router.post('/custom-request', authMiddleware, async (req, res) => {
  try {
    const { brand, perfume_name, notes } = req.body;
    const userId = req.user.userId;

    const { data } = await supabase
      .from('custom_requests')
      .insert({
        user_id: userId,
        brand,
        perfume_name,
        notes,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    res.json({ success: true, request: data });
  } catch (error) {
    res.status(500).json({ error: 'فشل إرسال الطلب' });
  }
});

module.exports = router;
