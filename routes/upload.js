const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { adminMiddleware } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم'));
  }
});

// ===== رفع صورة منتج =====
router.post('/product-image', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار صورة' });

    // ننشئ الـ client هنا داخل الدالة لضمان استخدام الـ env vars الصحيحة
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const ext = req.file.mimetype.split('/')[1];
    const filename = 'products/' + Date.now() + '.' + ext;

    const { data, error } = await supabase
      .storage
      .from('products')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'فشل رفع الصورة: ' + error.message });
    }

    const { data: urlData } = supabase
      .storage
      .from('products')
      .getPublicUrl(filename);

    res.json({ success: true, url: urlData.publicUrl, path: filename });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'فشل رفع الصورة: ' + err.message });
  }
});

// ===== حذف صورة =====
router.delete('/product-image', adminMiddleware, async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'المسار مطلوب' });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    await supabase.storage.from('products').remove([path]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'فشل حذف الصورة' });
  }
});

module.exports = router;
