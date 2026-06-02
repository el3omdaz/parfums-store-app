const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'الجلسة منتهية، سجل دخولك مجدداً' });
  }
}

function adminMiddleware(req, res, next) {
  const token = req.headers['x-admin-token'] || req.cookies?.admin_token;
  if (token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
