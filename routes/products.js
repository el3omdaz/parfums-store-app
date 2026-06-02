const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ===== جلب كل المنتجات =====
router.get('/', async (req, res) => {
  try {
    const { origin, gender, family, is_privee } = req.query;

    let query = supabase.from('products').select('*').eq('is_active', true);

    if (origin) query = query.eq('origin', origin);
    if (gender) query = query.eq('gender', gender);
    if (family) query = query.eq('family', family);
    if (is_privee !== undefined) query = query.eq('is_privee', is_privee === 'true');

    const { data: products, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ products });

  } catch (error) {
    res.status(500).json({ error: 'فشل جلب المنتجات' });
  }
});

// ===== جلب منتج واحد =====
router.get('/:id', async (req, res) => {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'فشل جلب المنتج' });
  }
});

// ===== السعر الموحد =====
router.get('/config/pricing', async (req, res) => {
  try {
    const { data } = await supabase
      .from('config')
      .select('*')
      .in('key', ['standard_price', 'delivery_price', 'delivery_price_far']);

    const config = {};
    data?.forEach(item => { config[item.key] = item.value; });

    res.json({
      standard_price: parseFloat(config.standard_price || '4.000'),
      delivery_price: parseFloat(config.delivery_price || '2.000'),
      delivery_price_far: parseFloat(config.delivery_price_far || '3.000')
    });
  } catch (error) {
    res.json({ standard_price: 4.000, delivery_price: 2.000, delivery_price_far: 3.000 });
  }
});

module.exports = router;
