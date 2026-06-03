const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { adminMiddleware } = require('../middleware/auth');

// رفع الصورة في الذاكرة مؤقتاً
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم'));
  }
});

function getDB() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ===== رفع صورة منتج =====
router.post('/product-image', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار صورة' });

    const ext = req.file.mimetype.split('/')[1];
    const filename = `products/${Date.now()}.${ext}`;

    const { data, error } = await getDB()
      .storage
      .from('products')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // نبني الرابط العام للصورة
    const { data: urlData } = getDB()
      .storage
      .from('products')
      .getPublicUrl(filename);

    res.json({ success: true, url: urlData.publicUrl, path: filename });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'فشل رفع الصورة: ' + error.message });
  }
});

// ===== حذف صورة =====
router.delete('/product-image', adminMiddleware, async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'المسار مطلوب' });

    await getDB().storage.from('products').remove([path]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'فشل حذف الصورة' });
  }
});

module.exports = router;
