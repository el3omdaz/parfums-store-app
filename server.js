const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const productsRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static('public'));
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const otpLimiter = rateLimit({ windowMs: 60 * 1000, max: 3 });
app.use('/api/', limiter);
app.use('/api/auth/send-otp', otpLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => res.json({ status: 'Parfums Store API running ✅' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
