const express = require('express');     // Framework web server
const cors = require('cors');           // Mengizinkan akses dari domain berbeda (CORS)
const dotenv = require('dotenv');       // Membaca file .env

// Load environment variables (PORT, JWT_SECRET, dll)
dotenv.config();

// Inisialisasi Express app
const app = express();

// ============ MIDDLEWARE GLOBAL ============
app.use(cors());                         // Izinkan semua origin (bisa diatur lebih ketat)
app.use(express.json());                // Parse JSON dari request body
app.use(express.urlencoded({ extended: true })); // Parse form data

// ============ KONEKSI DATABASE ============
const sequelize = require('./src/config/database');

// ============ IMPORT MODEL ============
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Transaction = require('./src/models/Transaction');

// ============ RELASI ANTAR TABEL (ASSOCIATIONS) ============
// Category → Product (satu kategori punya banyak produk)
Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

// User → Transaction (satu user punya banyak transaksi)
User.hasMany(Transaction, { foreignKey: 'user_id' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

// Product → Transaction (satu produk bisa dibeli berkali-kali)
Product.hasMany(Transaction, { foreignKey: 'product_id' });
Transaction.belongsTo(Product, { foreignKey: 'product_id' });

// ============ ROUTES (ENDPOINTS) ============
app.use('/api/auth', require('./src/routes/authRoutes'));           // Login, Register
app.use('/api/categories', require('./src/routes/categoryRoutes')); // CRUD Kategori
app.use('/api/products', require('./src/routes/productRoutes'));    // CRUD Produk
app.use('/api/transactions', require('./src/routes/transactionRoutes')); // Transaksi
app.use('/api/payments', require('./src/routes/paymentRoutes'));    // Pembayaran Xendit

// ============ DOKUMENTASI API (Opsional) ============
app.get('/api/routes', (req, res) => {
  res.json({
    message: 'Caffeeine BE API - Simple Version + Xendit',
    base_url: 'http://localhost:3000',
    endpoints: {
      AUTH: { /* daftar endpoint auth */ },
      CATEGORIES: { /* daftar endpoint kategori */ },
      PRODUCTS: { /* daftar endpoint produk */ },
      TRANSACTIONS: { /* daftar endpoint transaksi */ },
      PAYMENTS_XENDIT: { /* daftar endpoint payment */ }
    }
  });
});

// Route utama
app.get('/', (req, res) => {
  res.json({ message: 'Caffeeine BE API Running', docs: 'GET /api/routes' });
});

// ============ HALAMAN REDIRECT XENDIT ============
// Halaman sukses bayar (diakses user setelah bayar)
app.get('/payment-success', (req, res) => {
  res.send(`<h1>✅ Payment Success!</h1><a href="/api/transactions/${req.query.transaction_id}/invoice">Print Invoice</a>`);
});

// Halaman gagal bayar
app.get('/payment-failed', (req, res) => {
  res.send(`<h1>❌ Payment Failed</h1><a href="/">Try Again</a>`);
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;

// Sync database (alter: true = update tabel tanpa hapus data)
sequelize.sync({ alter: true }).then(() => {
  console.log('Database connected & synced');
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📋 API Docs: http://localhost:${PORT}/api/routes`);
  });
}).catch(err => {
  console.error('Database connection failed:', err);
});