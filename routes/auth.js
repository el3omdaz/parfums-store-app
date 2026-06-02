const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Lazy init — لا يشتغل إلا عند أول طلب
let twilioClient = null;
let supabase = null;

function getTwilio() {
  if (!twilioClient) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

// توليد OTP عشوائي 6 أرقام
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// تنظيف رقم الهاتف — يقبل أرقام كويتية
function formatKuwaitPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('965')) return '+' + cleaned;
  if (cleaned.length === 8) return '+965' + cleaned;
  return null;
}

// ===== إرسال OTP =====
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'رقم الهاتف مطلوب' });

    const formattedPhone = formatKuwaitPhone(phone);
    if (!formattedPhone) return res.status(400).json({ error: 'رقم الهاتف غير صحيح' });

    // تحقق إذا المستخدم محظور
    const { data: user } = await getSupabase()
      .from('users')
      .select('is_blocked')
      .eq('phone', formattedPhone)
      .single();

    if (user?.is_blocked) {
      return res.status(403).json({ error: 'هذا الرقم محظور. تواصل معنا للمساعدة.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await getSupabase().from('otp_codes').upsert({
      phone: formattedPhone,
      code: otp,
      expires_at: expiresAt.toISOString(),
      verified: false
    }, { onConflict: 'phone' });

    await getTwilio().messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      contentSid: process.env.TWILIO_CONTENT_SID,
      contentVariables: JSON.stringify({ "1": otp }),
      to: `whatsapp:${formattedPhone}`
    });

    res.json({ success: true, message: 'تم إرسال الكود عبر واتساب' });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'فشل إرسال الكود، حاول مجدداً' });
  }
});

// ===== التحقق من OTP =====
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'البيانات غير مكتملة' });

    const formattedPhone = formatKuwaitPhone(phone);

    // جيب الـ OTP من قاعدة البيانات
    const { data: otpRecord } = await getSupabase()
      .from('otp_codes')
      .select('*')
      .eq('phone', formattedPhone)
      .single();

    if (!otpRecord) return res.status(400).json({ error: 'الكود غير صحيح' });
    if (otpRecord.verified) return res.status(400).json({ error: 'الكود استُخدم من قبل' });
    if (new Date() > new Date(otpRecord.expires_at)) return res.status(400).json({ error: 'انتهت صلاحية الكود' });
    if (otpRecord.code !== code) return res.status(400).json({ error: 'الكود غير صحيح' });

    await getSupabase().from('otp_codes').update({ verified: true }).eq('phone', formattedPhone);

    const { data: existingUser } = await getSupabase()
      .from('users')
      .select('*')
      .eq('phone', formattedPhone)
      .single();

    let userId;
    if (existingUser) {
      userId = existingUser.id;
      await getSupabase().from('users').update({ last_login: new Date().toISOString() }).eq('id', userId);
    } else {
      const { data: newUser } = await getSupabase()
        .from('users')
        .insert({ phone: formattedPhone, created_at: new Date().toISOString() })
        .select()
        .single();
      userId = newUser.id;
    }

    // أنشئ JWT Token
    const token = jwt.sign(
      { userId, phone: formattedPhone },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, isNewUser: !existingUser });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'حدث خطأ، حاول مجدداً' });
  }
});

module.exports = router;
