// model Product dan Category untuk mengakses database
const Product = require('../models/Product');
const Category = require('../models/Category'); // Untuk relasi kategori

// ============ 1. GET ALL PRODUCTS - Mendapatkan semua produk ============
const getAllProducts = async (req, res) => {
  try {
    // Ambil semua data produk beserta relasi kategori-nya
    // Hanya ambil attribute 'name' dari tabel Category
    const products = await Product.findAll({
      include: [{ 
        model: Category, 
        attributes: ['name']  // Hanya ambil nama kategori, tidak ambil id/deskripsi
      }]
    });
    // Hasil: setiap produk akan punya field 'Category' dengan isi { name: "Makanan" }
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 2. GET PRODUCT BY ID - Mendapatkan satu produk berdasarkan ID ============
const getProductById = async (req, res) => {
  try {
    // Cari produk berdasarkan Primary Key (id) dari parameter URL
    // Contoh: GET /products/5 → req.params.id = 5
    const product = await Product.findByPk(req.params.id, {
      include: [{ 
        model: Category, 
        attributes: ['name']  // Sertakan juga nama kategori
      }]
    });
    
    // Jika produk tidak ditemukan, kirim response 404 Not Found
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 3. CREATE PRODUCT - Membuat produk baru ============
const createProduct = async (req, res) => {
  try {
    // Ambil data dari body request (JSON atau form-data)
    // Contoh body: 
    // {
    //   "name": "Nasi Goreng",
    //   "price": 25000,
    //   "stock": 50,
    //   "image": "https://.../nasgor.jpg",
    //   "category_id": 1
    // }
    const { name, price, stock, image, category_id } = req.body;
    
    // Simpan ke database (INSERT INTO products ...)
    const product = await Product.create({
      name,
      price,
      stock: stock || 0,        // Jika stock tidak diisi, default 0
      image,                     // URL gambar produk
      category_id                // Foreign key ke tabel categories
    });
    
    // Response 201 Created - produk berhasil dibuat
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 4. UPDATE PRODUCT - Mengupdate produk yang sudah ada ============
const updateProduct = async (req, res) => {
  try {
    // Cari produk berdasarkan ID dari parameter URL
    const product = await Product.findByPk(req.params.id);
    
    // Validasi: pastikan produk ada
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }
    
    // Update data dengan nilai dari req.body
    // Sequelize akan update hanya field yang dikirim
    // Contoh: { "price": 27000, "stock": 45 } → hanya price dan stock yang diupdate
    await product.update(req.body);
    
    // Kirim data produk yang sudah diupdate
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 5. DELETE PRODUCT - Menghapus produk ============
const deleteProduct = async (req, res) => {
  try {
    // Cari produk berdasarkan ID
    const product = await Product.findByPk(req.params.id);
    
    // Validasi: pastikan produk ada
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }
    
    // Hapus dari database (DELETE FROM products WHERE id = ...)
    await product.destroy();
    
    // Response sukses tanpa data
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};