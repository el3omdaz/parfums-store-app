const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { adminMiddleware } = require('../middleware/auth');

function getDB() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

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

// ===== Admin Dashboard HTML =====
router.get('/', (req, res) => {
  res.send(getDashboardHTML());
});

function getDashboardHTML() {
  const html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Parfums Admin</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{background:#0A0A0A;font-family:sans-serif;color:#E0D8CC;min-height:100vh}'
    + '.sidebar{position:fixed;top:0;right:0;width:200px;height:100vh;background:#111;border-left:1px solid #222;padding:20px 0}'
    + '.logo{padding:0 16px 20px;font-size:16px;color:#C8B89A;border-bottom:1px solid #222;margin-bottom:12px}'
    + '.nav{padding:10px 16px;font-size:12px;color:#666;cursor:pointer}'
    + '.nav:hover,.nav.active{color:#C8B89A;background:#1A1A1A}'
    + '.main{margin-right:200px;padding:20px}'
    + '.card{background:#111;border:1px solid #222;margin-bottom:16px}'
    + '.card-hdr{padding:12px 16px;border-bottom:1px solid #222;font-size:11px;color:#888;display:flex;justify-content:space-between;align-items:center}'
    + 'table{width:100%;border-collapse:collapse}'
    + 'td,th{padding:10px 16px;text-align:right;font-size:12px;border-bottom:1px solid #1A1A1A}'
    + 'th{color:#555;font-weight:400;font-size:10px}'
    + '.btn{background:none;border:1px solid #C85050;color:#C85050;padding:3px 8px;font-size:10px;cursor:pointer}'
    + '.btn.green{border-color:#50C878;color:#50C878}'
    + '.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}'
    + '.stat{background:#111;border:1px solid #222;padding:14px}'
    + '.stat-n{font-size:26px;color:#C8B89A;margin-bottom:4px}'
    + '.stat-l{font-size:10px;color:#555}'
    + '.sec{display:none}.sec.active{display:block}'
    + 'input,select{background:#0A0A0A;border:1px solid #333;color:#fff;padding:6px 10px;font-size:12px;outline:none}'
    + '.save{background:#C8B89A;color:#0A0A0A;border:none;padding:8px 14px;font-size:11px;cursor:pointer;margin-right:8px}'
    + '.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh}'
    + '.login-box{background:#111;border:1px solid #333;padding:36px;width:300px}'
    + '.login-box h1{color:#C8B89A;font-size:18px;margin-bottom:6px;font-weight:300}'
    + '.login-box p{color:#555;font-size:11px;margin-bottom:24px}'
    + '.login-box input{width:100%;margin-bottom:12px}'
    + '.login-box button{width:100%;background:#C8B89A;color:#0A0A0A;border:none;padding:10px;cursor:pointer}'
    + '.err{color:#C85050;font-size:11px;margin-top:8px;display:none}'
    + '</style></head><body>'
    + '<div id="app"></div>'
    + '<script>'
    + 'var TOKEN=localStorage.getItem("admin_token");'
    + 'var STATUS={"pending":"معلق","confirmed":"مؤكد","preparing":"تحضير","shipped":"شحن","delivered":"تم","cancelled":"ملغي"};'
    + 'function render(){document.getElementById("app").innerHTML=TOKEN?dashboard():login();}'
    + 'function login(){'
    + 'return \'<div class="login-wrap"><div class="login-box"><h1>Parfums</h1><p>ADMIN PANEL</p>\''
    + '+\'<input type="password" id="pwd" placeholder="كلمة السر" onkeydown="if(event.key===\'Enter\')doLogin()">\''
    + '+\'<button onclick="doLogin()">دخول</button><p class="err" id="err">كلمة السر خاطئة</p></div></div>\';'
    + '}'
    + 'async function doLogin(){'
    + 'var p=document.getElementById("pwd").value;'
    + 'var r=await fetch("/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:p})});'
    + 'var d=await r.json();'
    + 'if(d.success){TOKEN=d.token;localStorage.setItem("admin_token",TOKEN);render();loadDash();}'
    + 'else{document.getElementById("err").style.display="block";}'
    + '}'
    + 'function dashboard(){'
    + 'return \'<div class="sidebar">\''
    + '+\'<div class="logo">Parfums</div>\''
    + '+\'<div class="nav active" onclick="show(this,\'dash\')">الرئيسية</div>\''
    + '+\'<div class="nav" onclick="show(this,\'orders\')">الطلبات</div>\''
    + '+\'<div class="nav" onclick="show(this,\'custom\')">المخصصة</div>\''
    + '+\'<div class="nav" onclick="show(this,\'users\')">المستخدمين</div>\''
    + '+\'<div class="nav" onclick="show(this,\'products\')">المنتجات</div>\''
    + '+\'<div class="nav" onclick="show(this,\'settings\')">الاعدادات</div>\''
    + '+\'<div class="nav" onclick="logout()" style="color:#555">خروج</div>\''
    + '+\'</div>\''
    + '+\'<div class="main">\''
    + '+\'<div class="sec active" id="sec-dash"><div class="stats"><div class="stat"><div class="stat-n" id="sOrders">-</div><div class="stat-l">الطلبات</div></div><div class="stat"><div class="stat-n" id="sPending">-</div><div class="stat-l">معلقة</div></div><div class="stat"><div class="stat-n" id="sUsers">-</div><div class="stat-l">المستخدمين</div></div><div class="stat"><div class="stat-n" id="sRev">-</div><div class="stat-l">الايراد KD</div></div></div><div class="card"><div class="card-hdr">اخر الطلبات</div><table><thead><tr><th>رقم</th><th>هاتف</th><th>مبلغ</th><th>حالة</th></tr></thead><tbody id="tDash"></tbody></table></div></div>\''
    + '+\'<div class="sec" id="sec-orders"><div class="card"><div class="card-hdr">الطلبات<select onchange="loadOrders(this.value)" style="margin-right:8px"><option value="">الكل</option><option value="pending">معلق</option><option value="confirmed">مؤكد</option><option value="shipped">شحن</option><option value="delivered">تم</option></select></div><table><thead><tr><th>رقم</th><th>هاتف</th><th>مبلغ</th><th>حالة</th></tr></thead><tbody id="tOrders"></tbody></table></div></div>\''
    + '+\'<div class="sec" id="sec-custom"><div class="card"><div class="card-hdr">الطلبات المخصصة</div><table><thead><tr><th>هاتف</th><th>ماركة</th><th>عطر</th><th>حالة</th></tr></thead><tbody id="tCustom"></tbody></table></div></div>\''
    + '+\'<div class="sec" id="sec-users"><div class="card"><div class="card-hdr">المستخدمين</div><table><thead><tr><th>هاتف</th><th>تسجيل</th><th>حالة</th><th>اجراء</th></tr></thead><tbody id="tUsers"></tbody></table></div></div>\''
    + '+\'<div class="sec" id="sec-products"><div class="card"><div class="card-hdr">المنتجات</div><table><thead><tr><th>اسم</th><th>ماركة</th><th>سعر</th><th>اجراء</th></tr></thead><tbody id="tProducts"></tbody></table></div></div>\''
    + '+\'<div class="sec" id="sec-settings"><div class="card"><div class="card-hdr">الاعدادات</div><div style="padding:20px;display:flex;flex-direction:column;gap:16px"><div><div style="font-size:10px;color:#555;margin-bottom:6px">سعر العطر الموحد (KD)</div><input id="standard_price" type="number" step="0.001" value="4.000"><button class="save" onclick="saveCfg(\'standard_price\')">حفظ</button></div><div><div style="font-size:10px;color:#555;margin-bottom:6px">توصيل عادي (KD)</div><input id="delivery_price" type="number" step="0.001" value="2.000"><button class="save" onclick="saveCfg(\'delivery_price\')">حفظ</button></div><div><div style="font-size:10px;color:#555;margin-bottom:6px">توصيل مناطق بعيدة (KD)</div><input id="delivery_price_far" type="number" step="0.001" value="3.000"><button class="save" onclick="saveCfg(\'delivery_price_far\')">حفظ</button></div></div></div></div>\''
    + '+\'</div>\';'
    + '}'
    + 'function show(el,id){'
    + 'document.querySelectorAll(".nav").forEach(function(n){n.classList.remove("active");});'
    + 'el.classList.add("active");'
    + 'document.querySelectorAll(".sec").forEach(function(s){s.classList.remove("active");});'
    + 'document.getElementById("sec-"+id).classList.add("active");'
    + 'if(id==="orders")loadOrders("");'
    + 'else if(id==="users")loadUsers();'
    + 'else if(id==="products")loadProducts();'
    + 'else if(id==="custom")loadCustom();'
    + '}'
    + 'var H={"Content-Type":"application/json","x-admin-token":TOKEN};'
    + 'async function api(url,opts){var r=await fetch(url,Object.assign({headers:H},opts||{}));return r.json();}'
    + 'async function loadDash(){'
    + 'var o=await api("/admin/api/orders");'
    + 'var u=await api("/admin/api/users");'
    + 'var orders=o.orders||[];'
    + 'document.getElementById("sOrders").textContent=orders.length;'
    + 'document.getElementById("sPending").textContent=orders.filter(function(x){return x.status==="pending";}).length;'
    + 'document.getElementById("sUsers").textContent=(u.users||[]).length;'
    + 'var rev=orders.reduce(function(s,x){return s+parseFloat(x.total||0);},0);'
    + 'document.getElementById("sRev").textContent=rev.toFixed(3);'
    + 'document.getElementById("tDash").innerHTML=orders.slice(0,5).map(function(o){'
    + 'return "<tr><td>#"+(o.id||"").slice(0,8)+"</td><td>"+(o.users&&o.users.phone||"-")+"</td><td>"+(o.total||0)+" KD</td><td>"+(STATUS[o.status]||o.status)+"</td></tr>";'
    + '}).join("");'
    + '}'
    + 'async function loadOrders(status){'
    + 'var url="/admin/api/orders"+(status?"?status="+status:"");'
    + 'var d=await api(url);'
    + 'document.getElementById("tOrders").innerHTML=(d.orders||[]).map(function(o){'
    + 'var opts=Object.keys(STATUS).map(function(v){return "<option value=\'"+v+"\'"+(o.status===v?" selected":"")+">"+STATUS[v]+"</option>";}).join("");'
    + 'return "<tr><td>#"+(o.id||"").slice(0,8)+"</td><td>"+(o.users&&o.users.phone||"-")+"</td><td>"+(o.total||0)+" KD</td><td><select onchange=\"updateOrder(\'"+o.id+"\',this.value)\">"+opts+"</select></td></tr>";'
    + '}).join("");'
    + '}'
    + 'async function loadUsers(){'
    + 'var d=await api("/admin/api/users");'
    + 'document.getElementById("tUsers").innerHTML=(d.users||[]).map(function(u){'
    + 'var blocked=u.is_blocked;'
    + 'return "<tr><td>"+u.phone+"</td><td>"+(u.created_at||"").slice(0,10)+"</td><td style=\'color:"+(blocked?"#C85050":"#50C878")+"\'>\"+(blocked?"محظور":"نشط")+"</td><td><button class=\'btn "+(blocked?"green":"")+"' + "'" + ' onclick=\'toggleBlock(\\\""+u.id+"\\\","+(blocked?"false":"true")+")\'>\"+(blocked?"فك":"حظر")+"</button></td></tr>";'
    + '}).join("");'
    + '}'
    + 'async function loadProducts(){'
    + 'var d=await api("/admin/api/products");'
    + 'document.getElementById("tProducts").innerHTML=(d.products||[]).map(function(p){'
    + 'return "<tr><td>"+p.name+"</td><td>"+(p.brand||"-")+"</td><td>"+(p.is_privee?p.price:"4.000")+" KD</td><td><button class=\'btn\' onclick=\'toggleProd(\\\""+p.id+"\\\","+(!p.is_active)+")\'>\"+(p.is_active?"اخفاء":"اظهار")+"</button></td></tr>";'
    + '}).join("");'
    + '}'
    + 'async function loadCustom(){'
    + 'var d=await api("/admin/api/custom-requests");'
    + 'document.getElementById("tCustom").innerHTML=(d.requests||[]).map(function(r){'
    + 'return "<tr><td>"+(r.users&&r.users.phone||"-")+"</td><td>"+r.brand+"</td><td>"+r.perfume_name+"</td><td>"+(STATUS[r.status]||r.status)+"</td></tr>";'
    + '}).join("");'
    + '}'
    + 'async function updateOrder(id,status){await api("/admin/api/orders/"+id+"/status",{method:"PATCH",body:JSON.stringify({status:status})});}'
    + 'async function toggleBlock(id,block){await api("/admin/api/users/"+id+"/block",{method:"PATCH",body:JSON.stringify({is_blocked:block==="true"||block===true})});loadUsers();}'
    + 'async function toggleProd(id,active){await api("/admin/api/products/"+id,{method:"PATCH",body:JSON.stringify({is_active:active==="true"||active===true})});loadProducts();}'
    + 'async function saveCfg(key){var v=document.getElementById(key).value;await api("/admin/api/config/"+key,{method:"PATCH",body:JSON.stringify({value:v})});alert("Saved!");}'
    + 'function logout(){localStorage.removeItem("admin_token");TOKEN=null;render();}'
    + 'render();'
    + 'if(TOKEN){loadDash();}'
    + '</script></body></html>';
  return html;
}

module.exports = router;
