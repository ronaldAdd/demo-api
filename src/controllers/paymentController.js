// library Xendit untuk payment gateway
const { Xendit } = require('xendit-node');
const Transaction = require('../models/Transaction');  // Transaksi penjualan
const Product = require('../models/Product');          // Produk yang dibeli
const User = require('../models/User');                // User pembeli

// Inisialisasi client Xendit dengan secret key dari environment variable
const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY,
});

// Ambil fungsi Invoice dari client Xendit
const { Invoice } = xenditClient;

// Fungsi helper untuk membuat ID eksternal (unique identifier untuk Xendit)
const generateExternalId = () => {
  // Format: INV-[timestamp]-[random 4 digit]
  // Contoh: INV-1703123456789-3847
  return `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

// ============ 1. MEMBUAT INVOICE DI XENDIT ============
const createXenditInvoice = async (req, res) => {
  try {
    // Ambil transaction_id dari body request
    const { transaction_id } = req.body;
    
    // Cari transaksi beserta relasi Product dan User
    const transaction = await Transaction.findByPk(transaction_id, {
      include: [
        { model: Product, attributes: ['name', 'price'] },  // Ambil nama & harga produk
        { model: User, attributes: ['name', 'email'] }      // Ambil nama & email user
      ]
    });
    
    // Validasi: transaksi harus ada
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }
    
    // Validasi: transaksi belum dibayar
    if (transaction.payment_status !== 'UNPAID') {
      return res.status(400).json({ 
        success: false, 
        message: `Transaksi sudah ${transaction.payment_status}` 
      });
    }
    
    // Update status menjadi PENDING (menunggu pembayaran)
    await transaction.update({ payment_status: 'PENDING' });
    
    // Generate ID unik untuk Xendit
    const externalId = generateExternalId();
    
    // Siapkan data invoice untuk dikirim ke Xendit
    const invoiceData = {
      externalId: externalId,                           // ID unik transaksi
      amount: Number(transaction.total_price),         // Total harga (harus number)
      payerEmail: transaction.User.email,              // Email pembayar
      description: `Pembayaran untuk ${transaction.invoice_number}`, // Deskripsi
      invoiceDuration: 86400,                          // 1 hari dalam detik (24 jam)
      currency: 'IDR',                                 // Mata uang Rupiah
      customer: {
        givenNames: transaction.User.name,             // Nama customer
        email: transaction.User.email,
      },
      // Redirect setelah sukses/gagal (untuk frontend)
      successRedirectUrl: `http://localhost:3000/payment-success?transaction_id=${transaction.id}`,
      failureRedirectUrl: `http://localhost:3000/payment-failed?transaction_id=${transaction.id}`,
      // Metode pembayaran yang tersedia
      paymentMethods: ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA', 'OVO', 'DANA', 'QRIS'],
      // Detail item yang dibeli
      items: [{
        name: transaction.Product.name,      // Nama produk
        quantity: transaction.quantity,      // Jumlah
        price: Number(transaction.Product.price), // Harga satuan
        category: 'FOOD_BEVERAGE'           // Kategori produk
      }]
    };
    
    // Panggil API Xendit untuk membuat invoice
    const invoice = new Invoice({ secretKey: process.env.XENDIT_SECRET_KEY });
    const result = await invoice.createInvoice({ data: invoiceData });
    
    // Simpan response dari Xendit ke database
    await transaction.update({
      xendit_invoice_id: result.id,          // ID invoice dari Xendit
      xendit_invoice_url: result.invoice_url, // URL pembayaran (link untuk customer)
      payment_method: 'XENDIT'
    });
    
    // Return URL pembayaran ke frontend
    res.status(201).json({
      success: true,
      message: 'Invoice berhasil dibuat',
      data: {
        transaction_id: transaction.id,
        invoice_number: transaction.invoice_number,
        invoice_url: result.invoice_url,      // ⭐ Ini yang penting untuk redirect user
        expiry_date: result.expiry_date,      // Tanggal kadaluarsa
        amount: transaction.total_price
      }
    });
    
  } catch (error) {
    console.error('Xendit Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal membuat invoice', 
      error: error.message 
    });
  }
};

// ============ 2. SIMULASI PEMBAYARAN (UNTUK DEVELOPMENT) ============
// NOTE: Ini hanya untuk testing di localhost tanpa webhook
const simulatePayment = async (req, res) => {
  try {
    const { transaction_id } = req.body;
    
    const transaction = await Transaction.findByPk(transaction_id);
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }
    
    if (transaction.payment_status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Transaksi sudah dibayar' });
    }
    
    // Update status menjadi PAID (LUNAS)
    await transaction.update({ payment_status: 'PAID' });
    
    // Kurangi stok produk (karena pembayaran sukses)
    const product = await Product.findByPk(transaction.product_id);
    if (product) {
      await product.update({ stock: product.stock - transaction.quantity });
    }
    
    res.json({
      success: true,
      message: 'Pembayaran simulasi berhasil',
      data: {
        transaction_id: transaction.id,
        invoice_number: transaction.invoice_number,
        payment_status: 'PAID'
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ 3. CEK STATUS PEMBAYARAN ============
const checkPaymentStatus = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    
    // Cari transaksi dengan relasi Product dan User
    const transaction = await Transaction.findByPk(transaction_id, {
      include: [
        { model: Product, attributes: ['name'] },
        { model: User, attributes: ['name'] }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }
    
    // Return status terkini
    res.json({
      success: true,
      data: {
        transaction_id: transaction.id,
        invoice_number: transaction.invoice_number,
        product_name: transaction.Product?.name,
        quantity: transaction.quantity,
        total_price: transaction.total_price,
        payment_status: transaction.payment_status,  // UNPAID, PENDING, PAID, EXPIRED, FAILED
        payment_method: transaction.payment_method,
        xendit_invoice_url: transaction.xendit_invoice_url
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ============ 4. AMBIL URL INVOICE ============
const getInvoiceUrl = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    
    const transaction = await Transaction.findByPk(transaction_id);
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }
    
    res.json({
      success: true,
      data: {
        invoice_url: transaction.xendit_invoice_url,  // URL untuk redirect user bayar
        payment_status: transaction.payment_status
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Export semua fungsi
module.exports = {
  createXenditInvoice,
  simulatePayment,
  checkPaymentStatus,
  getInvoiceUrl
};