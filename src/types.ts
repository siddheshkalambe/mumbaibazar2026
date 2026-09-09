export type UserRole = 'buyer' | 'seller' | 'admin' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  avatar?: string;
  address?: string;
  birthday?: string;
  gender?: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: string;
}

export type ProductStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Hidden' | 'Out of Stock';

export interface ProductReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  brand: string;
  sku: string;
  price: number;
  discount: number; // percentage
  stock: number;
  weight?: string;
  dimensions?: string;
  images: string[]; // URLs or Base64
  primaryImage: string;
  tags: string[];
  colors: string[];
  sizes: string[];
  specifications: { key: string; value: string }[];
  warranty?: string;
  returnPolicy?: string;
  status: ProductStatus;
  sellerId: string;
  sellerName: string;
  rating: number;
  reviews: ProductReview[];
  createdAt: string;
  rejectionReason?: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Accepted'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out For Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Rejected';

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  discount: number;
  quantity: number;
  image: string;
  sellerId: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  billingAddress: string;
  shippingAddress: string;
  phoneNumber: string;
  deliveryCharge: number;
  couponCode?: string;
  couponDiscount?: number;
  grandTotal: number;
  status: OrderStatus;
  paymentMethod: 'COD';
  timeline: { status: OrderStatus; timestamp: string; note: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  image: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'Percentage' | 'Flat';
  value: number;
  expiryDate: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface AppSettings {
  websiteName: string;
  logoText: string;
  commissionPercentage: number;
  shippingCharge: number;
  maintenanceMode: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface Notification {
  id: string;
  userId: string; // empty means broadcast to specific role or everyone
  targetRole?: UserRole;
  title: string;
  message: string;
  isRead: boolean;
  type: 'order' | 'product_approval' | 'product_rejection' | 'system';
  createdAt: string;
}
