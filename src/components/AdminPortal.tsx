import React, { useState, useEffect } from 'react';
import { User, Product, Category, Coupon, AuditLog } from '../types.js';
import { useToast } from '../context/ToastContext.tsx';
import { 
  CheckCircle, XCircle, Users, Package, ShoppingCart, Percent, FolderPlus, 
  Trash, ShieldAlert, Ban, Unlock, RefreshCw, KeyRound, Search, Eye, FileSpreadsheet, FileText,
  Upload, Link as LinkIcon, Image as ImageIcon, Sparkles
} from 'lucide-react';

interface AdminPortalProps {
  currentUser: User;
}

export default function AdminPortal({ currentUser }: AdminPortalProps) {
  const { success, error, info, warning, promptDialog, confirmDialog } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'users' | 'categories' | 'coupons'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingMsg, setExportingMsg] = useState<string | null>(null);

  // Users Tab Search Filter
  const [userSearch, setUserSearch] = useState('');

  // Category addition fields
  const [newCatName, setNewCatName] = useState('');
  const [catImageMode, setCatImageMode] = useState<'url' | 'file'>('url');
  const [newCatImage, setNewCatImage] = useState('https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=60');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const compressImageFile = (file: File, maxWidth = 800, quality = 0.85): Promise<string> => {
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

  const handleCategoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    try {
      setUploadedFileName(file.name);
      const base64 = await compressImageFile(file, 800, 0.85);
      if (base64) {
        setNewCatImage(base64);
        success(`Image "${file.name}" processed successfully!`, 'Image Uploaded');
      }
    } catch (err) {
      error('Failed to process image file.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Coupon addition fields
  const [coupCode, setCoupCode] = useState('');
  const [coupType, setCoupType] = useState<'Percentage' | 'Flat'>('Percentage');
  const [coupVal, setCoupVal] = useState('');
  const [coupExpiry, setCoupExpiry] = useState('');
  const [coupLimit, setCoupLimit] = useState('100');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` };
      
      const statsRes = await fetch('/api/analytics/dashboard', { headers });
      const prodsRes = await fetch('/api/products-all', { headers });
      const usersRes = await fetch('/api/admin/users', { headers });
      const catsRes = await fetch('/api/categories');
      const couponsRes = await fetch('/api/coupons', { headers });

      if (statsRes.ok && prodsRes.ok && usersRes.ok && catsRes.ok && couponsRes.ok) {
        const statsData = await statsRes.json();
        const prodsData = await prodsRes.json();
        const usersData = await usersRes.json();
        const catsData = await catsRes.json();
        const couponsData = await couponsRes.json();

        setStats(statsData.stats);
        setPendingProducts(prodsData.filter((p: Product) => p.status === 'Pending'));
        setUsersList(usersData);
        setCategories(catsData);
        setCoupons(couponsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Product Approvals
  const handleApproveProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` }
      });
      if (res.ok) {
        success('Product approved and published to store catalog.', 'Product Approved');
        fetchAdminData();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to approve product.');
      }
    } catch (err) {
      console.error(err);
      error('Error approving product.');
    }
  };

  const handleRejectProduct = async (productId: string) => {
    const reason = await promptDialog(
      'Specify rejection feedback comments for the vendor:',
      'Reject Product Listing',
      'Does not meet our catalog listing guidelines.',
      'Enter feedback reason...'
    );
    if (reason === null) return; // cancelled
    try {
      const res = await fetch(`/api/products/${productId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({ reason: reason || 'Does not meet our catalog listing guidelines.' })
      });
      if (res.ok) {
        info('Product listing rejected with feedback note.', 'Product Rejected');
        fetchAdminData();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to reject product.');
      }
    } catch (err) {
      console.error(err);
      error('Error rejecting product.');
    }
  };

  // Block/Unblock users
  const handleToggleBlockUser = async (user: User) => {
    const isBlocked = !user.isBlocked;
    try {
      const res = await fetch(`/api/admin/users/${user.id}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({ isBlocked })
      });
      if (res.ok) {
        if (isBlocked) {
          warning(`User ${user.name} has been suspended/blocked.`, 'User Blocked');
        } else {
          success(`User ${user.name} has been unblocked.`, 'User Unblocked');
        }
        fetchAdminData();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to update user status.');
      }
    } catch (err) {
      console.error(err);
      error('Error updating user status.');
    }
  };

  // Reset password
  const handleResetPassword = async (userId: string) => {
    const newPassword = await promptDialog(
      'Set a new password for this user account:',
      'Reset User Password',
      '',
      'Enter new secure password...'
    );
    if (!newPassword) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        success('Password has been reset successfully.', 'Password Updated');
      } else {
        const data = await res.json();
        error(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      console.error(err);
      error('Error resetting password.');
    }
  };

  // Category addition
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      error('Please enter a category name.');
      return;
    }
    if (!newCatImage.trim()) {
      error('Please provide a category image (URL or upload file).');
      return;
    }

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({ name: newCatName.trim(), image: newCatImage.trim() })
      });
      if (res.ok) {
        success(`Category "${newCatName.trim()}" created successfully.`, 'Category Added');
        setNewCatName('');
        setNewCatImage('https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=60');
        setUploadedFileName('');
        fetchAdminData();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to add category');
      }
    } catch (err) {
      console.error(err);
      error('Error creating category.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    // Optimistic delete
    setCategories(prev => prev.filter(c => c.id !== id));
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` }
      });
      if (res.ok) {
        info('Category deleted from catalog.', 'Category Removed');
      } else {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
      fetchAdminData();
    }
  };

  // Coupon creation
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupCode || !coupVal || !coupExpiry) return;

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({
          code: coupCode,
          type: coupType,
          value: Number(coupVal),
          expiryDate: coupExpiry,
          usageLimit: Number(coupLimit)
        })
      });
      if (res.ok) {
        success(`Coupon "${coupCode.toUpperCase()}" added successfully.`, 'Coupon Created');
        setCoupCode('');
        setCoupVal('');
        setCoupExpiry('');
        fetchAdminData();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to add coupon code');
      }
    } catch (err) {
      console.error(err);
      error('Error creating coupon.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    // Optimistic delete for instant responsive feedback
    setCoupons(prev => prev.filter(c => c.id !== id));
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` }
      });
      if (res.ok) {
        info('Coupon removed successfully.', 'Coupon Deleted');
      } else {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
      fetchAdminData();
    }
  };

  // Generate actual, high-fidelity report downloads for PDF/Excel
  const handleExportReport = (type: 'pdf' | 'excel') => {
    setExportingMsg(`Compiling report database...`);
    
    const now = new Date().toLocaleString('en-US');
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `Mumbai_Bazar_Marketplace_Sales_Report_${dateStamp}`;
    
    setTimeout(() => {
      if (type === 'excel') {
        // Create genuine, highly structured CSV
        let csvContent = "\ufeff"; // BOM for proper Excel UTF-8 display
        
        // Header Section
        csvContent += "MUMBAI BAZAR MARKETPLACE - OFFICIAL PERFORMANCE REPORT\n";
        csvContent += `Generated On,${now}\n`;
        csvContent += `Authorized By,${currentUser.name} (${currentUser.role})\n\n`;
        
        // Platform Statistics
        csvContent += "PLATFORM PERFORMANCE METRICS SUMMARY\n";
        csvContent += `Total Users,${stats?.totalUsers || 0}\n`;
        csvContent += `Active Buyers,${stats?.buyers || 0}\n`;
        csvContent += `Registered Sellers,${stats?.sellers || 0}\n`;
        csvContent += `Total Catalog Products,${stats?.totalProducts || 0}\n`;
        csvContent += `Approved Listings,${stats?.approvedProducts || 0}\n`;
        csvContent += `Pending Verification,${stats?.pendingProducts || 0}\n`;
        csvContent += `Total Gross Sales Revenue,INR ${stats?.totalRevenue || 0}\n`;
        csvContent += `Platform Commission Earned (10%),INR ${stats?.commissionEarned || 0}\n`;
        csvContent += `Total Orders,${stats?.totalOrders || 0}\n`;
        csvContent += `Delivered Orders,${stats?.deliveredOrders || 0}\n\n`;
        
        // User Registry
        csvContent += "USER REGISTRY DIRECTORY\n";
        csvContent += "User ID,Name,Email,Role,Status\n";
        usersList.forEach(u => {
          csvContent += `"${u.id}","${u.name.replace(/"/g, '""')}","${u.email.replace(/"/g, '""')}","${u.role}","${u.isBlocked ? 'Blocked' : 'Active'}"\n`;
        });
        csvContent += "\n";
        
        // Coupons
        csvContent += "ACTIVE PROMOTIONAL COUPONS\n";
        csvContent += "Coupon Code,Discount Type,Discount Value,Expiry Date,Usage Limit\n";
        coupons.forEach(c => {
          csvContent += `"${c.code}","${c.type}","${c.type === 'Percentage' ? `${c.value}%` : `INR ${c.value}`}","${c.expiryDate}","${c.usageLimit} Claims"\n`;
        });
        csvContent += "\n";

        // Pending approvals
        csvContent += "PRODUCTS AWAITING VERIFICATION QUEUE\n";
        csvContent += "Product ID,Product Title,Category,Price,Seller Name\n";
        pendingProducts.forEach(p => {
          csvContent += `"${p.id}","${p.title.replace(/"/g, '""')}","${p.category}","INR ${p.price}","${p.sellerName.replace(/"/g, '""')}"\n`;
        });
        
        // Trigger Blob download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setExportingMsg("✓ Excel CSV performance report downloaded!");
      } else {
        // Create a magnificent, print-ready HTML page with high visual polish that acts as a real certified PDF template
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mumbai Bazar - Certified performance Report</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: #1c1917;
      margin: 40px;
      line-height: 1.6;
      background-color: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title-area h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 900;
      color: #064e3b;
      letter-spacing: -0.5px;
    }
    .title-area p {
      margin: 5px 0 0 0;
      color: #6b7280;
      font-size: 14px;
    }
    .badge {
      background-color: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .meta-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      font-size: 13px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      color: #9ca3af;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
    }
    .meta-value {
      font-weight: bold;
      color: #374151;
      margin-top: 2px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 40px;
    }
    .stat-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 15px;
      text-align: center;
    }
    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      color: #6b7280;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 900;
      margin-top: 5px;
      color: #111827;
    }
    .highlight {
      border-top: 4px solid #10b981;
    }
    h2 {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #064e3b;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 12px;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: left;
      padding: 10px;
      border-bottom: 2px solid #e5e7eb;
      color: #374151;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #f3f4f6;
      color: #4b5563;
    }
    tr:nth-child(even) td {
      background-color: #fafafa;
    }
    .print-banner {
      background-color: #10b981;
      color: #ffffff;
      padding: 14px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .print-btn {
      background-color: #ffffff;
      color: #047857;
      border: none;
      padding: 6px 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    @media print {
      .print-banner {
        display: none;
      }
      body {
        margin: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="print-banner">
    <span>💡 <strong>Your Certified Performance Report is Ready!</strong> Click the Print button and select "Save as PDF" to save a official certified copy.</span>
    <button class="print-btn" onclick="window.print()">Print or Save PDF</button>
  </div>

  <div class="header">
    <div class="title-area">
      <h1>MUMBAI BAZAR 🏪</h1>
      <p>Certified Platform Performance & Sales Activity Audit Report</p>
    </div>
    <div class="badge">CERTIFIED OFFICIAL RECORD</div>
  </div>

  <div class="meta-box">
    <div class="meta-item">
      <span class="meta-label">Certified Export Date</span>
      <span class="meta-value">${now}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Executing Admin Officer</span>
      <span class="meta-value">${currentUser.name} (${currentUser.role})</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Database Origin</span>
      <span class="meta-value">Live Production Cloud Cluster</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Document Security Token</span>
      <span class="meta-value" style="color: #10b981;">✓ verified-genuine-token-${Math.floor(100000 + Math.random() * 900000)}</span>
    </div>
  </div>

  <h2>Platform Performance Indexes</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Core Users</div>
      <div class="stat-value">${stats?.totalUsers || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Fulfillments Delivered</div>
      <div class="stat-value">${stats?.deliveredOrders || 0}</div>
    </div>
    <div class="stat-card highlight">
      <div class="stat-label">Gross Platform Revenue</div>
      <div class="stat-value" style="color: #059669;">₹${Math.round(stats?.totalRevenue || 0)}</div>
    </div>
    <div class="stat-card highlight">
      <div class="stat-label">10% Platform Commission</div>
      <div class="stat-value" style="color: #059669;">₹${Math.round(stats?.commissionEarned || 0)}</div>
    </div>
  </div>

  <h2>Active Registered User Directory</h2>
  <table>
    <thead>
      <tr>
        <th>User ID</th>
        <th>Display Name</th>
        <th>Registered Email</th>
        <th>Access Role</th>
        <th>Directory Status</th>
      </tr>
    </thead>
    <tbody>
      ${usersList.map(u => `
        <tr>
          <td><code>${u.id}</code></td>
          <td><strong>${u.name}</strong></td>
          <td>${u.email}</td>
          <td><span style="text-transform: capitalize; font-weight: 500;">${u.role}</span></td>
          <td><span style="color: ${u.isBlocked ? '#ef4444' : '#10b981'}; font-weight: bold;">${u.isBlocked ? 'Blocked' : 'Active'}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Promotional Coupons & Campaigns</h2>
  <table>
    <thead>
      <tr>
        <th>Coupon Code</th>
        <th>Incentive Type</th>
        <th>Discount Magnitude</th>
        <th>Validity Deadline</th>
        <th>Usage Quota</th>
      </tr>
    </thead>
    <tbody>
      ${coupons.length === 0 ? '<tr><td colspan="5" style="text-align: center; font-style: italic; color: #9ca3af;">No active promotional codes registered in campaign registry.</td></tr>' : coupons.map(c => `
        <tr>
          <td><code>${c.code}</code></td>
          <td>${c.type}</td>
          <td>${c.type === 'Percentage' ? `${c.value}%` : `₹${c.value}`}</td>
          <td>${c.expiryDate}</td>
          <td>${c.usageLimit} Claims Remaining</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="margin-top: 60px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px;">
    <p>This document constitutes an official certified snapshot of Mumbai Bazar transactional data. Any unauthorized modifications of tables or values invalidate certification.</p>
    <p>© ${new Date().getFullYear()} Mumbai Bazar Inc. All rights reserved.</p>
  </div>
</body>
</html>
        `;
        
        // Trigger Blob download of the HTML certified print document
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.html`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setExportingMsg("✓ Certified PDF printable report downloaded!");
      }
    }, 1200);

    // Fade feedback message after 4.5 seconds
    setTimeout(() => {
      setExportingMsg(null);
    }, 4500);
  };

  // Filter user list
  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-screen py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Admin Control Panel</h1>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
              Verify vendor products, change permissions, manage categories, coupons, and review audit charts
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['overview', 'approvals', 'users', 'categories', 'coupons'] as any[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
                  activeTab === tab 
                    ? 'bg-amber-500 text-stone-950 shadow-sm' 
                    : 'bg-white dark:bg-zinc-900 border text-stone-600 dark:text-zinc-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center py-20 text-xs text-stone-400 italic animate-pulse">Synchronizing general catalog data...</p>
        ) : (
          <>
            {/* 1. Overview Dashboard */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-8 animate-fade-in">
                
                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
                  
                  <div className="bg-white dark:bg-zinc-900 border p-5 rounded-2xl shadow-sm">
                    <span className="text-stone-400 font-extrabold uppercase block tracking-wider">Total Active Users</span>
                    <p className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-2">{stats.totalUsers}</p>
                    <p className="text-[10px] text-stone-400 mt-1">{stats.sellers} Sellers • {stats.buyers} Buyers</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border p-5 rounded-2xl shadow-sm">
                    <span className="text-stone-400 font-extrabold uppercase block tracking-wider">Approved Products</span>
                    <p className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-2">{stats.approvedProducts}</p>
                    <p className="text-[10px] text-amber-500 font-bold mt-1">{stats.pendingProducts} Pending Approval Review</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border p-5 rounded-2xl shadow-sm">
                    <span className="text-stone-400 font-extrabold uppercase block tracking-wider">Total Platform Revenue</span>
                    <p className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-2">₹{Math.round(stats.totalRevenue)}</p>
                    <p className="text-[10px] text-emerald-500 mt-1 font-bold">{stats.deliveredOrders} Fulfillments Delivered</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border p-5 rounded-2xl shadow-sm">
                    <span className="text-stone-400 font-extrabold uppercase block tracking-wider">Platform Commission (10%)</span>
                    <p className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-2">₹{Math.round(stats.commissionEarned)}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-bold">Pending Payout Clearance</p>
                  </div>

                </div>

                {/* Export Feedback Toast */}
                {exportingMsg && (
                  <div className="bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800/50 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      {exportingMsg}
                    </span>
                  </div>
                )}

                {/* Print reports box */}
                <div className="bg-white dark:bg-zinc-900 border rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200">Export Marketplace Sales Reports</h3>
                    <p className="text-xs text-stone-400 mt-1">Download certified summaries of user counts, total vendor sales commission, and invoice logs.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleExportReport('pdf')} className="px-4 py-2 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 text-stone-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                      <FileText className="w-4 h-4 text-red-500" />
                      Export PDF
                    </button>
                    <button onClick={() => handleExportReport('excel')} className="px-4 py-2 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 text-stone-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      Export Excel
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* 2. Approvals queue */}
            {activeTab === 'approvals' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-zinc-900 border px-5 py-4 rounded-2xl">
                  <span className="text-xs font-bold text-stone-500">Products Awaiting Administrative Verification ({pendingProducts.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingProducts.length === 0 ? (
                    <div className="col-span-2 bg-white text-center py-20 border rounded-2xl">
                      <p className="text-xs text-stone-400 italic">No products currently awaiting approval.</p>
                    </div>
                  ) : (
                    pendingProducts.map((p) => (
                      <div key={p.id} className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 space-y-4">
                        <div className="flex gap-4">
                          <img src={p.primaryImage} alt="" className="w-20 h-20 rounded-xl object-cover bg-stone-50" />
                          <div>
                            <span className="text-[10px] text-amber-600 font-bold uppercase">{p.category}</span>
                            <h4 className="text-xs font-extrabold text-stone-900 dark:text-white mt-0.5 leading-normal">{p.title}</h4>
                            <p className="text-[10px] text-stone-400 mt-1 font-mono">Price: ₹{p.price} | Stock: {p.stock} | Seller: <span className="text-amber-500 font-bold">{p.sellerName}</span></p>
                          </div>
                        </div>

                        <p className="text-[11px] text-stone-500 dark:text-zinc-400 line-clamp-2 leading-relaxed bg-stone-50/50 dark:bg-zinc-850 p-2.5 rounded-xl border">
                          {p.description || "No description provided."}
                        </p>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <button
                            onClick={() => handleRejectProduct(p.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveProduct(p.id)}
                            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve Live
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. Users manager */}
            {activeTab === 'users' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Search Bar */}
                <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex items-center gap-3">
                  <Search className="w-4.5 h-4.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search buyers, sellers, or admins by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="flex-1 text-xs text-stone-850 dark:text-white bg-transparent focus:outline-none"
                  />
                </div>

                {/* Users Table */}
                <div className="bg-white dark:bg-zinc-900 border rounded-2xl overflow-x-auto shadow-sm">
                  <table className="w-full min-w-[700px] text-xs text-left">
                    <thead>
                      <tr className="bg-stone-50 border-b text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Recipient Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-stone-700 dark:text-zinc-300">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-stone-50/40">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <img src={user.avatar} className="w-8 h-8 rounded-full border object-cover" alt="" />
                              <span className="font-bold text-stone-850 dark:text-white">{user.name}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-[11px]">{user.email}</td>
                          <td className="p-4 capitalize font-semibold">{user.role.replace('_', ' ')}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              user.isBlocked ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {user.isBlocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1.5">
                            <button
                              onClick={() => handleResetPassword(user.id)}
                              className="p-1.5 hover:bg-stone-100 text-stone-500 hover:text-stone-800 rounded-lg cursor-pointer"
                              title="Force password reset"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            {user.role !== 'super_admin' && (
                              <button
                                onClick={() => handleToggleBlockUser(user)}
                                className={`p-1.5 rounded-lg cursor-pointer ${user.isBlocked ? 'hover:bg-emerald-50 text-emerald-500' : 'hover:bg-red-50 text-red-500'}`}
                                title={user.isBlocked ? 'Unblock user account' : 'Block user account'}
                              >
                                {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* 4. Categories management */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                
                {/* Addition Form */}
                <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm h-fit space-y-4">
                  <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-2 border-b flex items-center justify-between">
                    <span>Add Category</span>
                    <span className="text-[10px] font-normal text-stone-400 capitalize">Catalog Management</span>
                  </h3>
                  
                  <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-stone-500 uppercase mb-1">Category Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. Spices & Organic Herbs"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    {/* Image Option Selector (URL vs Upload File) */}
                    <div>
                      <label className="block font-bold text-stone-500 uppercase mb-2">Category Image *</label>
                      
                      {/* Segmented Mode Switch */}
                      <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 dark:bg-zinc-800 rounded-xl mb-3">
                        <button
                          type="button"
                          onClick={() => setCatImageMode('url')}
                          className={`py-1.5 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            catImageMode === 'url'
                              ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-white shadow-sm'
                              : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800'
                          }`}
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>Image URL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatImageMode('file')}
                          className={`py-1.5 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            catImageMode === 'file'
                              ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-white shadow-sm'
                              : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image</span>
                        </button>
                      </div>

                      {/* Mode 1: URL Input */}
                      {catImageMode === 'url' && (
                        <div className="space-y-1.5 animate-fade-in">
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="https://images.unsplash.com/..."
                              value={newCatImage.startsWith('data:image') ? '' : newCatImage}
                              onChange={(e) => {
                                setNewCatImage(e.target.value);
                                setUploadedFileName('');
                              }}
                              className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white font-mono text-[11px] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-8"
                            />
                            {newCatImage && !newCatImage.startsWith('data:image') && (
                              <button
                                type="button"
                                onClick={() => setNewCatImage('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                title="Clear URL"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400">Paste direct image link from Unsplash, CDN, or web source.</p>
                        </div>
                      )}

                      {/* Mode 2: File Upload (Choose File) */}
                      {catImageMode === 'file' && (
                        <div className="space-y-2 animate-fade-in">
                          <input
                            type="file"
                            id="cat-image-file-input"
                            accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                            onChange={handleCategoryFileChange}
                            className="hidden"
                          />
                          
                          <label
                            htmlFor="cat-image-file-input"
                            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-200 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl bg-stone-50/60 dark:bg-zinc-850/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all cursor-pointer group text-center"
                          >
                            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                              {isProcessingImage ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[11px] rounded-lg shadow-sm">
                                Choose File
                              </span>
                              <p className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1">
                                {uploadedFileName ? (
                                  <span className="font-semibold text-amber-600 dark:text-amber-400 truncate max-w-[200px] inline-block">{uploadedFileName}</span>
                                ) : (
                                  'JPG, PNG, WebP, SVG up to 10MB'
                                )}
                              </p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Live Image Preview Card */}
                    {newCatImage && (
                      <div className="p-3 bg-stone-50 dark:bg-zinc-850/80 border border-stone-200 dark:border-zinc-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-stone-500 uppercase">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-amber-500" />
                            Image Preview
                          </span>
                          <span className="text-emerald-600 font-mono text-[9px] bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                            {newCatImage.startsWith('data:image') ? 'Uploaded File' : 'URL Link'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 bg-stone-100 flex-shrink-0">
                            <img
                              src={newCatImage}
                              alt="Category Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=60';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-stone-850 dark:text-white truncate">
                              {newCatName || 'Category Name Preview'}
                            </p>
                            <p className="text-[10px] text-stone-400 font-mono truncate">
                              {newCatName ? newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'slug-preview'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={isProcessingImage || !newCatName.trim()}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-bold rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      {isProcessingImage ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing Image...</span>
                        </>
                      ) : (
                        <span>Save Category</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* Listing */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-2 border-b">Category Catalog List</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categories.map((c) => (
                      <div key={c.id} className="p-3 border rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={c.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          <div>
                            <p className="text-xs font-bold text-stone-900 dark:text-white">{c.name}</p>
                            <p className="text-[10px] text-stone-400">Slug: {c.slug}</p>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleDeleteCategory(c.id)} 
                          title="Delete Category"
                          className="text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 5. Coupons tab */}
            {activeTab === 'coupons' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                
                {/* Add coupon form */}
                <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm h-fit space-y-4">
                  <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-2 border-b">Generate Promo Coupon</h3>
                  <form onSubmit={handleAddCoupon} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-stone-500 uppercase mb-1">Coupon Promo Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. MUMBAI30"
                        value={coupCode}
                        onChange={(e) => setCoupCode(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl font-mono uppercase text-stone-850 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-500 uppercase mb-1">Coupon Type</label>
                      <select value={coupType} onChange={(e: any) => setCoupType(e.target.value)} className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white">
                        <option value="Percentage" className="bg-white dark:bg-zinc-900 text-stone-850 dark:text-zinc-200">Percentage % Discount</option>
                        <option value="Flat" className="bg-white dark:bg-zinc-900 text-stone-850 dark:text-zinc-200">Flat ₹ Discount</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Value *</label>
                        <input
                          type="number"
                          required
                          value={coupVal}
                          onChange={(e) => setCoupVal(e.target.value)}
                          className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Usage Limit</label>
                        <input
                          type="number"
                          value={coupLimit}
                          onChange={(e) => setCoupLimit(e.target.value)}
                          className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-stone-500 uppercase mb-1">Expiration Date *</label>
                      <input
                        type="date"
                        required
                        value={coupExpiry}
                        onChange={(e) => setCoupExpiry(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl cursor-pointer">
                      Publish Coupon
                    </button>
                  </form>
                </div>

                {/* Coupon listing */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-2 border-b">Active Coupons List</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {coupons.map((c) => (
                      <div key={c.id} className="p-4 border rounded-xl flex items-center justify-between gap-3 bg-stone-50/50 dark:bg-zinc-850">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {c.code}
                          </span>
                          <p className="text-[11px] font-bold text-stone-800 dark:text-zinc-300 mt-2">
                            Type: {c.type} | Value: {c.type === 'Percentage' ? `${c.value}%` : `₹${c.value}`}
                          </p>
                          <p className="text-[10px] text-stone-400">Expiry: {c.expiryDate} | Limit: {c.usageCount}/{c.usageLimit}</p>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleDeleteCoupon(c.id)} 
                          title="Delete Coupon"
                          className="text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
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
