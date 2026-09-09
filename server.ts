import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { 
  getUsers, getPasswords, getProducts, getOrders, getCategories, getCoupons, 
  getAuditLogs, getNotifications, getSettings, getRealtimeVisitors, addUser, 
  updateUser, updateUserPassword, addProduct, updateProduct, deleteProduct, 
  addOrder, updateOrder, addCategory, updateCategory, deleteCategory, 
  addCoupon, updateCoupon, deleteCoupon, addAuditLog, addNotification, updateSettings, 
  hashPassword, signToken, verifyToken, initMongoAndSync, initFirestoreAndSync
} from './src/server/db.js';
import { User, Product, Order, Category, Coupon, AuditLog, AppSettings, Notification, UserRole } from './src/types.js';

dotenv.config();

// Initialize MongoDB Connection if MONGODB_URI is provided
initMongoAndSync();

// Initialize Google Cloud Firestore if configuration exists
initFirestoreAndSync();

// Server initialization
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper to extract JWT user
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (payload) {
    const users = getUsers();
    const user = users.find(u => u.id === payload.id);
    if (user && !user.isBlocked) {
      req.user = user;
    } else {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

app.use(authenticate);

// Require Role Guard Middlewares
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized access. Please login first." });
  }
  next();
}

function requireRole(roles: UserRole[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized access. Please login first." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
}

// -------------------------------------------------------------
// Authentication APIs
// -------------------------------------------------------------

// POST login
app.post('/api/auth/login', (req, res) => {
  const { email, phone, emailOrPhone, password, username, role } = req.body;
  const users = getUsers();
  const passwords = getPasswords();

  let user: User | undefined;

  // Handle Super Admin special username login
  if (role === 'super_admin' || (username && username.toLowerCase() === 'siddhesh')) {
    user = users.find(u => u.role === 'super_admin' && u.username === 'Siddhesh');
    if (!user) {
      return res.status(400).json({ error: "Super Admin account not initialized properly." });
    }
    const hashed = hashPassword(password);
    if (passwords[user.id] !== hashed) {
      return res.status(400).json({ error: "Invalid Super Admin password." });
    }
  } else {
    // Normal email or phone login for Buyer, Seller, Admin
    const identifier = emailOrPhone || email || phone;
    if (!identifier || !password) {
      return res.status(400).json({ error: "Please enter email/phone and password." });
    }
    user = users.find(u => 
      u.email.toLowerCase() === identifier.toLowerCase() || 
      (u.phone && u.phone === identifier)
    );
    if (!user) {
      return res.status(400).json({ error: "No account found with this email or phone number." });
    }
    if (user.role !== role && role) {
      return res.status(400).json({ error: `Account found, but role is not ${role}.` });
    }
    const hashed = hashPassword(password);
    if (passwords[user.id] !== hashed) {
      return res.status(400).json({ error: "Incorrect password." });
    }
  }

  if (user.isBlocked) {
    return res.status(403).json({ error: "Your account is currently blocked by an administrator." });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  addAuditLog(user.id, user.name, user.role, "User Logged In", `Logged in successfully from IP: ${req.ip}`);

  res.json({ token, user });
});

// POST register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, phone, address } = req.body;
  
  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: "Please fill in all required fields (Name, Phone Number, Password)." });
  }

  if (!['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ error: "Invalid role selection. Choose Buyer or Seller." });
  }

  const users = getUsers();
  if (phone && users.some(u => u.phone && u.phone.trim() === phone.trim())) {
    return res.status(400).json({ error: "An account with this phone number already exists." });
  }

  if (email && email.trim() && users.some(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: "An account with this email address already exists." });
  }

  const newUser: User = {
    id: `user-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    name,
    email: email ? email.trim().toLowerCase() : "",
    phone: phone.trim(),
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    address: address || "",
    role: role as UserRole,
    isBlocked: false,
    createdAt: new Date().toISOString()
  };

  const hashedPW = hashPassword(password);
  addUser(newUser, hashedPW);
  addAuditLog(newUser.id, newUser.name, newUser.role, "User Registered", `Registered as a new ${role}.`);

  const token = signToken({ id: newUser.id, email: newUser.email, role: newUser.role });
  res.status(201).json({ token, user: newUser });
});

// POST Google Sign-In
app.post('/api/auth/google', (req, res) => {
  const { email, name, role, avatar, phone } = req.body;
  
  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Google account email is required." });
  }

  const selectedRole: UserRole = (role === 'seller' ? 'seller' : 'buyer');
  const targetEmail = email.trim().toLowerCase();
  const users = getUsers();
  
  let user = users.find(u => u.email && u.email.toLowerCase() === targetEmail);

  if (!user) {
    // Register new user authenticated via Google
    user = {
      id: `user-google-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      name: name || targetEmail.split('@')[0],
      email: targetEmail,
      phone: phone || "9876543210",
      avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || targetEmail)}`,
      address: "Mumbai, Maharashtra",
      role: selectedRole,
      isBlocked: false,
      createdAt: new Date().toISOString()
    };

    addUser(user, hashPassword(`google_auth_secret_${Date.now()}`));
    addAuditLog(user.id, user.name, user.role, "Google Account Created", `Created account via Google Auth (${targetEmail}).`);
  } else {
    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account is currently blocked by an administrator." });
    }
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  addAuditLog(user.id, user.name, user.role, "Google Sign-In", `Signed in using Google Auth (${user.email}).`);

  res.json({ token, user });
});

// GET current profile
app.get('/api/auth/me', requireAuth, (req: any, res) => {
  res.json(req.user);
});

// PUT update profile
app.put('/api/auth/profile', requireAuth, (req: any, res) => {
  const { name, phone, address, avatar, birthday, gender } = req.body;
  const updates: Partial<User> = {};
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (avatar !== undefined) updates.avatar = avatar;
  if (birthday !== undefined) updates.birthday = birthday;
  if (gender !== undefined) updates.gender = gender;

  updateUser(req.user.id, updates);
  addAuditLog(req.user.id, req.user.name, req.user.role, "Profile Updated", "Updated profile information.");
  
  const updatedUser = getUsers().find(u => u.id === req.user.id);
  res.json(updatedUser);
});

// PUT change password
app.put('/api/auth/change-password', requireAuth, (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  const passwords = getPasswords();
  
  if (passwords[req.user.id] !== hashPassword(currentPassword)) {
    return res.status(400).json({ error: "Current password does not match." });
  }

  updateUserPassword(req.user.id, hashPassword(newPassword));
  addAuditLog(req.user.id, req.user.name, req.user.role, "Password Changed", "Successfully changed account password.");
  res.json({ message: "Password updated successfully." });
});

// -------------------------------------------------------------
// Products APIs
// -------------------------------------------------------------

// GET products (Public / filtering)
app.get('/api/products', (req, res) => {
  const products = getProducts();
  const approved = products.filter(p => p.status === 'Approved');

  // Query filters
  const { search, category, minPrice, maxPrice, rating, sellerId, sort } = req.query;

  let filtered = approved;

  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(s) || 
      p.description.toLowerCase().includes(s) ||
      p.brand.toLowerCase().includes(s) ||
      p.sellerName.toLowerCase().includes(s) ||
      p.tags.some(t => t.toLowerCase().includes(s))
    );
  }

  if (category) {
    filtered = filtered.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
  }

  if (minPrice) {
    filtered = filtered.filter(p => p.price * (1 - p.discount/100) >= Number(minPrice));
  }

  if (maxPrice) {
    filtered = filtered.filter(p => p.price * (1 - p.discount/100) <= Number(maxPrice));
  }

  if (rating) {
    filtered = filtered.filter(p => p.rating >= Number(rating));
  }

  if (sellerId) {
    filtered = filtered.filter(p => p.sellerId === String(sellerId));
  }

  // Sort logic
  if (sort === 'Newest') {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === 'Oldest') {
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sort === 'priceAsc') {
    filtered.sort((a, b) => (a.price * (1 - a.discount/100)) - (b.price * (1 - b.discount/100)));
  } else if (sort === 'priceDesc') {
    filtered.sort((a, b) => (b.price * (1 - b.discount/100)) - (a.price * (1 - a.discount/100)));
  } else if (sort === 'ratingDesc') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  res.json(filtered);
});

// GET single product
app.get('/api/products/:id', (req, res) => {
  const products = getProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }
  res.json(product);
});

// GET all products (Admin & Seller view including draft, pending, rejected)
app.get('/api/products-all', requireAuth, (req: any, res) => {
  try {
    const products = getProducts() || [];
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized access. Please login first." });
    }
    if (req.user.role === 'seller') {
      // Only return products matching seller
      const sellerProducts = products.filter(p => p && p.sellerId === req.user.id);
      return res.json(sellerProducts);
    } else if (['admin', 'super_admin'].includes(req.user.role)) {
      return res.json(products);
    }
    return res.status(403).json({ error: "Unauthorized access." });
  } catch (err: any) {
    console.error("Error in GET /api/products-all:", err);
    return res.status(500).json({ error: "Server error fetching products." });
  }
});

// POST add product (Seller)
app.post('/api/products', requireRole(['seller', 'admin', 'super_admin']), (req: any, res) => {
  try {
    const { 
      title, description, category, subCategory, brand, sku, price, discount, 
      stock, weight, dimensions, images, primaryImage, tags, colors, sizes, specifications, 
      warranty, returnPolicy 
    } = req.body;

    if (!title || !category || price === undefined || price === null || stock === undefined || stock === null) {
      return res.status(400).json({ error: "Missing required product details (title, category, price, stock)." });
    }

    const validImages = Array.isArray(images) && images.length > 0 
      ? images 
      : [primaryImage || "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=60"];
    const validPrimary = primaryImage || validImages[0];

    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      title: String(title).trim(),
      description: description ? String(description) : "",
      category: String(category),
      subCategory: subCategory ? String(subCategory) : "",
      brand: brand ? String(brand) : "Generic",
      sku: sku ? String(sku) : `SKU-${Math.floor(Math.random()*1000000)}`,
      price: Number(price) || 0,
      discount: Number(discount || 0),
      stock: Number(stock) || 0,
      weight: weight ? String(weight) : "",
      dimensions: dimensions ? String(dimensions) : "",
      images: validImages,
      primaryImage: validPrimary,
      tags: Array.isArray(tags) ? tags : [],
      colors: Array.isArray(colors) ? colors : ["Default"],
      sizes: Array.isArray(sizes) ? sizes : ["Standard"],
      specifications: Array.isArray(specifications) ? specifications : [],
      warranty: warranty ? String(warranty) : "No warranty",
      returnPolicy: returnPolicy ? String(returnPolicy) : "No returns",
      status: req.user.role === 'seller' ? 'Pending' : 'Approved', // Admins bypass approvals
      sellerId: req.user.id,
      sellerName: req.user.name || "Seller",
      rating: 5.0,
      reviews: [],
      createdAt: new Date().toISOString()
    };

    addProduct(newProduct);
    addAuditLog(req.user.id, req.user.name, req.user.role, "Product Created", `Created product: ${title} (${newProduct.sku})`);
    
    if (req.user.role === 'seller') {
      // Notify Admins
      addNotification("", "admin", "New Product for Review", `${req.user.name} uploaded a new product: "${title}" awaiting approval.`, "product_approval");
    }

    return res.status(201).json(newProduct);
  } catch (err: any) {
    console.error("Error creating product:", err);
    return res.status(500).json({ error: "Internal server error creating product." });
  }
});

// PUT edit product
app.put('/api/products/:id', requireRole(['seller', 'admin', 'super_admin']), (req: any, res) => {
  try {
    const products = getProducts() || [];
    const product = products.find(p => p && p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    if (req.user.role === 'seller' && product.sellerId !== req.user.id) {
      return res.status(403).json({ error: "You do not own this product." });
    }

    const { 
      title, description, category, subCategory, brand, sku, price, discount, 
      stock, weight, dimensions, images, primaryImage, tags, colors, sizes, specifications, 
      warranty, returnPolicy, status 
    } = req.body;

    const updates: Partial<Product> = {};
    if (title) updates.title = String(title).trim();
    if (description !== undefined) updates.description = String(description);
    if (category) updates.category = String(category);
    if (subCategory !== undefined) updates.subCategory = String(subCategory);
    if (brand) updates.brand = String(brand);
    if (sku) updates.sku = String(sku);
    if (price !== undefined) updates.price = Number(price) || 0;
    if (discount !== undefined) updates.discount = Number(discount) || 0;
    if (stock !== undefined) updates.stock = Number(stock) || 0;
    if (weight !== undefined) updates.weight = String(weight);
    if (dimensions !== undefined) updates.dimensions = String(dimensions);
    if (Array.isArray(images) && images.length > 0) updates.images = images;
    if (primaryImage) updates.primaryImage = String(primaryImage);
    if (Array.isArray(tags)) updates.tags = tags;
    if (Array.isArray(colors)) updates.colors = colors;
    if (Array.isArray(sizes)) updates.sizes = sizes;
    if (Array.isArray(specifications)) updates.specifications = specifications;
    if (warranty !== undefined) updates.warranty = String(warranty);
    if (returnPolicy !== undefined) updates.returnPolicy = String(returnPolicy);

    // If a seller edits a product, it goes back into "Pending" review
    if (req.user.role === 'seller') {
      updates.status = 'Pending';
      addNotification("", "admin", "Product Edited & Resubmitted", `${req.user.name} edited "${product.title}" and needs review.`, "product_approval");
    } else if (status) {
      // Admin editing can directly change status
      updates.status = status;
    }

    updateProduct(product.id, updates);
    addAuditLog(req.user.id, req.user.name, req.user.role, "Product Edited", `Modified product: ${product.title}`);

    return res.json({ message: "Product updated successfully.", product: { ...product, ...updates } });
  } catch (err: any) {
    console.error("Error updating product:", err);
    return res.status(500).json({ error: "Internal server error updating product." });
  }
});

// DELETE delete product
app.delete('/api/products/:id', requireRole(['seller', 'admin', 'super_admin']), (req: any, res) => {
  try {
    const products = getProducts() || [];
    const product = products.find(p => p && p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    if (req.user.role === 'seller' && product.sellerId !== req.user.id) {
      return res.status(403).json({ error: "You are not authorized to delete this product." });
    }

    deleteProduct(product.id);
    addAuditLog(req.user.id, req.user.name, req.user.role, "Product Deleted", `Deleted product: ${product.title}`);
    return res.json({ message: "Product deleted successfully." });
  } catch (err: any) {
    console.error("Error deleting product:", err);
    return res.status(500).json({ error: "Internal server error deleting product." });
  }
});

// POST Approve product (Admin / Super Admin)
app.post('/api/products/:id/approve', requireRole(['admin', 'super_admin']), (req: any, res) => {
  const products = getProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  updateProduct(product.id, { status: 'Approved', rejectionReason: "" });
  addAuditLog(req.user.id, req.user.name, req.user.role, "Product Approved", `Approved product: ${product.title}`);
  
  // Notify Seller
  addNotification(product.sellerId, undefined, "Product Approved!", `Your product "${product.title}" has been approved and is now live!`, "product_approval");

  res.json({ message: "Product approved successfully." });
});

// POST Reject product (Admin / Super Admin)
app.post('/api/products/:id/reject', requireRole(['admin', 'super_admin']), (req: any, res) => {
  const { reason } = req.body;
  const products = getProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  updateProduct(product.id, { status: 'Rejected', rejectionReason: reason || "Does not meet guidelines" });
  addAuditLog(req.user.id, req.user.name, req.user.role, "Product Rejected", `Rejected product: ${product.title}. Reason: ${reason}`);

  // Notify Seller
  addNotification(product.sellerId, undefined, "Product Rejected", `Your product "${product.title}" was rejected. Reason: ${reason || "Does not meet our catalog quality criteria"}`, "product_rejection");

  res.json({ message: "Product rejected successfully." });
});

// POST review (Buyer)
app.post('/api/products/:id/reviews', requireRole(['buyer']), (req: any, res) => {
  const { rating, comment } = req.body;
  if (!rating || !comment) {
    return res.status(400).json({ error: "Rating and comment are required." });
  }

  const products = getProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  // Check if buyer already reviewed this product
  if (product.reviews.some(r => r.userId === req.user.id)) {
    return res.status(400).json({ error: "You have already reviewed this product." });
  }

  const newReview = {
    id: `rev-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    userId: req.user.id,
    userName: req.user.name,
    userAvatar: req.user.avatar,
    rating: Number(rating),
    comment,
    createdAt: new Date().toISOString()
  };

  const updatedReviews = [...product.reviews, newReview];
  const averageRating = parseFloat((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1));

  updateProduct(product.id, { 
    reviews: updatedReviews,
    rating: averageRating
  });

  res.status(201).json({ message: "Review posted successfully.", review: newReview, averageRating });
});

// DELETE review (Buyer or Admin)
app.delete('/api/products/:productId/reviews/:reviewId', requireAuth, (req: any, res) => {
  const { productId, reviewId } = req.params;
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  const reviewIndex = product.reviews.findIndex(r => r.id === reviewId);
  if (reviewIndex === -1) {
    return res.status(404).json({ error: "Review not found." });
  }

  const review = product.reviews[reviewIndex];

  // Permissions check: must be owner of review or admin/superadmin
  if (review.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: "Unauthorized to delete this review." });
  }

  const updatedReviews = product.reviews.filter(r => r.id !== reviewId);
  const averageRating = updatedReviews.length > 0 
    ? parseFloat((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1))
    : 5.0;

  updateProduct(product.id, {
    reviews: updatedReviews,
    rating: averageRating
  });

  addAuditLog(req.user.id, req.user.name, req.user.role, "Review Deleted", `Deleted review on product: ${product.title}`);
  res.json({ message: "Review deleted successfully.", averageRating });
});

// -------------------------------------------------------------
// Orders APIs
// -------------------------------------------------------------

// POST place order (Buyer)
app.post('/api/orders', requireRole(['buyer']), (req: any, res) => {
  const { items, billingAddress, shippingAddress, phoneNumber, deliveryCharge, couponCode, couponDiscount, grandTotal } = req.body;

  if (!items || items.length === 0 || !shippingAddress || !phoneNumber) {
    return res.status(400).json({ error: "Missing required checkout details." });
  }

  const products = getProducts();

  // Validate stock and deduct
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product "${item.title}" no longer exists.` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for "${item.title}". Only ${product.stock} available.` });
    }
  }

  // Deduct stock
  for (const item of items) {
    const product = products.find(p => p.id === item.productId)!;
    updateProduct(product.id, { stock: product.stock - item.quantity });
    
    // Check if stock is low (< 5) and trigger alert
    if (product.stock - item.quantity <= 5) {
      addNotification(product.sellerId, undefined, "Low Stock Warning ⚠️", `Your product "${product.title}" has low stock (${product.stock - item.quantity} left). Restock soon!`, "system");
    }
  }

  const systemSettings = getSettings();
  const configuredShippingFee = systemSettings?.shippingCharge ?? 50;
  const finalDeliveryCharge = (deliveryCharge !== undefined && deliveryCharge !== null && !isNaN(Number(deliveryCharge)))
    ? Number(deliveryCharge)
    : configuredShippingFee;

  const orderId = `ord-${1000 + getOrders().length + 1}`;
  const newOrder: Order = {
    id: orderId,
    buyerId: req.user.id,
    buyerName: req.user.name,
    buyerEmail: req.user.email,
    items,
    billingAddress: billingAddress || shippingAddress,
    shippingAddress,
    phoneNumber,
    deliveryCharge: finalDeliveryCharge,
    couponCode,
    couponDiscount: Number(couponDiscount || 0),
    grandTotal: Number(grandTotal),
    status: 'Pending',
    paymentMethod: 'COD',
    timeline: [
      { status: 'Pending', timestamp: new Date().toISOString(), note: `Order placed successfully (Cash on Delivery mode selected)` }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  addOrder(newOrder);

  // Notify Sellers involved in the order
  const sellerIds = Array.from(new Set(items.map((i: any) => i.sellerId)));
  sellerIds.forEach((sid: any) => {
    addNotification(sid, undefined, "New Order Received 📦", `You have a new order: ${orderId} for ₹${grandTotal}. Click to view details.`, "order");
  });

  // Notify Admins
  addNotification("", "admin", "New COD Order Placed", `Order ${orderId} was placed by ${req.user.name} for ₹${grandTotal}.`, "order");

  addAuditLog(req.user.id, req.user.name, req.user.role, "Order Placed", `Placed Cash on Delivery order: ${orderId}`);

  res.status(201).json(newOrder);
});

// GET orders
app.get('/api/orders', requireAuth, (req: any, res) => {
  const orders = getOrders();
  if (req.user.role === 'buyer') {
    const buyerOrders = orders.filter(o => o.buyerId === req.user.id);
    return res.json(buyerOrders);
  } else if (req.user.role === 'seller') {
    // Filter orders containing items owned by this seller
    const sellerOrders = orders.filter(o => o.items.some(item => item.sellerId === req.user.id))
      .map(o => {
        // Only return items matching this seller to prevent revealing other vendors' data
        const sellerItems = o.items.filter(item => item.sellerId === req.user.id);
        const sellerTotal = sellerItems.reduce((sum, item) => {
          const discountPrice = item.price * (1 - item.discount / 100);
          return sum + (discountPrice * item.quantity);
        }, 0);
        return {
          ...o,
          items: sellerItems,
          grandTotal: sellerTotal + (o.deliveryCharge / o.items.length) // partial delivery split
        };
      });
    return res.json(sellerOrders);
  } else if (['admin', 'super_admin'].includes(req.user.role)) {
    return res.json(orders);
  }
  res.json([]);
});

// PUT update order status
app.put('/api/orders/:id/status', requireAuth, (req: any, res) => {
  const { status, note } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Status value is required." });
  }

  const orders = getOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  // Authorization check
  const isSeller = req.user.role === 'seller';
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  
  if (isSeller && !order.items.some(item => item.sellerId === req.user.id)) {
    return res.status(403).json({ error: "Unauthorized. Order does not belong to your store." });
  }
  if (!isSeller && !isAdmin) {
    return res.status(403).json({ error: "Unauthorized order state modification." });
  }

  const updatedTimeline = [
    ...order.timeline,
    { status, timestamp: new Date().toISOString(), note: note || `Order status updated to ${status} by ${req.user.name}` }
  ];

  updateOrder(order.id, { 
    status,
    timeline: updatedTimeline
  });

  // Notify buyer of status update
  addNotification(order.buyerId, undefined, `Order Status: ${status} 🚚`, `Your order ${order.id} status is now "${status}".`, "order");

  addAuditLog(req.user.id, req.user.name, req.user.role, "Order Status Updated", `Updated order ${order.id} status to ${status}`);

  res.json({ message: "Order updated successfully.", status, timeline: updatedTimeline });
});

// -------------------------------------------------------------
// Category APIs (Admin / Super Admin / Public)
// -------------------------------------------------------------
app.get('/api/categories', (req, res) => {
  res.json(getCategories());
});

app.post('/api/categories', requireRole(['admin', 'super_admin']), (req: any, res) => {
  const { name, image } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required." });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const categories = getCategories();
  if (categories.some(c => c.slug === slug)) {
    return res.status(400).json({ error: "Category already exists." });
  }

  const newCategory: Category = {
    id: `cat-${Date.now()}`,
    name,
    slug,
    isActive: true,
    image: image || "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=60",
    createdAt: new Date().toISOString()
  };

  addCategory(newCategory);
  addAuditLog(req.user.id, req.user.name, req.user.role, "Category Created", `Created category: ${name}`);
  res.status(201).json(newCategory);
});

app.put('/api/categories/:id', requireRole(['admin', 'super_admin']), (req: any, res) => {
  const { name, isActive, image } = req.body;
  const updates: Partial<Category> = {};
  if (name) {
    updates.name = name;
    updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  if (isActive !== undefined) updates.isActive = isActive;
  if (image !== undefined) updates.image = image;

  updateCategory(req.params.id, updates);
  addAuditLog(req.user.id, req.user.name, req.user.role, "Category Updated", `Updated category: ${req.params.id}`);
  res.json({ message: "Category updated successfully." });
});

app.delete('/api/categories/:id', requireRole(['admin', 'super_admin']), (req: any, res) => {
  deleteCategory(req.params.id);
  addAuditLog(req.user.id, req.user.name, req.user.role, "Category Deleted", `Deleted category: ${req.params.id}`);
  res.json({ message: "Category deleted." });
});

// -------------------------------------------------------------
// Coupon APIs
// -------------------------------------------------------------
app.get('/api/coupons/active', (req, res) => {
  const coupons = getCoupons();
  const today = new Date().toISOString().split('T')[0];
  const activeCoupons = coupons.filter(c => c.isActive && c.expiryDate >= today && c.usageCount < c.usageLimit);
  res.json(activeCoupons);
});

app.get('/api/coupons', requireAuth, (req, res) => {
  res.json(getCoupons());
});

app.get('/api/coupons/validate/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const coupons = getCoupons();
  const coupon = coupons.find(c => c.code === code && c.isActive);

  if (!coupon) {
    return res.status(404).json({ error: "Coupon code is invalid or inactive." });
  }

  const today = new Date().toISOString().split('T')[0];
  if (coupon.expiryDate < today) {
    return res.status(400).json({ error: "This coupon code has expired." });
  }

  if (coupon.usageCount >= coupon.usageLimit) {
    return res.status(400).json({ error: "This coupon's usage limit has been exceeded." });
  }

  res.json(coupon);
});

app.post('/api/coupons', requireRole(['admin', 'super_admin']), (req: any, res) => {
  const { code, type, value, expiryDate, usageLimit } = req.body;
  if (!code || !type || !value || !expiryDate) {
    return res.status(400).json({ error: "Missing coupon parameters." });
  }

  const coupons = getCoupons();
  if (coupons.some(c => c.code === code.toUpperCase())) {
    return res.status(400).json({ error: "Coupon code already exists." });
  }

  const newCoupon: Coupon = {
    id: `coup-${Date.now()}`,
    code: code.toUpperCase(),
    type,
    value: Number(value),
    expiryDate,
    usageLimit: Number(usageLimit || 100),
    usageCount: 0,
    isActive: true
  };

  addCoupon(newCoupon);
  addAuditLog(req.user.id, req.user.name, req.user.role, "Coupon Created", `Created coupon code: ${newCoupon.code}`);
  res.status(201).json(newCoupon);
});

app.put('/api/coupons/:id', requireRole(['admin', 'super_admin']), (req: any, res) => {
  const { isActive, value, expiryDate, usageLimit } = req.body;
  const updates: Partial<Coupon> = {};
  if (isActive !== undefined) updates.isActive = isActive;
  if (value !== undefined) updates.value = Number(value);
  if (expiryDate !== undefined) updates.expiryDate = expiryDate;
  if (usageLimit !== undefined) updates.usageLimit = Number(usageLimit);

  updateCoupon(req.params.id, updates);
  addAuditLog(req.user.id, req.user.name, req.user.role, "Coupon Updated", `Modified coupon ${req.params.id}`);
  res.json({ message: "Coupon updated successfully." });
});

app.delete('/api/coupons/:id', requireRole(['admin', 'super_admin']), (req: any, res) => {
  deleteCoupon(req.params.id);
  addAuditLog(req.user.id, req.user.name, req.user.role, "Coupon Deleted", `Deleted coupon: ${req.params.id}`);
  res.json({ message: "Coupon deleted successfully." });
});

// -------------------------------------------------------------
// Settings APIs
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

app.put('/api/settings', requireRole(['super_admin']), (req: any, res) => {
  updateSettings(req.body);
  addAuditLog(req.user.id, req.user.name, req.user.role, "System Settings Updated", "Updated global portal configuration.");
  res.json({ message: "System settings updated successfully.", settings: getSettings() });
});

// -------------------------------------------------------------
// Admin / Super Admin User Management APIs
// -------------------------------------------------------------
app.get('/api/admin/users', requireRole(['admin', 'super_admin']), (req, res) => {
  const users = getUsers();
  res.json(users);
});

app.put('/api/admin/users/:id/block', requireRole(['admin', 'super_admin']), (req: any, res) => {
  const { isBlocked } = req.body;
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role === 'super_admin') {
    return res.status(400).json({ error: "Cannot block/unblock Super Admin." });
  }

  updateUser(user.id, { isBlocked });
  addAuditLog(req.user.id, req.user.name, req.user.role, isBlocked ? "User Blocked" : "User Unblocked", `Changed block status of user: ${user.name}`);
  res.json({ message: `User successfully ${isBlocked ? 'blocked' : 'unblocked'}.` });
});

app.put('/api/admin/users/:id/reset-password', requireRole(['admin', 'super_admin']), (req: any, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: "New password is required." });
  
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  updateUserPassword(user.id, hashPassword(newPassword));
  addAuditLog(req.user.id, req.user.name, req.user.role, "User Password Reset", `Forced password reset for user: ${user.name}`);
  res.json({ message: "User password reset successfully." });
});

app.delete('/api/admin/users/:id', requireRole(['super_admin']), async (req: any, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role === 'super_admin') return res.status(400).json({ error: "Cannot delete super admin." });

  // Filter out user from memory DB (and passwords list)
  // To keep db helper simple, let's update db users directly:
  const dbModule = await import('./src/server/db.js');
  // Or we can just block them or delete them directly. Since db users are stored in memory/file, let's delete
  // Actually, we can implement user deletion inside db helper easily, but let's just use block as soft delete
  // or simple array splice. Let's write simple splice since we are in server.ts:
  // db.users = db.users.filter(u => u.id !== req.params.id);
  // To make it persistent, we can do:
  updateUser(user.id, { isBlocked: true }); // standard soft-delete
  addAuditLog(req.user.id, req.user.name, req.user.role, "User Deleted", `Soft-deleted user account: ${user.name}`);
  res.json({ message: "User account soft-deleted/disabled successfully." });
});

// Admin Creation (Super Admin Only)
app.post('/api/admin/create-admin', requireRole(['super_admin']), (req: any, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required admin parameters." });
  }

  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already exists." });
  }

  const newAdmin: User = {
    id: `user-admin-${Date.now()}`,
    name,
    email: email.toLowerCase(),
    phone: phone || "",
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    role: "admin",
    isBlocked: false,
    createdAt: new Date().toISOString()
  };

  addUser(newAdmin, hashPassword(password));
  addAuditLog(req.user.id, req.user.name, req.user.role, "Admin Created", `Created new Administrator: ${name} (${email})`);
  res.status(201).json(newAdmin);
});

// -------------------------------------------------------------
// Audit Logs APIs
// -------------------------------------------------------------
app.get('/api/admin/logs', requireRole(['admin', 'super_admin']), (req, res) => {
  res.json(getAuditLogs());
});

// -------------------------------------------------------------
// Notifications APIs
// -------------------------------------------------------------
app.get('/api/notifications', requireAuth, (req: any, res) => {
  const notifs = getNotifications();
  // Return user-specific or role broadcast notifications
  const filtered = notifs.filter(n => {
    if (n.userId === req.user.id) return true;
    if (n.targetRole === req.user.role && n.userId === "") return true;
    return false;
  });
  res.json(filtered);
});

app.put('/api/notifications/mark-read', requireAuth, async (req: any, res) => {
  const notifs = getNotifications();
  notifs.forEach(n => {
    if (n.userId === req.user.id || (n.targetRole === req.user.role && n.userId === "")) {
      n.isRead = true;
    }
  });
  // Since db works with memory reference, saving database persists this
  const { saveDatabase: saveDB } = await import('./src/server/db.js');
  saveDB();
  res.json({ message: "Notifications marked as read." });
});

// -------------------------------------------------------------
// Analytics & Dashboards APIs
// -------------------------------------------------------------
app.get('/api/analytics/dashboard', requireAuth, (req: any, res) => {
  const products = getProducts();
  const orders = getOrders();
  const users = getUsers();
  const settings = getSettings();
  const visitors = getRealtimeVisitors();

  // Basic platform calculations
  const totalProductsCount = products.length;
  const approvedProductsCount = products.filter(p => p.status === 'Approved').length;
  const pendingProductsCount = products.filter(p => p.status === 'Pending').length;
  const rejectedProductsCount = products.filter(p => p.status === 'Rejected').length;

  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalCommission = totalRevenue * (settings.commissionPercentage / 100);

  // Sales trend chart data (last 7 days)
  const salesHistory = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayString = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toISOString().split('T')[0];
    
    const dayOrders = orders.filter(o => o.createdAt.startsWith(dateStr));
    const dayRevenue = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const daySalesCount = dayOrders.length;
    
    salesHistory.push({
      day: dayString,
      date: dateStr,
      revenue: dayRevenue,
      sales: daySalesCount,
      commission: dayRevenue * (settings.commissionPercentage / 100)
    });
  }

  // Seller specific filters
  if (req.user.role === 'seller') {
    const sellerProducts = products.filter(p => p.sellerId === req.user.id);
    const sellerOrders = orders.filter(o => o.items.some(i => i.sellerId === req.user.id));
    const sellerDeliveredOrders = sellerOrders.filter(o => o.status === 'Delivered');

    const sellerRevenue = sellerDeliveredOrders.reduce((sum, o) => {
      // Deduct commission from delivery
      const matchingItems = o.items.filter(i => i.sellerId === req.user.id);
      const subtotal = matchingItems.reduce((sum2, item) => sum2 + (item.price * (1 - item.discount/100) * item.quantity), 0);
      return sum + subtotal;
    }, 0);

    const netEarnings = sellerRevenue * (1 - settings.commissionPercentage / 100);
    const commissionPaid = sellerRevenue * (settings.commissionPercentage / 100);

    return res.json({
      role: 'seller',
      stats: {
        totalProducts: sellerProducts.length,
        approvedProducts: sellerProducts.filter(p => p.status === 'Approved').length,
        pendingProducts: sellerProducts.filter(p => p.status === 'Pending').length,
        rejectedProducts: sellerProducts.filter(p => p.status === 'Rejected').length,
        totalOrders: sellerOrders.length,
        pendingOrders: sellerOrders.filter(o => o.status === 'Pending' || o.status === 'Accepted' || o.status === 'Processing').length,
        revenue: sellerRevenue,
        netEarnings,
        commissionPaid,
        todaySales: sellerOrders.filter(o => o.createdAt.startsWith(new Date().toISOString().split('T')[0])).reduce((sum, o) => {
          const matchingItems = o.items.filter(i => i.sellerId === req.user.id);
          return sum + matchingItems.reduce((sum2, item) => sum2 + (item.price * (1 - item.discount/100) * item.quantity), 0);
        }, 0)
      },
      salesHistory
    });
  }

  // Admin / Super Admin General View
  res.json({
    role: req.user.role,
    stats: {
      totalUsers: users.length,
      buyers: users.filter(u => u.role === 'buyer').length,
      sellers: users.filter(u => u.role === 'seller').length,
      admins: users.filter(u => u.role === 'admin').length,
      totalProducts: totalProductsCount,
      approvedProducts: approvedProductsCount,
      pendingProducts: pendingProductsCount,
      rejectedProducts: rejectedProductsCount,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'Pending').length,
      deliveredOrders: deliveredOrders.length,
      totalRevenue,
      commissionEarned: totalCommission,
      realtimeVisitors: visitors
    },
    topProducts: products.slice(0, 5).map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      price: p.price,
      stock: p.stock,
      salesCount: orders.filter(o => o.items.some(i => i.productId === p.id)).length
    })).sort((a,b) => b.salesCount - a.salesCount),
    salesHistory
  });
});

// -------------------------------------------------------------
// Vite Dev Server / Production SPA Fallback Routing
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Developer Mode - Integrate Vite programmatically as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode - Serve static files from /dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA Fallback: Any unhandled routes serve index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Node Server on port 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mumbai Bazar] Full-Stack Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
