const Transaction = require('../models/Transaction');  // Model transaksi
const Product = require('../models/Product');          // Model produk
const User = require('../models/User');                // Model user (kasir/pembeli)
const Category = require('../models/Category');        // Model kategori

// ============ HELPER: GENERATE NOMOR INVOICE UNIK ============
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear(); 
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0'); 
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  // Contoh hasil: INV/20260519/0123
  return `INV/${year}${month}${day}/${random}`;
};

// ============ 1. TRANSAKSI LANGSUNG BAYAR (CASH/QRIS/TRANSFER) ============
// Untuk pembayaran instan - status langsung PAID
const createTransaction = async (req, res) => {
  try {
    // Ambil data dari request body
    const { product_id, quantity, payment_method } = req.body;
    
    // Validasi metode pembayaran yang diterima
    const validPaymentMethods = ['CASH', 'QRIS', 'TRANSFER', 'EWALLET'];
    if (payment_method && !validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ 
        message: 'Metode pembayaran tidak valid', 
        valid_methods: validPaymentMethods 
      });
    }
    
    // Cek apakah produk ada
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }
    
    // Cek apakah stok mencukupi
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Stok tidak mencukupi' });
    }
    
    // Hitung total harga
    const total_price = product.price * quantity;
    const invoice_number = generateInvoiceNumber();
    
    // Kurangi stok produk (karena langsung terjual)
    await product.update({ stock: product.stock - quantity });
    
    // Buat transaksi dengan status PAID (langsung lunas)
    const transaction = await Transaction.create({
      invoice_number,
      product_id,
      quantity,
      total_price,
      user_id: req.user.id,        // ID kasir/user yang melakukan transaksi
      payment_status: 'PAID',       // Langsung lunas
      payment_method: payment_method || 'CASH'  // Default CASH
    });
    
    // Response sukses
    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil',
      data: {
        transaction_id: transaction.id,
        invoice_number: transaction.invoice_number,
        product: product.name,
        quantity: quantity,
        total_price: total_price,
        payment_method: transaction.payment_method,
        payment_status: transaction.payment_status
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 2. TRANSAKSI UNTUK XENDIT (PEMBAYARAN ONLINE) ============
// Status awal UNPAID, nanti di-update setelah bayar via Xendit
const createXenditTransaction = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    
    // Cek produk dan stok
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Stok tidak mencukupi' });
    }
    
    // Hitung total
    const total_price = product.price * quantity;
    const invoice_number = generateInvoiceNumber();
    
    // Buat transaksi dengan status UNPAID (belum dibayar)
    // Catatan: Stok BELUM dikurangi, nanti dikurangi setelah pembayaran sukses
    const transaction = await Transaction.create({
      invoice_number,
      product_id,
      quantity,
      total_price,
      user_id: req.user.id,
      payment_status: 'UNPAID'      // Menunggu pembayaran
    });
    
    // Response dengan petunjuk langkah selanjutnya
    res.status(201).json({
      success: true,
      message: 'Transaksi dibuat, silakan lanjutkan ke pembayaran',
      data: {
        transaction_id: transaction.id,
        invoice_number: transaction.invoice_number,
        product: product.name,
        quantity: quantity,
        total_price: total_price,
        payment_status: 'UNPAID'
      },
      next_step: `POST /api/payments/create-invoice dengan body { "transaction_id": ${transaction.id} }`
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 3. GET ALL TRANSACTIONS - Semua transaksi (ADMIN) ============
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      include: [
        { model: Product, attributes: ['name', 'price'] },      // Info produk
        { model: User, attributes: ['name', 'email'] }          // Info kasir/user
      ],
      order: [['transaction_date', 'DESC']]  // Urut dari yang terbaru
    });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 4. GET TRANSACTION BY ID - Detail transaksi ============
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Product, attributes: ['name', 'price', 'image'] },
        { model: User, attributes: ['name', 'email'] }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }
    
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 5. GET MY TRANSACTIONS - Riwayat transaksi user yang login ============
const getUserTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { user_id: req.user.id },  // Filter berdasarkan user yang login
      include: [{ model: Product, attributes: ['name', 'price'] }],
      order: [['transaction_date', 'DESC']]
    });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 6. PRINT INVOICE - Halaman HTML untuk print struk ============
const printInvoice = async (req, res) => {
  try {
    // Cari transaksi dengan relasi
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Product, attributes: ['name', 'price'] },
        { model: User, attributes: ['name'] }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }
    
    // Format tanggal Indonesia
    const date = new Date(transaction.transaction_date);
    const formattedDate = date.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    // Helper format Rupiah
    const formatRupiah = (number) => {
      return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
      }).format(number);
    };
    
    // Kirim HTML invoice yang bisa di-print
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${transaction.invoice_number}</title>
        <style>
          /* Styling untuk tampilan struk */
          body { font-family: 'Courier New', monospace; background: #f5f5f5; display: flex; justify-content: center; padding: 20px; }
          .invoice { max-width: 400px; background: white; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 15px; margin-bottom: 15px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .info { margin-bottom: 20px; font-size: 12px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .items { border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px 0; margin-bottom: 15px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
          .grand-total { font-weight: bold; font-size: 16px; border-top: 1px solid #333; padding-top: 8px; display: flex; justify-content: space-between; }
          .footer { text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #333; padding-top: 15px; margin-top: 15px; }
          button { width: 100%; padding: 10px; margin-top: 20px; background: #333; color: white; border: none; cursor: pointer; }
          @media print { button { display: none; } } /* Sembunyikan tombol saat print */
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1>☕ CAFFEEINE</h1>
            <p>Coffee Shop</p>
          </div>
          
          <div class="info">
            <div class="info-row"><span>Invoice</span><span><strong>${transaction.invoice_number}</strong></span></div>
            <div class="info-row"><span>Tanggal</span><span>${formattedDate}</span></div>
            <div class="info-row"><span>Kasir</span><span>${transaction.User.name}</span></div>
            <div class="info-row"><span>Metode</span><span><strong>${transaction.payment_method || 'XENDIT'}</strong></span></div>
          </div>
          
          <div class="items">
            <div class="item" style="font-weight: bold;"><span>Item</span><span>Total</span></div>
            <div class="item">
              <span>${transaction.Product.name} x${transaction.quantity}</span>
              <span>${formatRupiah(transaction.total_price)}</span>
            </div>
          </div>
          
          <div class="grand-total">
            <span>TOTAL</span>
            <span>${formatRupiah(transaction.total_price)}</span>
          </div>
          
          <div class="footer">
            <p>Terima kasih!</p>
            <p>Payment: ${transaction.payment_status === 'PAID' ? 'LUNAS ✅' : transaction.payment_status}</p>
          </div>
          
          <button onclick="window.print()">🖨️ PRINT</button>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============ 7. INVOICE JSON - Data invoice dalam format JSON ============
const getInvoiceJson = async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Product, attributes: ['name', 'price'] }, 
        { model: User, attributes: ['name'] }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }
    
    // Return data invoice yang terstruktur rapi
    res.json({
      success: true,
      invoice: {
        invoice_number: transaction.invoice_number,
        date: transaction.transaction_date,
        cashier: transaction.User.name,
        items: [{ 
          name: transaction.Product.name, 
          quantity: transaction.quantity, 
          price: transaction.Product.price, 
          subtotal: transaction.total_price 
        }],
        total: transaction.total_price,
        payment_method: transaction.payment_method,
        payment_status: transaction.payment_status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


module.exports = {
  createTransaction,        // Transaksi langsung bayar
  createXenditTransaction,  // Transaksi via Xendit (online)
  getAllTransactions,       // Semua transaksi (admin)
  getTransactionById,       // Detail transaksi
  getUserTransactions,      // Riwayat transaksi user
  printInvoice,             // Halaman HTML invoice
  getInvoiceJson           // Data invoice JSON
};