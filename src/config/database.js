const { Sequelize } = require('sequelize');

// Railway otomatis kasih DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
  // Mode Railway (pakai DATABASE_URL)
  console.log('🔄 Connecting via DATABASE_URL (Railway mode)');
  
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  // Mode Local (pakai variable manual)
  console.log('🔄 Connecting via local config');
  
  sequelize = new Sequelize(
    process.env.DB_NAME || 'caffeeine_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false
    }
  );
}

// Test koneksi
sequelize.authenticate()
  .then(() => console.log('✅ Database connected successfully!'))
  .catch(err => console.error('❌ Database connection failed:', err.message));

module.exports = sequelize;