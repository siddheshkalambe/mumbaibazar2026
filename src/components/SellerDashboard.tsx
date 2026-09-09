import React, { useState, useEffect } from 'react';
import { User, Product, Order, Category } from '../types.js';
import { useToast } from '../context/ToastContext.tsx';
import { 
  Plus, Edit, Trash, Copy, EyeOff, Archive, CheckCircle, Clock, AlertTriangle, 
  TrendingUp, BarChart3, Package, ShoppingCart, DollarSign, Users, X, MapPin, Eye, Printer, FileText
} from 'lucide-react';

interface SellerDashboardProps {
  currentUser: User;
}

export default function SellerDashboard({ currentUser }: SellerDashboardProps) {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingMsg, setPrintingMsg] = useState<string | null>(null);

  // Form Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Add/Edit Product Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [stock, setStock] = useState('');
  const [sku, setSku] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [primaryImage, setPrimaryImage] = useState('');
  const [warranty, setWarranty] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [sizes, setSizes] = useState<string[]>(['Standard']);
  const [colors, setColors] = useState<string[]>(['Default']);
  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>([]);
  
  // Multiple images and upload management
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [newImageInput, setNewImageInput] = useState('');
  const [imageUploadType, setImageUploadType] = useState<'url' | 'file'>('file');
  const [mainUploadType, setMainUploadType] = useState<'url' | 'file'>('file');

  // Reject Order Modal State
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Out of stock / Store unable to fulfill');

  const compressImageFile = (file: File, maxWidth = 1000, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve('');
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => resolve((event.target?.result as string) || '');
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve((event.target?.result as string) || '');
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.src = (event.target?.result as string) || '';
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: 'primary' | 'list') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressedBase64 = await compressImageFile(file);
        if (!compressedBase64) continue;

        if (target === 'primary' && i === 0) {
          setPrimaryImage(compressedBase64);
          setImagesList((prev) => {
            const filtered = prev.filter(img => img !== primaryImage);
            return [compressedBase64, ...filtered];
          });
        } else {
          setImagesList((prev) => {
            if (!prev.includes(compressedBase64)) {
              return [...prev, compressedBase64];
            }
            return prev;
          });
          setPrimaryImage((curr) => curr || compressedBase64);
        }
      } catch (err) {
        console.error("Error processing image file:", err);
      }
    }
    // reset input value so re-selecting same file works
    e.target.value = '';
  };
  
  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` };
      
      const statsRes = await fetch('/api/analytics/dashboard', { headers });
      const prodsRes = await fetch('/api/products-all', { headers });
      const ordersRes = await fetch('/api/orders', { headers });
      const catsRes = await fetch('/api/categories');

      if (statsRes.ok && prodsRes.ok && ordersRes.ok && catsRes.ok) {
        const statsData = await statsRes.json();
        const prodsData = await prodsRes.json();
        const ordersData = await ordersRes.json();
        const catsData = await catsRes.json();

        setStats(statsData.stats);
        setSalesHistory(statsData.salesHistory || []);
        setProducts(prodsData);
        setOrders(ordersData);
        setCategories(catsData.filter((c: Category) => c.isActive));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    setCategory(categories[0]?.name || '');
    setBrand('');
    setPrice('');
    setDiscount('0');
    setStock('');
    setSku(`SKU-${Math.floor(Math.random()*1000000)}`);
    setWeight('');
    setDimensions('');
    setPrimaryImage('https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=60');
    setImagesList(['https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=60']);
    setNewImageInput('');
    setImageUploadType('file');
    setMainUploadType('file');
    setWarranty('1 Year brand warranty');
    setReturnPolicy('7 Days replacement');
    setSizes(['Standard']);
    setColors(['Default']);
    setSpecifications([]);
    setFormError('');
    setShowProductModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setTitle(p.title);
    setDescription(p.description || '');
    setCategory(p.category);
    setBrand(p.brand);
    setPrice(String(p.price));
    setDiscount(String(p.discount || 0));
    setStock(String(p.stock));
    setSku(p.sku);
    setWeight(p.weight || '');
    setDimensions(p.dimensions || '');
    setPrimaryImage(p.primaryImage);
    setImagesList(p.images && p.images.length > 0 ? [...p.images] : [p.primaryImage]);
    setNewImageInput('');
    setImageUploadType('file');
    setMainUploadType('file');
    setWarranty(p.warranty || '');
    setReturnPolicy(p.returnPolicy || '');
    setSizes(p.sizes || ['Standard']);
    setColors(p.colors || ['Default']);
    setSpecifications(p.specifications || []);
    setFormError('');
    setShowProductModal(true);
  };

  const handleAddSpec = () => {
    if (specKey && specVal) {
      setSpecifications([...specifications, { key: specKey, value: specVal }]);
      setSpecKey('');
      setSpecVal('');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalCategory = category || (categories[0] ? categories[0].name : '');

    if (!title || !finalCategory || !price || !stock || !primaryImage) {
      setFormError('Please fill in all mandatory fields including category.');
      return;
    }

    const payload = {
      title,
      description,
      category: finalCategory,
      brand: brand || 'Generic',
      price: Number(price),
      discount: Number(discount),
      stock: Number(stock),
      sku,
      weight,
      dimensions,
      primaryImage,
      images: imagesList.length > 0 ? imagesList : [primaryImage],
      warranty,
      returnPolicy,
      sizes,
      colors,
      specifications
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowProductModal(false);
        const msg = editingProduct ? 'Product catalog item updated successfully!' : 'Success! Product created and submitted for Admin approval.';
        setSuccessMsg(msg);
        success(msg, editingProduct ? 'Product Updated' : 'Product Created');
        fetchDashboardData();
        setTimeout(() => setSuccessMsg(''), 8000);
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to save product');
        error(data.error || 'Failed to save product', 'Save Error');
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error saving product catalog.');
      error('Network error saving product catalog.', 'Network Error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    // Optimistic delete
    setProducts(prev => prev.filter(p => p.id !== id));
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` }
      });
      if (res.ok) {
        info('Product removed from catalog.', 'Product Deleted');
      } else {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      fetchDashboardData();
    }
  };

  const handleDuplicateProduct = async (p: Product) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({
          ...p,
          title: `${p.title} (Copy)`,
          sku: `SKU-${Math.floor(Math.random()*1000000)}`
        })
      });
      if (res.ok) {
        success(`Duplicate copy created for "${p.title}"!`, 'Product Duplicated');
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      error('Failed to duplicate product.');
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, status: string, note?: string) => {
    // Optimistic UI state update
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: status as any,
          timeline: [
            ...(o.timeline || []),
            { status: status as any, timestamp: new Date().toISOString(), note: note || `Order status updated to ${status}` }
          ]
        };
      }
      return o;
    }));

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({ status, note })
      });
      if (res.ok) {
        fetchDashboardData();
      } else {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      fetchDashboardData();
    }
  };

  const handlePrintBill = (order: Order) => {
    setPrintingMsg(`Generating cash memo for Order #${order.id}...`);

    try {
      // Direct print trigger if possible
      window.print();
    } catch (e) {
      console.warn("Local print sandbox limit.", e);
    }

    const subtotal = order.items.reduce((sum, item) => sum + (item.price * (1 - item.discount / 100) * item.quantity), 0);
    const discountRow = order.couponDiscount && order.couponDiscount > 0 
      ? `<div class="total-row" style="display: flex; justify-content: space-between; padding: 6px 0; color: #10b981; font-weight: 600;">
          <span>Coupon Discount (${order.couponCode || 'PROMO'}):</span>
          <span>- ₹${Math.round(order.couponDiscount)}</span>
         </div>`
      : '';

    const itemsRows = order.items.map(item => {
      const discountedPrice = Math.round(item.price * (1 - item.discount / 100));
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: left;">
            <p style="margin: 0; font-weight: 700; color: #1f2937; font-size: 13px;">${item.title}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Item ID: ${item.productId.substring(0, 8).toUpperCase()}</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: center; font-family: monospace; font-weight: 600; color: #374151;">₹${discountedPrice}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; color: #1f2937;">${item.quantity}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: 700; color: #111827;">₹${discountedPrice * item.quantity}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MUMBAI BAZAR TAX INVOICE - Order #${order.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #f9fafb;
      color: #1f2937;
      margin: 0;
      padding: 30px 15px;
    }
    .invoice-card {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 35px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
      box-sizing: border-box;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 20px;
    }
    .brand {
      color: #059669;
      font-size: 24px;
      font-weight: 900;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 10px;
      color: #6b7280;
      margin: 4px 0 0 0;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .brand-addr {
      font-size: 12px;
      color: #4b5563;
      margin: 8px 0 0 0;
      line-height: 1.4;
    }
    .title {
      font-size: 18px;
      font-weight: 900;
      margin: 0;
      color: #111827;
      letter-spacing: -0.01em;
    }
    .order-meta {
      font-size: 12px;
      color: #4b5563;
      margin: 6px 0 0 0;
      line-height: 1.5;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 24px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f3f4f6;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      color: #9ca3af;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
      display: block;
    }
    .info-block p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #374151;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    .table th {
      border-bottom: 2px solid #f3f4f6;
      padding: 10px 0;
      text-align: left;
      color: #6b7280;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
    }
    .totals-container {
      border-top: 2px solid #f3f4f6;
      padding-top: 20px;
      margin-top: 20px;
    }
    .totals {
      width: 300px;
      margin-left: auto;
      font-size: 13px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      color: #4b5563;
    }
    .grand-total {
      border-top: 2px solid #e5e7eb;
      padding-top: 10px;
      margin-top: 6px;
      font-weight: 900;
      font-size: 16px;
      color: #059669;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #f3f4f6;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .print-notice {
      text-align: center;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #047857;
      font-weight: 600;
    }
    .btn-print-action {
      background-color: #059669;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 10px;
    }
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .print-notice {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="print-notice">
      🖨️ <strong>MUMBAI BAZAR MERCHANT BILL PRINT</strong><br>
      Your printer dialog has been triggered. Please click the button below if the dialog didn't open.
      <br>
      <button class="btn-print-action" onclick="window.print()">Print Cash Memo / Bill</button>
    </div>
    
    <div class="header">
      <div>
        <h1 class="brand">MUMBAI BAZAR 🏪</h1>
        <p class="brand-sub">OFFICIAL SELLER INVOICE</p>
        <p class="brand-addr">Crawford Market, South Mumbai, MH - 400001</p>
      </div>
      <div style="text-align: right;">
        <h2 class="title">RETAIL CASH MEMO</h2>
        <p class="order-meta">
          <strong>Order ID:</strong> <span style="font-family: monospace;">#${order.id}</span><br>
          <strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}<br>
          <strong>Status:</strong> ${order.status}<br>
          <strong>Payment Method:</strong> Cash On Delivery (COD)
        </p>
      </div>
    </div>

    <div class="grid">
      <div class="info-block">
        <span class="section-title">Recipient Customer</span>
        <p><strong>Name:</strong> ${order.buyerName}</p>
        <p><strong>Email:</strong> ${order.buyerEmail || 'N/A'}</p>
        <p><strong>Phone:</strong> ${order.phoneNumber}</p>
      </div>
      <div class="info-block">
        <span class="section-title">Delivery Destination</span>
        <p style="white-space: pre-wrap;">${order.shippingAddress}</p>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Particulars / Item Specs</th>
          <th style="text-align: center;">Rate</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals-container">
      <div class="totals">
        <div class="total-row">
          <span>Item Subtotal:</span>
          <span style="font-family: monospace; font-weight: 600;">₹${Math.round(subtotal)}</span>
        </div>
        ${discountRow}
        <div class="total-row">
          <span>Delivery Charges:</span>
          <span style="font-family: monospace; font-weight: 600;">${order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}</span>
        </div>
        <div class="total-row grand-total">
          <span>Grand Total Payable:</span>
          <span style="font-family: monospace;">₹${order.grandTotal}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p style="font-weight: 700; margin: 0 0 4px 0;">Thank you for conducting trade on Mumbai Bazar!</p>
      <p style="margin: 0;">This bill is authorized on behalf of the registered vendor. Please present this invoice receipt at the doorstep during Cash on Delivery collection.</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Mumbai_Bazar_Bill_Order_${order.id}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setPrintingMsg(`✓ Cash memo bill downloaded for Order #${order.id}!`);
    }, 1000);

    setTimeout(() => {
      setPrintingMsg(null);
    }, 4500);
  };

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-screen py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Vendor Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200/50 dark:border-zinc-800 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Seller Merchant Console</h1>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">Manage, list, ship, and trace earnings for store <span className="font-bold text-amber-500">{currentUser.name}</span></p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-white dark:bg-zinc-900 border text-stone-600 dark:text-zinc-400'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'products' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-white dark:bg-zinc-900 border text-stone-600 dark:text-zinc-400'}`}
            >
              Catalog Products
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'orders' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-white dark:bg-zinc-900 border text-stone-600 dark:text-zinc-400'}`}
            >
              Incoming Orders
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-2xl border border-emerald-150 dark:border-emerald-900/50 flex items-start gap-2.5 animate-bounce-subtle">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p>{successMsg}</p>
              <p className="text-xs text-stone-500 dark:text-zinc-400 font-normal mt-1">Sellers can easily list new items. Once approved by our administrators, they are live for all customers immediately.</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center py-20 text-xs text-stone-400 italic animate-pulse">Synchronizing seller metrics...</p>
        ) : (
          <>
            {/* Overview Tab Content */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-8 animate-fade-in">
                
                {/* Statistics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  <div className="bg-white dark:bg-zinc-900 border border-stone-150 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start text-stone-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Gross Sales (Approved)</span>
                      <DollarSign className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-2">₹{Math.round(stats.revenue)}</p>
                    <p className="text-[10px] text-emerald-500 mt-1 font-bold">100% Secure COD Settlements</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-stone-150 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start text-stone-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Net Store Earnings</span>
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-2">₹{Math.round(stats.netEarnings)}</p>
                    <p className="text-[10px] text-stone-400 mt-1">Deducted 10% Platform Commission</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-stone-150 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start text-stone-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Catalog Products</span>
                      <Package className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-2">{stats.totalProducts}</p>
                    <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                      <span className="text-emerald-500 font-bold">{stats.approvedProducts} Approved</span> • <span>{stats.pendingProducts} Pending</span>
                    </p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-stone-150 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start text-stone-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Fulfillment Orders</span>
                      <ShoppingCart className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-2">{stats.totalOrders}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-bold">{stats.pendingOrders} Active Deliveries</p>
                  </div>

                </div>

                {/* SVG Visual Sales chart */}
                <div className="bg-white dark:bg-zinc-900 border border-stone-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-850 dark:text-zinc-200 mb-6 flex items-center gap-1.5">
                    <BarChart3 className="w-4.5 h-4.5 text-amber-500" />
                    7-Day Gross Sales Trend (₹)
                  </h3>

                  <div className="h-60 w-full relative">
                    {/* SVG Drawn Vector Chart */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 700 220" preserveAspectRatio="none">
                      <g className="grid-lines" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3">
                        <line x1="0" y1="50" x2="700" y2="50" />
                        <line x1="0" y1="110" x2="700" y2="110" />
                        <line x1="0" y1="170" x2="700" y2="170" />
                      </g>
                      
                      {/* Line connecting points */}
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3.5"
                        points={salesHistory.map((item, idx) => {
                          const x = (idx / 6) * 700;
                          const ratio = item.revenue > 0 ? Math.min(1, item.revenue / 2000) : 0; // limit chart boundary scale at 2k max
                          const y = 170 - (ratio * 120);
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {/* Dot highlight pointers */}
                      {salesHistory.map((item, idx) => {
                        const x = (idx / 6) * 700;
                        const ratio = item.revenue > 0 ? Math.min(1, item.revenue / 2000) : 0;
                        const y = 170 - (ratio * 120);

                        return (
                          <g key={idx} className="group cursor-pointer">
                            <circle cx={x} cy={y} r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                            <text x={x} y={y - 12} textAnchor="middle" fill="#78350f" className="text-[10px] font-bold font-mono bg-white p-1 rounded">
                              ₹{item.revenue}
                            </text>
                            <text x={x} y="195" textAnchor="middle" fill="#64748b" className="text-[10px] font-bold">
                              {item.day}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

              </div>
            )}

            {/* Products catalog tab */}
            {activeTab === 'products' && (
              <div className="space-y-6 animate-fade-in">
                
                <div className="flex justify-between items-center bg-white dark:bg-zinc-900 px-5 py-4 rounded-2xl border">
                  <span className="text-xs font-bold text-stone-500">Listed Store Catalog ({products.length} Items)</span>
                  <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black rounded-xl transition-all flex items-center gap-1 shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Upload New Product
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.length === 0 ? (
                    <div className="col-span-2 bg-white text-center py-20 border rounded-2xl">
                      <p className="text-xs text-stone-400 italic">No products uploaded yet.</p>
                    </div>
                  ) : (
                    products.map((p) => {
                      const finalPPrice = p.price * (1 - p.discount/100);
                      return (
                        <div key={p.id} className="bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex gap-4 transition-all">
                          <img src={p.primaryImage} alt="" className="w-20 h-20 rounded-xl object-cover bg-stone-50" />
                          
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-bold text-stone-850 dark:text-white line-clamp-1">{p.title}</h4>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  p.status === 'Approved' 
                                    ? 'bg-emerald-50 text-emerald-600' 
                                    : p.status === 'Pending Approval' 
                                      ? 'bg-amber-50 text-amber-600' 
                                      : 'bg-red-50 text-red-600'
                                }`}>
                                  {p.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-stone-400 mt-1 font-mono">SKU: {p.sku} | Price: ₹{p.price} | Stock: {p.stock}</p>
                              
                              {p.status === 'Rejected' && p.rejectionReason && (
                                <p className="text-[9px] text-red-500 font-bold bg-red-50/50 p-1.5 rounded mt-1.5">
                                  Rejection Reason: {p.rejectionReason}
                                </p>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-3 mt-3">
                              <button
                                onClick={() => handleDuplicateProduct(p)}
                                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white"
                                title="Duplicate catalog item"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1.5 text-stone-400 hover:text-amber-600"
                                title="Edit item specifications"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-stone-400 hover:text-red-500"
                                title="Remove item"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

            {/* Incoming Orders Fulfillment Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-zinc-900 border px-5 py-4 rounded-2xl">
                  <span className="text-xs font-bold text-stone-500">Incoming Customer Orders ({orders.length})</span>
                </div>

                {/* Print Feedback Toast */}
                {printingMsg && (
                  <div className="bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800/50 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      {printingMsg}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {orders.length === 0 ? (
                    <div className="bg-white text-center py-20 border rounded-2xl">
                      <p className="text-xs text-stone-400 italic">No incoming orders found.</p>
                    </div>
                  ) : (
                    orders.map((o) => (
                      <div key={o.id} className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 space-y-4">
                        
                        <div className="flex flex-col sm:flex-row justify-between border-b pb-3 gap-2">
                          <div>
                            <p className="text-[10px] text-stone-400 uppercase font-semibold">Fulfillment Code</p>
                            <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">Order #{o.id}</h4>
                          </div>
                          <div className="sm:text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        </div>

                        {/* Recipient Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-600 dark:text-zinc-400">
                          <div>
                            <span className="font-bold text-stone-500">Delivery To:</span> {o.buyerName} ({o.phoneNumber})
                          </div>
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                            <span>{o.shippingAddress}</span>
                          </div>
                        </div>

                        {/* Order items matching seller */}
                        <div className="bg-stone-50/50 dark:bg-zinc-850 p-4 border rounded-xl divide-y">
                          {o.items.map((item, idx) => (
                            <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex justify-between text-xs text-stone-700 dark:text-zinc-300">
                              <span>{item.title} <span className="font-bold font-mono">x {item.quantity}</span></span>
                              <span className="font-bold font-mono text-stone-900 dark:text-white">₹{Math.round(item.price * (1 - item.discount/100) * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Workflow action dispatch states */}
                        <div className="flex flex-wrap gap-2 pt-2 justify-end">
                          <button
                            onClick={() => handlePrintBill(o)}
                            className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 transition-all mr-auto sm:mr-0"
                          >
                            <Printer className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                            <span>Print Bill</span>
                          </button>

                          {o.status === 'Pending' && (
                            <button
                              onClick={() => handleOrderStatusUpdate(o.id, 'Accepted', 'Order accepted and verified by Mumbai Masala Co.')}
                              className="px-3.5 py-1.5 bg-amber-500 text-stone-950 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Accept Order
                            </button>
                          )}
                          {o.status === 'Accepted' && (
                            <button
                              onClick={() => handleOrderStatusUpdate(o.id, 'Processing', 'Order packaging processed in Mumbai Fort warehouse')}
                              className="px-3.5 py-1.5 bg-amber-500 text-stone-950 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Process Packing
                            </button>
                          )}
                          {o.status === 'Processing' && (
                            <button
                              onClick={() => handleOrderStatusUpdate(o.id, 'Packed', 'Order packed and securely taped for transit')}
                              className="px-3.5 py-1.5 bg-amber-500 text-stone-950 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Mark as Packed
                            </button>
                          )}
                          {o.status === 'Packed' && (
                            <button
                              onClick={() => handleOrderStatusUpdate(o.id, 'Shipped', 'Order dispatched via Mumbai local courier')}
                              className="px-3.5 py-1.5 bg-amber-500 text-stone-950 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Dispatch Shipping
                            </button>
                          )}
                          {o.status === 'Shipped' && (
                            <button
                              onClick={() => handleOrderStatusUpdate(o.id, 'Out For Delivery', 'Courier partner out for doorstep delivery')}
                              className="px-3.5 py-1.5 bg-amber-500 text-stone-950 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Out for Delivery
                            </button>
                          )}
                          {o.status === 'Out For Delivery' && (
                            <button
                              onClick={() => handleOrderStatusUpdate(o.id, 'Delivered', 'Cash collected successfully and order fulfilled.')}
                              className="px-3.5 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Delivered (Confirm Cash Collected)
                            </button>
                          )}
                          {o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Rejected' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalOrder(o);
                                setRejectReason('Out of stock / Store unable to fulfill');
                              }}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 font-bold text-xs rounded-lg cursor-pointer transition-colors"
                            >
                              Reject Order
                            </button>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* Upload/Edit Product Modal Dialog */}
            {showProductModal && (
              <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 border rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 md:p-8 space-y-6">
                  
                  <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="text-lg font-black text-stone-950 dark:text-white">
                      {editingProduct ? `Modify Item Specs: ${editingProduct.title}` : 'Upload New Catalog Product'}
                    </h3>
                    <button onClick={() => setShowProductModal(false)} className="p-1 hover:bg-stone-50 dark:hover:bg-zinc-800 rounded-full">
                      <X className="w-5 h-5 text-stone-400" />
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl border border-red-100">{formError}</div>
                  )}

                  <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                    
                    <div className="space-y-4 min-w-0">
                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Product Title *</label>
                        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Catalog Category *</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white">
                          {categories.map(c => <option key={c.id} value={c.name} className="bg-white dark:bg-zinc-900 text-stone-850 dark:text-zinc-200">{c.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">Brand Name</label>
                          <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">SKU Code</label>
                          <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">Price (₹) *</label>
                          <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">Discount (%)</label>
                          <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">Stock Count *</label>
                          <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Product Description</label>
                        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                      </div>
                    </div>

                    <div className="space-y-4 min-w-0">
                      {/* Image Manager Section */}
                      <div className="space-y-4 p-4.5 bg-stone-100/50 dark:bg-zinc-900/50 rounded-2xl border border-stone-200/60 dark:border-zinc-800/60">
                        <h4 className="text-sm font-bold text-stone-700 dark:text-zinc-350 uppercase tracking-wider">Product Images</h4>
                        
                        {/* Main Image Control */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-stone-500 uppercase">Main / Primary Image *</label>
                            <div className="flex gap-2 text-[10px]">
                              <button type="button" onClick={() => setMainUploadType('file')} className={`px-2 py-1 rounded font-bold transition-all ${mainUploadType === 'file' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'}`}>Upload File</button>
                              <button type="button" onClick={() => setMainUploadType('url')} className={`px-2 py-1 rounded font-bold transition-all ${mainUploadType === 'url' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'}`}>URL</button>
                            </div>
                          </div>

                          {mainUploadType === 'url' ? (
                            <input 
                              type="text" 
                              required 
                              placeholder="Paste main image URL" 
                              value={primaryImage} 
                              onChange={(e) => {
                                setPrimaryImage(e.target.value);
                                setImagesList(prev => {
                                  if (prev.length === 0) return [e.target.value];
                                  const idx = prev.indexOf(primaryImage);
                                  if (idx !== -1) {
                                    const next = [...prev];
                                    next[idx] = e.target.value;
                                    return next;
                                  }
                                  return [e.target.value, ...prev];
                                });
                              }} 
                              className="w-full p-2.5 bg-white dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white text-xs" 
                            />
                          ) : (
                            <div className="relative">
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleFileChange(e, 'primary')} 
                                className="w-full text-xs text-stone-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-600 dark:file:text-amber-400 hover:file:bg-amber-500/20"
                              />
                            </div>
                          )}

                          {primaryImage && (
                            <div className="mt-2 flex items-center gap-3">
                              <img src={primaryImage} alt="Main Preview" className="w-12 h-12 object-cover rounded-xl border" referrerPolicy="no-referrer" />
                              <span className="text-[10px] text-stone-500 dark:text-zinc-400 truncate max-w-xs">{primaryImage.startsWith('data:') ? 'Base64 Encoded Image' : primaryImage}</span>
                            </div>
                          )}
                        </div>

                        {/* Additional Images Control */}
                        <div className="border-t border-stone-200/60 dark:border-zinc-800/60 pt-3">
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-stone-500 uppercase">Add Additional Images</label>
                            <div className="flex gap-2 text-[10px]">
                              <button type="button" onClick={() => setImageUploadType('file')} className={`px-2 py-1 rounded font-bold transition-all ${imageUploadType === 'file' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'}`}>Upload File</button>
                              <button type="button" onClick={() => setImageUploadType('url')} className={`px-2 py-1 rounded font-bold transition-all ${imageUploadType === 'url' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'}`}>URL</button>
                            </div>
                          </div>

                          {imageUploadType === 'url' ? (
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="Paste additional image URL" 
                                value={newImageInput} 
                                onChange={(e) => setNewImageInput(e.target.value)} 
                                className="flex-1 p-2 bg-white dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white text-xs" 
                              />
                              <button 
                                type="button" 
                                onClick={() => {
                                  if (newImageInput) {
                                    if (!imagesList.includes(newImageInput)) {
                                      setImagesList(prev => [...prev, newImageInput]);
                                    }
                                    setNewImageInput('');
                                  }
                                }} 
                                className="px-3 bg-stone-850 dark:bg-zinc-800 hover:bg-stone-750 text-white text-xs font-bold rounded-xl"
                              >
                                Add
                              </button>
                            </div>
                          ) : (
                            <input 
                              type="file" 
                              accept="image/*" 
                              multiple
                              onChange={(e) => handleFileChange(e, 'list')} 
                              className="w-full text-xs text-stone-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-600 dark:file:text-amber-400 hover:file:bg-amber-500/20"
                            />
                          )}
                        </div>

                        {/* List/Gallery of all images in the product */}
                        {imagesList.length > 0 && (
                          <div className="mt-3.5">
                            <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1.5">Image Gallery ({imagesList.length})</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1 bg-white dark:bg-zinc-950/40 rounded-xl border">
                              {imagesList.map((img, i) => {
                                const isMain = img === primaryImage;
                                return (
                                  <div key={i} className="group relative border dark:border-zinc-800 rounded-xl overflow-hidden aspect-square bg-stone-50 dark:bg-zinc-900 flex flex-col items-center justify-center">
                                    <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    
                                    {isMain ? (
                                      <span className="absolute top-1 left-1 bg-amber-500 text-stone-950 font-black text-[8px] px-1.5 py-0.5 rounded shadow-sm">Main</span>
                                    ) : (
                                      <button 
                                        type="button" 
                                        onClick={() => setPrimaryImage(img)} 
                                        className="absolute top-1 left-1 bg-stone-800/80 hover:bg-stone-900 text-white font-bold text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        Set Main
                                      </button>
                                    )}

                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        const updatedList = imagesList.filter((_, idx) => idx !== i);
                                        setImagesList(updatedList);
                                        if (isMain && updatedList.length > 0) {
                                          setPrimaryImage(updatedList[0]);
                                        } else if (isMain) {
                                          setPrimaryImage('');
                                        }
                                      }} 
                                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full text-[9px] w-5 h-5 flex items-center justify-center font-bold"
                                      title="Remove image"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">Item Weight</label>
                          <input type="text" placeholder="E.g. 250g" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">Dimensions</label>
                          <input type="text" placeholder="E.g. 10 x 5 x 5 cm" value={dimensions} onChange={(e) => setDimensions(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">Warranty Term</label>
                          <input type="text" placeholder="E.g. 1 Year Brand Warranty" value={warranty} onChange={(e) => setWarranty(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                        <div>
                          <label className="block font-bold text-stone-500 uppercase mb-1">Return Window</label>
                          <input type="text" placeholder="E.g. 7 Days Replacement" value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                        </div>
                      </div>

                      {/* Custom Specifications list */}
                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Add Key Specifications</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input type="text" placeholder="Key (e.g. Ingredients)" value={specKey} onChange={(e) => setSpecKey(e.target.value)} className="w-full sm:w-1/2 p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                          <input type="text" placeholder="Value (e.g. Pure Cardamom)" value={specVal} onChange={(e) => setSpecVal(e.target.value)} className="w-full sm:w-1/2 p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white" />
                          <button type="button" onClick={handleAddSpec} className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 dark:bg-zinc-800 hover:bg-stone-750 text-white font-bold rounded-xl">+</button>
                        </div>

                        {specifications.length > 0 && (
                          <div className="mt-2.5 space-y-1 bg-stone-50 p-2.5 rounded-xl border max-h-24 overflow-y-auto">
                            {specifications.map((spec, i) => (
                              <div key={i} className="flex justify-between text-[10px] text-stone-600">
                                <span>{spec.key}: {spec.value}</span>
                                <button type="button" onClick={() => setSpecifications(specifications.filter((_, idx) => idx !== i))} className="text-red-500 font-bold font-mono">x</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="col-span-1 lg:col-span-2 pt-4 border-t flex justify-end gap-3">
                      <button type="button" onClick={() => setShowProductModal(false)} className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold cursor-pointer">Cancel</button>
                      <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl cursor-pointer">
                        {editingProduct ? 'Save Changes' : 'Publish Product Listing'}
                      </button>
                    </div>

                  </form>

                </div>
              </div>
            )}

            {/* Reject Order Confirmation Modal */}
            {rejectModalOrder && (
              <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span>Reject Order #{rejectModalOrder.id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRejectModalOrder(null)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-stone-600 dark:text-zinc-300">
                      Are you sure you want to reject this order? The customer will be notified immediately on their tracking timeline.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300 mb-1">
                        Reason for rejection:
                      </label>
                      <select
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full p-2.5 text-xs bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="Out of stock / Store unable to fulfill">Out of stock / Store unable to fulfill</option>
                        <option value="Store temporarily closed">Store temporarily closed</option>
                        <option value="Delivery address unserviceable">Delivery address unserviceable</option>
                        <option value="Order details incomplete or inaccurate">Order details incomplete or inaccurate</option>
                        <option value="Customer requested order cancellation">Customer requested order cancellation</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setRejectModalOrder(null)}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleOrderStatusUpdate(rejectModalOrder.id, 'Rejected', `Order rejected by seller. Reason: ${rejectReason}`);
                        setRejectModalOrder(null);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-colors"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}
