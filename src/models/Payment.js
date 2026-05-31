const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'transactions',
      key: 'id'
    }
  },
  xendit_invoice_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  external_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PAID', 'EXPIRED', 'FAILED'),
    defaultValue: 'PENDING'
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_channel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  invoice_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expired_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'payments'
});

module.exports = Payment;