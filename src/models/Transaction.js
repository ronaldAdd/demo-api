const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  transaction_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  payment_status: {
    type: DataTypes.ENUM('UNPAID', 'PENDING', 'PAID', 'EXPIRED', 'FAILED'),
    defaultValue: 'UNPAID'
  },
  payment_method: {
    type: DataTypes.ENUM('CASH', 'QRIS', 'TRANSFER', 'EWALLET', 'XENDIT'),
    allowNull: true
  },
  xendit_invoice_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  xendit_invoice_url: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'transactions'
});

module.exports = Transaction;