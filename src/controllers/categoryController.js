// Import model Category untuk berinteraksi dengan tabel categories di database
const Category = require('../models/Category');

// GET ALL - Mendapatkan semua data kategori
const getAllCategories = async (req, res) => {
  try {
    // Ambil semua data dari tabel categories (SELECT * FROM categories)
    const categories = await Category.findAll();
    // Kirim response berupa array of categories
    res.json(categories);
  } catch (error) {
    // Error handling untuk masalah koneksi database dll
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET BY ID - Mendapatkan satu kategori berdasarkan ID
const getCategoryById = async (req, res) => {
  try {
    // Mencari kategori berdasarkan Primary Key (id) dari parameter URL
    // Contoh: GET /categories/1 → req.params.id = 1
    const category = await Category.findByPk(req.params.id);
    
    // Jika kategori tidak ditemukan, kirim response 404 Not Found
    if (!category) {
      return res.status(404).json({ message: 'Category tidak ditemukan' });
    }
    
    // Kirim data kategori yang ditemukan
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CREATE - Membuat kategori baru
const createCategory = async (req, res) => {
  try {
    // Ambil data dari body request (biasanya dari form atau JSON)
    // Contoh body: { "name": "Makanan", "description": "Produk makanan ringan" }
    const { name, description } = req.body;
    
    // Simpan ke database (INSERT INTO categories ...)
    const category = await Category.create({ name, description });
    
    // Response 201 Created - menunjukkan resource berhasil dibuat
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE - Mengupdate kategori yang sudah ada
const updateCategory = async (req, res) => {
  try {
    // Cari kategori berdasarkan ID dari parameter URL
    const category = await Category.findByPk(req.params.id);
    
    // Jika tidak ditemukan, return 404
    if (!category) {
      return res.status(404).json({ message: 'Category tidak ditemukan' });
    }
    
    // Update data dengan nilai dari req.body
    // Sequelize akan update hanya field yang dikirim
    // Contoh: { "name": "Minuman" } → hanya name yang diupdate
    await category.update(req.body);
    
    // Kirim data kategori yang sudah diupdate
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE - Menghapus kategori
const deleteCategory = async (req, res) => {
  try {
    // Cari kategori berdasarkan ID
    const category = await Category.findByPk(req.params.id);
    
    // Jika tidak ditemukan, return 404
    if (!category) {
      return res.status(404).json({ message: 'Category tidak ditemukan' });
    }
    
    // Hapus dari database (DELETE FROM categories WHERE id = ...)
    await category.destroy();
    
    // Response sukses tanpa data (hanya pesan)
    res.json({ message: 'Category berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};