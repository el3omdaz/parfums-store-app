const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { adminMiddleware } = require('../middleware/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ===== لوحة الادمن — HTML =====
router.get('/', (req, res) => {
  const adminPassword = req.cookies?.admin_token || req.headers['x-admin-token'];
  if (adminPassword !== process.env.ADMIN_SECRET) {
    return res.send(loginPage());
  }
  res.send(adminDashboard());
});

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_SECRET) {
    res.json({ success: true, token: process.env.ADMIN_SECRET });
  } else {
    res.status(401).json({ error: 'كلمة السر غير صحيحة' });
  }
});

// ===== الطلبات =====
router.get('/api/orders', adminMiddleware, async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('orders').select(`*, users(phone)`).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data } = await query;
  res.json({ orders: data });
});

router.patch('/api/orders/:id/status', adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });

  const { data } = await supabase.from('orders').update({ status }).eq('id', req.params.id).select().single();
  res.json({ order: data });
});

// ===== المستخدمين =====
router.get('/api/users', adminMiddleware, async (req, res) => {
  const { data } = await supabase.from('users').select('id, phone, is_blocked, created_at, last_login').order('created_at', { ascending: false });
  res.json({ users: data });
});

// ===== بلوك / فك بلوك =====
router.patch('/api/users/:id/block', adminMiddleware, async (req, res) => {
  const { is_blocked } = req.body;
  const { data } = await supabase.from('users').update({ is_blocked }).eq('id', req.params.id).select().single();
  res.json({ success: true, user: data, message: is_blocked ? 'تم حظر المستخدم' : 'تم فك الحظر' });
});

// ===== المنتجات =====
router.get('/api/products', adminMiddleware, async (req, res) => {
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  res.json({ products: data });
});

router.post('/api/products', adminMiddleware, async (req, res) => {
  const { data } = await supabase.from('products').insert(req.body).select().single();
  res.json({ product: data });
});

router.patch('/api/products/:id', adminMiddleware, async (req, res) => {
  const { data } = await supabase.from('products').update(req.body).eq('id', req.params.id).select().single();
  res.json({ product: data });
});

router.delete('/api/products/:id', adminMiddleware, async (req, res) => {
  await supabase.from('products').update({ is_active: false }).eq('id', req.params.id);
  res.json({ success: true });
});

// ===== الإعدادات (السعر الموحد وغيره) =====
router.patch('/api/config/:key', adminMiddleware, async (req, res) => {
  const { value } = req.body;
  await supabase.from('config').upsert({ key: req.params.key, value: String(value) }, { onConflict: 'key' });
  res.json({ success: true });
});

// ===== الطلبات المخصصة =====
router.get('/api/custom-requests', adminMiddleware, async (req, res) => {
  const { data } = await supabase.from('custom_requests').select(`*, users(phone)`).order('created_at', { ascending: false });
  res.json({ requests: data });
});

router.patch('/api/custom-requests/:id/status', adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const { data } = await supabase.from('custom_requests').update({ status }).eq('id', req.params.id).select().single();
  res.json({ request: data });
});

// ===== HTML لوحة التحكم =====
function loginPage() {
  return `<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>لوحة التحكم — Parfums</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0A0A0A;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#1A1A1A;border:0.5px solid #333;padding:40px;width:320px}
h1{font-size:20px;color:#C8B89A;letter-spacing:0.2em;margin-bottom:8px;font-weight:300}
p{font-size:11px;color:#666;letter-spacing:0.15em;margin-bottom:28px}
input{width:100%;background:#0A0A0A;border:0.5px solid #333;color:#fff;padding:12px;font-size:14px;outline:none;margin-bottom:14px}
input:focus{border-color:#C8B89A}
button{width:100%;background:#C8B89A;color:#0A0A0A;border:none;padding:12px;font-size:12px;letter-spacing:0.2em;cursor:pointer}
.err{color:#E57373;font-size:11px;margin-top:8px;display:none}
</style></head>
<body><div class="box">
<h1>Parfums</h1><p>ADMIN PANEL</p>
<input type="password" id="pwd" placeholder="كلمة السر" onkeydown="if(event.key==='Enter')login()">
<button onclick="login()">دخول</button>
<p class="err" id="err">كلمة السر غير صحيحة</p>
</div>
<script>
async function login(){
  const pwd=document.getElementById('pwd').value;
  const r=await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwd})});
  const d=await r.json();
  if(d.success){localStorage.setItem('admin_token',d.token);window.location.reload()}
  else{document.getElementById('err').style.display='block'}
}
</script></body></html>`;
}

function adminDashboard() {
  return `<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>لوحة التحكم — Parfums</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0A0A0A;font-family:'Segoe UI',sans-serif;color:#E0D8CC;min-height:100vh}
.sidebar{position:fixed;top:0;right:0;width:220px;height:100vh;background:#111;border-left:0.5px solid #222;padding:24px 0}
.logo{padding:0 20px 24px;font-size:18px;color:#C8B89A;letter-spacing:0.2em;border-bottom:0.5px solid #222;margin-bottom:16px}
.nav-item{padding:12px 20px;font-size:12px;letter-spacing:0.15em;color:#666;cursor:pointer;transition:all 0.2s;text-transform:uppercase}
.nav-item:hover,.nav-item.active{color:#C8B89A;background:#1A1A1A}
.main{margin-right:220px;padding:24px}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:0.5px solid #222}
.header h1{font-size:16px;color:#C8B89A;letter-spacing:0.2em;font-weight:300}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.stat{background:#111;border:0.5px solid #222;padding:16px}
.stat-num{font-size:28px;color:#C8B89A;font-weight:300;margin-bottom:4px}
.stat-lbl{font-size:10px;color:#555;letter-spacing:0.2em;text-transform:uppercase}
.card{background:#111;border:0.5px solid #222;margin-bottom:16px}
.card-hdr{padding:14px 18px;border-bottom:0.5px solid #222;font-size:11px;letter-spacing:0.2em;color:#888;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center}
table{width:100%;border-collapse:collapse}
td,th{padding:12px 18px;text-align:right;font-size:12px;border-bottom:0.5px solid #1A1A1A}
th{color:#555;letter-spacing:0.15em;font-weight:400;text-transform:uppercase;font-size:10px}
td{color:#CCC}
.badge{display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em}
.badge.pending{background:#2A2015;color:#C8A050}
.badge.confirmed{background:#152A1A;color:#50C878}
.badge.shipped{background:#15201A;color:#50A0C8}
.badge.delivered{background:#1A2A15;color:#78C850}
.badge.cancelled{background:#2A1515;color:#C85050}
.block-btn{background:none;border:0.5px solid #C85050;color:#C85050;padding:4px 10px;font-size:10px;cursor:pointer;letter-spacing:0.1em;transition:all 0.2s}
.block-btn:hover{background:#C85050;color:#fff}
.unblock-btn{background:none;border:0.5px solid #50C878;color:#50C878;padding:4px 10px;font-size:10px;cursor:pointer;letter-spacing:0.1em}
.unblock-btn:hover{background:#50C878;color:#000}
.section{display:none}
.section.active{display:block}
.search{background:#0A0A0A;border:0.5px solid #333;color:#fff;padding:8px 12px;font-size:12px;outline:none;width:200px}
.save-btn{background:#C8B89A;color:#0A0A0A;border:none;padding:8px 16px;font-size:11px;letter-spacing:0.15em;cursor:pointer}
.price-input{background:#0A0A0A;border:0.5px solid #333;color:#C8B89A;padding:8px 12px;font-size:16px;outline:none;width:120px;font-family:inherit}
</style></head>
<body>
<div class="sidebar">
  <div class="logo">Parfums</div>
  <div class="nav-item active" onclick="showSection('dashboard')">الرئيسية</div>
  <div class="nav-item" onclick="showSection('orders')">الطلبات</div>
  <div class="nav-item" onclick="showSection('custom')">الطلبات المخصصة</div>
  <div class="nav-item" onclick="showSection('users')">المستخدمين</div>
  <div class="nav-item" onclick="showSection('products')">المنتجات</div>
  <div class="nav-item" onclick="showSection('settings')">الإعدادات</div>
  <div class="nav-item" style="margin-top:auto;color:#555" onclick="logout()">خروج</div>
</div>

<div class="main">
  <div class="header">
    <h1 id="pageTitle">لوحة التحكم</h1>
    <span style="font-size:11px;color:#555;letter-spacing:0.1em" id="lastUpdated"></span>
  </div>

  <!-- Dashboard -->
  <div class="section active" id="sec-dashboard">
    <div class="stats">
      <div class="stat"><div class="stat-num" id="stat-orders">—</div><div class="stat-lbl">إجمالي الطلبات</div></div>
      <div class="stat"><div class="stat-num" id="stat-pending">—</div><div class="stat-lbl">طلبات معلقة</div></div>
      <div class="stat"><div class="stat-num" id="stat-users">—</div><div class="stat-lbl">المستخدمين</div></div>
      <div class="stat"><div class="stat-num" id="stat-revenue">—</div><div class="stat-lbl">الإيرادات (د.ك)</div></div>
    </div>
    <div class="card">
      <div class="card-hdr">آخر الطلبات</div>
      <table><thead><tr><th>الرقم</th><th>الهاتف</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead>
      <tbody id="recent-orders"></tbody></table>
    </div>
  </div>

  <!-- Orders -->
  <div class="section" id="sec-orders">
    <div class="card">
      <div class="card-hdr">
        جميع الطلبات
        <select onchange="filterOrders(this.value)" style="background:#0A0A0A;border:0.5px solid #333;color:#888;padding:6px 10px;font-size:11px;outline:none">
          <option value="">الكل</option>
          <option value="pending">معلقة</option>
          <option value="confirmed">مؤكدة</option>
          <option value="preparing">قيد التحضير</option>
          <option value="shipped">تم الشحن</option>
          <option value="delivered">تم التوصيل</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </div>
      <table><thead><tr><th>الرقم</th><th>الهاتف</th><th>المنتجات</th><th>المبلغ</th><th>الحالة</th><th>الإجراء</th></tr></thead>
      <tbody id="orders-table"></tbody></table>
    </div>
  </div>

  <!-- Custom Requests -->
  <div class="section" id="sec-custom">
    <div class="card">
      <div class="card-hdr">الطلبات المخصصة</div>
      <table><thead><tr><th>الهاتف</th><th>الماركة</th><th>العطر</th><th>ملاحظات</th><th>الحالة</th><th>الإجراء</th></tr></thead>
      <tbody id="custom-table"></tbody></table>
    </div>
  </div>

  <!-- Users -->
  <div class="section" id="sec-users">
    <div class="card">
      <div class="card-hdr">المستخدمين</div>
      <table><thead><tr><th>الهاتف</th><th>تاريخ التسجيل</th><th>آخر دخول</th><th>الحالة</th><th>الإجراء</th></tr></thead>
      <tbody id="users-table"></tbody></table>
    </div>
  </div>

  <!-- Products -->
  <div class="section" id="sec-products">
    <div class="card">
      <div class="card-hdr">
        المنتجات
        <button class="save-btn" onclick="showAddProduct()">+ إضافة منتج</button>
      </div>
      <table><thead><tr><th>الاسم</th><th>الماركة</th><th>النوع</th><th>السعر</th><th>الحالة</th><th>الإجراء</th></tr></thead>
      <tbody id="products-table"></tbody></table>
    </div>
  </div>

  <!-- Settings -->
  <div class="section" id="sec-settings">
    <div class="card">
      <div class="card-hdr">الإعدادات</div>
      <div style="padding:24px;display:flex;flex-direction:column;gap:20px">
        <div>
          <div style="font-size:10px;color:#555;letter-spacing:0.2em;margin-bottom:8px">السعر الموحد (د.ك)</div>
          <input class="price-input" id="standard_price" type="number" step="0.001" value="4.000">
          <button class="save-btn" style="margin-right:10px" onclick="saveConfig('standard_price')">حفظ</button>
        </div>
        <div>
          <div style="font-size:10px;color:#555;letter-spacing:0.2em;margin-bottom:8px">سعر التوصيل العادي (د.ك)</div>
          <input class="price-input" id="delivery_price" type="number" step="0.001" value="2.000">
          <button class="save-btn" style="margin-right:10px" onclick="saveConfig('delivery_price')">حفظ</button>
        </div>
        <div>
          <div style="font-size:10px;color:#555;letter-spacing:0.2em;margin-bottom:8px">سعر التوصيل المناطق البعيدة (د.ك)</div>
          <input class="price-input" id="delivery_price_far" type="number" step="0.001" value="3.000">
          <button class="save-btn" style="margin-right:10px" onclick="saveConfig('delivery_price_far')">حفظ</button>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
const TOKEN = localStorage.getItem('admin_token');
const H = { 'Content-Type':'application/json', 'x-admin-token': TOKEN };

async function api(url, opts={}) {
  const r = await fetch(url, { headers: H, ...opts });
  return r.json();
}

const statusLabels = { pending:'معلقة', confirmed:'مؤكدة', preparing:'قيد التحضير', shipped:'تم الشحن', delivered:'تم التوصيل', cancelled:'ملغاة' };

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  event.target.classList.add('active');
  const titles = { dashboard:'لوحة التحكم', orders:'الطلبات', custom:'الطلبات المخصصة', users:'المستخدمين', products:'المنتجات', settings:'الإعدادات' };
  document.getElementById('pageTitle').textContent = titles[id];
  if(id==='orders') loadOrders();
  if(id==='users') loadUsers();
  if(id==='products') loadProducts();
  if(id==='custom') loadCustomRequests();
}

async function loadDashboard() {
  const [orders, users] = await Promise.all([api('/admin/api/orders'), api('/admin/api/users')]);
  document.getElementById('stat-orders').textContent = orders.orders?.length || 0;
  document.getElementById('stat-pending').textContent = orders.orders?.filter(o=>o.status==='pending').length || 0;
  document.getElementById('stat-users').textContent = users.users?.length || 0;
  const revenue = orders.orders?.reduce((s,o)=>s+parseFloat(o.total||0), 0) || 0;
  document.getElementById('stat-revenue').textContent = revenue.toFixed(3);
  const recent = (orders.orders||[]).slice(0,5);
  document.getElementById('recent-orders').innerHTML = recent.map(o=>`
    <tr><td>#${o.id?.slice(0,8)}</td><td>${o.users?.phone||'—'}</td><td>${o.total} د.ك</td>
    <td><span class="badge ${o.status}">${statusLabels[o.status]||o.status}</span></td>
    <td>${new Date(o.created_at).toLocaleDateString('ar-KW')}</td></tr>`).join('');
}

async function loadOrders(status='') {
  const url = '/admin/api/orders' + (status?'?status='+status:'');
  const { orders } = await api(url);
  document.getElementById('orders-table').innerHTML = (orders||[]).map(o=>`
    <tr><td>#${o.id?.slice(0,8)}</td><td>${o.users?.phone||'—'}</td>
    <td>${(o.items||[]).length} منتج</td><td>${o.total} د.ك</td>
    <td><span class="badge ${o.status}">${statusLabels[o.status]||o.status}</span></td>
    <td><select onchange="updateOrderStatus('${o.id}',this.value)" style="background:#0A0A0A;border:0.5px solid #333;color:#888;padding:4px 8px;font-size:10px;outline:none">
      ${Object.entries(statusLabels).map(([v,l])=>`<option value="${v}" ${o.status===v?'selected':''}>${l}</option>`).join('')}
    </select></td></tr>`).join('');
}

async function loadUsers() {
  const { users } = await api('/admin/api/users');
  document.getElementById('users-table').innerHTML = (users||[]).map(u=>`
    <tr><td>${u.phone}</td><td>${new Date(u.created_at).toLocaleDateString('ar-KW')}</td>
    <td>${u.last_login?new Date(u.last_login).toLocaleDateString('ar-KW'):'—'}</td>
    <td><span style="color:${u.is_blocked?'#C85050':'#50C878'}">${u.is_blocked?'محظور':'نشط'}</span></td>
    <td><button class="${u.is_blocked?'unblock-btn':'block-btn'}" onclick="toggleBlock('${u.id}',${!u.is_blocked})">
      ${u.is_blocked?'فك الحظر':'حظر'}</button></td></tr>`).join('');
}

async function loadProducts() {
  const { products } = await api('/admin/api/products');
  document.getElementById('products-table').innerHTML = (products||[]).map(p=>`
    <tr><td>${p.name}</td><td>${p.brand||'—'}</td>
    <td>${p.is_privee?'Collection Privée':p.origin==='fr'?'فرنسية':'عربية'}</td>
    <td>${p.is_privee?p.price+' د.ك':'4.000 د.ك'}</td>
    <td><span style="color:${p.is_active?'#50C878':'#C85050'}">${p.is_active?'نشط':'مخفي'}</span></td>
    <td><button class="block-btn" onclick="toggleProduct('${p.id}',${!p.is_active})">${p.is_active?'إخفاء':'إظهار'}</button></td></tr>`).join('');
}

async function loadCustomRequests() {
  const { requests } = await api('/admin/api/custom-requests');
  document.getElementById('custom-table').innerHTML = (requests||[]).map(r=>`
    <tr><td>${r.users?.phone||'—'}</td><td>${r.brand}</td><td>${r.perfume_name}</td>
    <td>${r.notes||'—'}</td><td><span class="badge ${r.status}">${statusLabels[r.status]||r.status}</span></td>
    <td><select onchange="updateCustomStatus('${r.id}',this.value)" style="background:#0A0A0A;border:0.5px solid #333;color:#888;padding:4px 8px;font-size:10px;outline:none">
      <option value="pending" ${r.status==='pending'?'selected':''}>معلق</option>
      <option value="confirmed" ${r.status==='confirmed'?'selected':''}>مؤكد</option>
      <option value="delivered" ${r.status==='delivered'?'selected':''}>تم</option>
    </select></td></tr>`).join('');
}

async function toggleBlock(id, block) {
  await api('/admin/api/users/'+id+'/block', { method:'PATCH', body: JSON.stringify({ is_blocked: block }) });
  loadUsers();
}

async function updateOrderStatus(id, status) {
  await api('/admin/api/orders/'+id+'/status', { method:'PATCH', body: JSON.stringify({ status }) });
}

async function updateCustomStatus(id, status) {
  await api('/admin/api/custom-requests/'+id+'/status', { method:'PATCH', body: JSON.stringify({ status }) });
}

async function toggleProduct(id, active) {
  await api('/admin/api/products/'+id, { method:'PATCH', body: JSON.stringify({ is_active: active }) });
  loadProducts();
}

async function saveConfig(key) {
  const value = document.getElementById(key).value;
  await api('/admin/api/config/'+key, { method:'PATCH', body: JSON.stringify({ value }) });
  alert('تم الحفظ ✅');
}

function filterOrders(status) { loadOrders(status); }
function logout() { localStorage.removeItem('admin_token'); window.location.reload(); }

document.getElementById('lastUpdated').textContent = new Date().toLocaleString('ar-KW');
loadDashboard();
</script>
</body></html>`;
}

module.exports = router;
