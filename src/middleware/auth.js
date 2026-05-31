const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware autentikasi - memverifikasi token JWT
const authenticateToken = async (req, res, next) => {
  // Ambil token dari header Authorization (format: "Bearer <token>")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Token tidak ada → 401 Unauthorized
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Verifikasi token dengan secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Cari user di database berdasarkan id dari token
    const user = await User.findByPk(decoded.id);
    
    // User tidak ditemukan di database
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Simpan data user ke request agar bisa dipakai di controller
    req.user = user;
    next(); // Lanjut ke handler berikutnya
  } catch (error) {
    // Token invalid atau expired
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authenticateToken;