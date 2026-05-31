const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database
const sequelize = require('./src/config/database');

// Models
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Transaction = require('./src/models/Transaction');

// Associations
Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

User.hasMany(Transaction, { foreignKey: 'user_id' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

Product.hasMany(Transaction, { foreignKey: 'product_id' });
Transaction.belongsTo(Product, { foreignKey: 'product_id' });

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/categories', require('./src/routes/categoryRoutes'));
app.use('/api/products', require('./src/routes/productRoutes'));
app.use('/api/transactions', require('./src/routes/transactionRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Caffeeine API Running'
  });
});

app.get('/api/routes', (req, res) => {
  res.json({
    message: 'Caffeeine API'
  });
});

app.get('/payment-success', (req, res) => {
  res.send(
    `<h1>✅ Payment Success!</h1>`
  );
});

app.get('/payment-failed', (req, res) => {
  res.send(
    `<h1>❌ Payment Failed</h1>`
  );
});

// Test database sekali saat cold start
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database Connected');
  })
  .catch((err) => {
    console.error('❌ Database Error:', err.message);
  });

// PENTING UNTUK VERCEL
module.exports = app;