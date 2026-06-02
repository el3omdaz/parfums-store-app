-- ===== جداول قاعدة البيانات =====
-- انسخ هذا الكود كله في Supabase SQL Editor وشغله

-- المستخدمين
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- أكواد OTP
CREATE TABLE otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- المنتجات
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('م', 'ن', 'ي')),
  origin TEXT CHECK (origin IN ('fr', 'ar', 'own')),
  family TEXT,
  is_privee BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,3),
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- الطلبات
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  items JSONB NOT NULL,
  subtotal DECIMAL(10,3),
  delivery_fee DECIMAL(10,3),
  total DECIMAL(10,3),
  delivery_area TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','shipped','delivered','cancelled')),
  payment_id TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- الطلبات المخصصة
CREATE TABLE custom_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  brand TEXT NOT NULL,
  perfume_name TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- الإعدادات (السعر الموحد وغيره)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- إدخال الإعدادات الافتراضية
INSERT INTO config (key, value) VALUES
  ('standard_price', '4.000'),
  ('delivery_price', '2.000'),
  ('delivery_price_far', '3.000');

-- ===== Row Level Security =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- المنتجات والإعدادات — يقرأها الكل
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "config_public_read" ON config FOR SELECT USING (TRUE);

-- الباقي — الباك اند بس يتحكم فيه (service key)
