//library JWT untuk membuat dan memverifikasi token
//untuk berinteraksi dengan tabel users di database
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Fungsi untuk membuat Access Token (berlaku 1 hari)
const generateAccessToken = (user) => {
  return jwt.sign(
    // Payload: data yang disimpan dalam token (jangan simpan data sensitif seperti password)
    { id: user.id, email: user.email, role: user.role },
    // Secret key dari environment variable untuk menandatangani token
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// REGISTRASI - Untuk mendaftarkan user baru
const register = async (req, res) => {
  try {
    // Ambil data dari body request
    const { name, email, password, role } = req.body;
    
    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }
    
    // Buat user baru ke database
    // Password akan di-hash oleh model (biasanya pakai bcrypt)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'cashier'  // Default role 'cashier' jika tidak dikirim
    });
    
    // Generate token untuk user yang baru register
    const token = generateAccessToken(user);
    
    // Response sukses
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token  // Token langsung dikirim agar user bisa langsung login
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// LOGIN - Untuk autentikasi user yang sudah punya akun
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Cari user berdasarkan email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    
    // Validasi password (membandingkan input dengan hash di database)
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    
    // Generate token baru setelah login sukses
    const token = generateAccessToken(user);
    
    res.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token,
      expiresIn: '1 hari'  // Sesuai dengan generateAccessToken (1 hari)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// LOGOUT - Untuk logout user
const logout = async (req, res) => {
  // Catatan: Token JWT tidak bisa di-invalidate di server (stateless)
  // Logout sebenarnya di-handle oleh client dengan menghapus token dari storage
  res.json({ 
    success: true,
    message: 'Logout berhasil - silakan hapus token dari client' 
  });
};

// GET ME - Mendapatkan data user yang sedang login (butuh middleware auth)
const getMe = async (req, res) => {
  try {
    // req.user sudah diisi oleh middleware authentication sebelumnya
    // Data user diambil dari token JWT yang sudah diverifikasi
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export semua fungsi agar bisa digunakan di routes
module.exports = { 
  register, 
  login, 
  logout, 
  getMe 
};