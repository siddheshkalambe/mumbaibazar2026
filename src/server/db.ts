import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, query, limit } from 'firebase/firestore';
import { 
  User, Product, Order, Category, Coupon, AuditLog, AppSettings, Notification, UserRole
} from '../types.js';

const DB_FILE = path.resolve('./mumbai_bazar_db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'mumbai_bazar_secret_key_123_abc_xyz';

// Firebase Firestore references
let isFirestoreConnected = false;
let isFirestoreConnecting = false;
let firestoreDb: any = null;
let firebaseApp: any = null;

// MongoDB client and state references
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnecting = false;
let isMongoConnected = false;

// Native SHA256 Password Hashing with Salts
export function hashPassword(password: string, salt: string = 'mumbai_salt_99'): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Zero-Dependency JWT implementation using Node's crypto
function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString();
}

export function signToken(payload: any): string {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const payloadStr = JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) });
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payloadStr);
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(encodedHeader + '.' + encodedPayload)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
      .update(header + '.' + payload)
      .digest('base64url');
    if (signature !== expectedSignature) return null;
    return JSON.parse(base64UrlDecode(payload));
  } catch (e) {
    return null;
  }
}

// Initial Core Data Seeds
const DEFAULT_SETTINGS: AppSettings = {
  websiteName: "Mumbai Bazar",
  logoText: "Mumbai Bazar 🏬",
  commissionPercentage: 10,
  shippingCharge: 50,
  maintenanceMode: false,
  emailNotifications: true,
  smsNotifications: false,
};

const INITIAL_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Fashion & Apparel", slug: "fashion-apparel", isActive: true, image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=60", createdAt: new Date().toISOString() },
  { id: "cat-2", name: "Electronics & Gadgets", slug: "electronics-gadgets", isActive: true, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60", createdAt: new Date().toISOString() },
  { id: "cat-3", name: "Mumbai Specialities", slug: "mumbai-specialities", isActive: true, image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=60", createdAt: new Date().toISOString() },
  { id: "cat-4", name: "Home & Kitchen", slug: "home-kitchen", isActive: true, image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=60", createdAt: new Date().toISOString() },
  { id: "cat-5", name: "Beauty & Wellness", slug: "beauty-wellness", isActive: true, image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=60", createdAt: new Date().toISOString() }
];

const INITIAL_COUPONS: Coupon[] = [
  { id: "coup-1", code: "MUMBAI20", type: "Percentage", value: 20, expiryDate: "2027-12-31", usageLimit: 100, usageCount: 5, isActive: true },
  { id: "coup-2", code: "FLAT100", type: "Flat", value: 100, expiryDate: "2027-12-31", usageLimit: 50, usageCount: 2, isActive: true }
];

const INITIAL_USERS: User[] = [
  {
    id: "user-superadmin",
    name: "Siddhesh Kalambe",
    email: "siddheshkalambe12@gmail.com",
    username: "Siddhesh",
    phone: "9876543210",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    address: "Bandra West, Mumbai, MH - 400050",
    role: "super_admin",
    isBlocked: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-admin",
    name: "Rajesh Kumar",
    email: "admin@mumbaibazar.com",
    phone: "9876543211",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    address: "Andheri East, Mumbai, MH - 400069",
    role: "admin",
    isBlocked: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-seller",
    name: "Mumbai Masala Co.",
    email: "seller@mumbaibazar.com",
    phone: "9876543212",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    address: "Crawford Market, Fort, Mumbai, MH - 400001",
    role: "seller",
    isBlocked: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-seller2",
    name: "Bombay Apparel Studio",
    email: "apparel@mumbaibazar.com",
    phone: "9876543213",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
    address: "Dadar Market, Mumbai, MH - 400014",
    role: "seller",
    isBlocked: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-buyer",
    name: "Amit Patel",
    email: "buyer@mumbaibazar.com",
    phone: "9876543214",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    address: "Colaba Causeway, South Mumbai, MH - 400005",
    role: "buyer",
    isBlocked: false,
    createdAt: new Date().toISOString()
  }
];

// Preseed User Passwords
const PASSWORDS_MAP: Record<string, string> = {
  "user-superadmin": hashPassword("Siddhesh123"),
  "user-admin": hashPassword("password"),
  "user-seller": hashPassword("password"),
  "user-seller2": hashPassword("password"),
  "user-buyer": hashPassword("password")
};

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    title: "Mumbai Special Masala Chai Blend",
    description: "Authentic, aromatic, and rich tea masala blended with cardamom, ginger, cloves, and black pepper. Perfect for preparing traditional Mumbai-style cutting chai at home.",
    category: "Mumbai Specialities",
    brand: "Mumbai Masala Co.",
    sku: "MUM-CHAI-250G",
    price: 250,
    discount: 10,
    stock: 120,
    weight: "250g",
    dimensions: "10 x 5 x 15 cm",
    images: [
      "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80"
    ],
    primaryImage: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80",
    tags: ["chai", "masala", "cutting chai", "tea", "mumbai special"],
    colors: ["Default"],
    sizes: ["250g Pack", "500g Pack"],
    specifications: [
      { key: "Ingredients", value: "Cardamom, Cinnamon, Black Pepper, Ginger, Nutmeg" },
      { key: "Shelf Life", value: "12 Months" },
      { key: "Container", value: "Airtight Resealable Pouch" }
    ],
    warranty: "No Warranty",
    returnPolicy: "Non-returnable (Food item)",
    status: "Approved",
    sellerId: "user-seller",
    sellerName: "Mumbai Masala Co.",
    rating: 4.8,
    reviews: [
      {
        id: "rev-1",
        userId: "user-buyer",
        userName: "Amit Patel",
        userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        rating: 5,
        comment: "Absolutely delightful taste! Tastes exactly like the tapri cutting chai near CST station.",
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "prod-2",
    title: "Premium Ratnagiri Alphonso Mangoes (Box of 6)",
    description: "Directly sourced from the orchards of Ratnagiri, these premium Hapus mangoes are naturally ripened, extremely sweet, pulpy, and aromatic. The king of fruits!",
    category: "Mumbai Specialities",
    brand: "Konkan Farms",
    sku: "KNP-ALPH-06",
    price: 799,
    discount: 5,
    stock: 45,
    weight: "1.8 kg",
    dimensions: "30 x 20 x 10 cm",
    images: [
      "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=600&auto=format&fit=crop&q=80"
    ],
    primaryImage: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80",
    tags: ["mango", "alphonso", "hapus", "fruits", "mumbai special"],
    colors: ["Yellow"],
    sizes: ["6 Pieces Box"],
    specifications: [
      { key: "Origin", value: "Ratnagiri, Maharashtra" },
      { key: "Type", value: "Naturally Ripened" },
      { key: "Grade", value: "A+ Premium Large" }
    ],
    warranty: "Quality Guarante",
    returnPolicy: "Replacement on transit damage",
    status: "Approved",
    sellerId: "user-seller",
    sellerName: "Mumbai Masala Co.",
    rating: 4.5,
    reviews: [],
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "prod-3",
    title: "Traditional Maharashtrian Paithani Silk Saree",
    description: "A gorgeous, hand-woven pure silk Paithani Saree featuring a spectacular peacock motif border and a rich golden pallu. Ideal for weddings, festivals, and traditional Maharashtrian functions.",
    category: "Fashion & Apparel",
    brand: "Maharashtrian Weaves",
    sku: "APP-PAI-SAREE",
    price: 4500,
    discount: 15,
    stock: 12,
    weight: "800g",
    dimensions: "40 x 30 x 5 cm",
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80"
    ],
    primaryImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80",
    tags: ["saree", "silk", "paithani", "traditional", "clothing", "womens wear"],
    colors: ["Royal Blue", "Maroon Red", "Emerald Green"],
    sizes: ["Free Size (with Blouse Piece)"],
    specifications: [
      { key: "Fabric", value: "Pure Mulberry Silk" },
      { key: "Weave", value: "Handloom Yeola Style" },
      { key: "Zari Type", value: "Tested Gold Zari" }
    ],
    warranty: "Authentic Handloom Certified",
    returnPolicy: "7 Days Easy Return",
    status: "Approved",
    sellerId: "user-seller2",
    sellerName: "Bombay Apparel Studio",
    rating: 4.9,
    reviews: [
      {
        id: "rev-2",
        userId: "user-buyer",
        userName: "Amit Patel",
        userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        rating: 5,
        comment: "Bought this for my wife, she loved it! The pure silk feel and the peacock border shine is magnificent.",
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "prod-4",
    title: "Mumbai Local Train Canvas Wall Art",
    description: "An elegant, high-definition monochrome canvas frame depicting the iconic Mumbai local train with its timeless vintage appeal. Perfect for home or office living room decor.",
    category: "Home & Kitchen",
    brand: "Bombay Arts Club",
    sku: "HOM-CANV-TRAIN",
    price: 1199,
    discount: 20,
    stock: 25,
    weight: "1.2 kg",
    dimensions: "60 x 40 x 3 cm",
    images: [
      "https://images.unsplash.com/photo-1568849676085-51415703900f?w=600&auto=format&fit=crop&q=80"
    ],
    primaryImage: "https://images.unsplash.com/photo-1568849676085-51415703900f?w=600&auto=format&fit=crop&q=80",
    tags: ["canvas", "wall art", "local train", "decor", "home styling", "mumbai style"],
    colors: ["Black and White"],
    sizes: ["12x18 Inches", "16x24 Inches"],
    specifications: [
      { key: "Frame Material", value: "Sturdy Synthetic Wood" },
      { key: "Canvas Type", value: "Premium Matte Texture" },
      { key: "Hanging Hooks", value: "Pre-installed Metal Hooks" }
    ],
    warranty: "1 Year Fade Warranty",
    returnPolicy: "7 Days Replacement on Damage",
    status: "Approved",
    sellerId: "user-seller2",
    sellerName: "Bombay Apparel Studio",
    rating: 4.7,
    reviews: [],
    createdAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "prod-5",
    title: "SoundBlast Pro Wireless Neckband Earbuds",
    description: "Unmatched Bass, crystal-clear sound, and industry-leading 40 hours of battery life. Comes with Active Noise Cancellation (ANC) up to 25dB, IPX5 water resistance, and lightning-fast charging.",
    category: "Electronics & Gadgets",
    brand: "SoundBlast",
    sku: "ELC-NECK-SBP",
    price: 1499,
    discount: 30,
    stock: 80,
    weight: "45g",
    dimensions: "15 x 12 x 2 cm",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"
    ],
    primaryImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    tags: ["earphones", "bluetooth", "neckband", "anc", "electronics"],
    colors: ["Matte Black", "Ocean Blue"],
    sizes: ["Standard"],
    specifications: [
      { key: "Battery Life", value: "40 Hours Playback" },
      { key: "Water Resistance", value: "IPX5 Sweatproof" },
      { key: "Bluetooth Version", value: "v5.3 Low Latency" }
    ],
    warranty: "1 Year Brand Warranty",
    returnPolicy: "7 Days Refund Policy",
    status: "Approved",
    sellerId: "user-seller",
    sellerName: "Mumbai Masala Co.",
    rating: 4.6,
    reviews: [],
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-1001",
    buyerId: "user-buyer",
    buyerName: "Amit Patel",
    buyerEmail: "buyer@mumbaibazar.com",
    items: [
      {
        productId: "prod-1",
        title: "Mumbai Special Masala Chai Blend",
        price: 250,
        discount: 10,
        quantity: 2,
        image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80",
        sellerId: "user-seller"
      },
      {
        productId: "prod-5",
        title: "SoundBlast Pro Wireless Neckband Earbuds",
        price: 1499,
        discount: 30,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
        sellerId: "user-seller"
      }
    ],
    billingAddress: "Colaba Causeway, South Mumbai, MH - 400005",
    shippingAddress: "Colaba Causeway, South Mumbai, MH - 400005",
    phoneNumber: "9876543214",
    deliveryCharge: 50,
    couponCode: "MUMBAI20",
    couponDiscount: 299.8, // 20% on total (225*2 + 1049.3 = 1499.3 -> 20% is ~300)
    grandTotal: 1249,
    status: "Processing",
    paymentMethod: "COD",
    timeline: [
      { status: "Pending", timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), note: "Order placed successfully by Amit Patel (COD Mode)" },
      { status: "Accepted", timestamp: new Date(Date.now() - 32 * 3600 * 1000).toISOString(), note: "Order verified and accepted by Mumbai Masala Co." },
      { status: "Processing", timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), note: "Order items are being packed inCrawford Market warehouse" }
    ],
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

const INITIAL_LOGS: AuditLog[] = [
  {
    id: "log-1",
    userId: "user-superadmin",
    userName: "Siddhesh Kalambe",
    userRole: "super_admin",
    action: "System Initialized",
    details: "Mumbai Bazar engine and persistent data layers bootstrapped successfully.",
    ipAddress: "127.0.0.1",
    timestamp: new Date().toISOString()
  }
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    userId: "",
    targetRole: "seller",
    title: "Welcome to Mumbai Bazar!",
    message: "Welcome to the Mumbai Bazar multi-vendor marketplace. Add your catalog items and wait for admin approval.",
    isRead: false,
    type: "system",
    createdAt: new Date().toISOString()
  }
];

// Complete Database Schema Shape
export interface Database {
  users: User[];
  passwords: Record<string, string>; // userId -> hashedPW
  products: Product[];
  orders: Order[];
  categories: Category[];
  coupons: Coupon[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  settings: AppSettings;
  realtimeVisitors: number;
}

// Memory Database Instance
let db: Database = {
  users: INITIAL_USERS,
  passwords: PASSWORDS_MAP,
  products: INITIAL_PRODUCTS,
  orders: INITIAL_ORDERS,
  categories: INITIAL_CATEGORIES,
  coupons: INITIAL_COUPONS,
  auditLogs: INITIAL_LOGS,
  notifications: INITIAL_NOTIFICATIONS,
  settings: DEFAULT_SETTINGS,
  realtimeVisitors: 15
};

// -------------------------------------------------------------
// MongoDB Integration & Synchronization Helpers
// -------------------------------------------------------------

export async function initMongoAndSync() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("[MongoDB Setup] MONGODB_URI environment variable is not defined. Using local file-system JSON database storage.");
    return;
  }
  
  if (mongoClient || isMongoConnecting) return;
  
  isMongoConnecting = true;
  console.log("[MongoDB Setup] Connecting to MongoDB Cluster...");
  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    // Default to 'mumbai_bazar' if not specified in URI string
    mongoDb = mongoClient.db();
    isMongoConnected = true;
    isMongoConnecting = false;
    console.log("[MongoDB Setup] Successfully connected to MongoDB Database!");
    
    // Perform initial synchronization
    await syncFromMongo();
  } catch (err) {
    console.error("[MongoDB Setup] Error establishing MongoDB connection:", err);
    isMongoConnecting = false;
  }
}

async function syncFromMongo() {
  if (!mongoDb) return;
  
  try {
    console.log("[MongoDB Sync] Synchronizing schemas and records from MongoDB...");
    
    const collections = [
      { name: 'users', key: 'users', defaultData: INITIAL_USERS },
      { name: 'products', key: 'products', defaultData: INITIAL_PRODUCTS },
      { name: 'orders', key: 'orders', defaultData: INITIAL_ORDERS },
      { name: 'categories', key: 'categories', defaultData: INITIAL_CATEGORIES },
      { name: 'coupons', key: 'coupons', defaultData: INITIAL_COUPONS },
      { name: 'auditLogs', key: 'auditLogs', defaultData: INITIAL_LOGS },
      { name: 'notifications', key: 'notifications', defaultData: INITIAL_NOTIFICATIONS },
    ];
    
    // 1. Core tables
    for (const col of collections) {
      const dbCollection = mongoDb.collection(col.name);
      const count = await dbCollection.countDocuments();
      if (count === 0) {
        console.log(`[MongoDB Sync] Seeding collection '${col.name}' to MongoDB Atlas...`);
        const currentData = (db as any)[col.key] && (db as any)[col.key].length > 0 
          ? (db as any)[col.key] 
          : col.defaultData;
        
        if (currentData.length > 0) {
          const cleanDocs = currentData.map((doc: any) => {
            const { _id, ...rest } = doc;
            return rest;
          });
          await dbCollection.insertMany(cleanDocs);
        }
      } else {
        console.log(`[MongoDB Sync] Downloading collection '${col.name}' from MongoDB...`);
        const docs = await dbCollection.find({}).toArray();
        (db as any)[col.key] = docs.map((doc: any) => {
          const { _id, ...rest } = doc;
          return rest;
        });
      }
    }
    
    // 2. User passwords authentication credentials
    const passwordsCol = mongoDb.collection('passwords');
    const passwordsCount = await passwordsCol.countDocuments();
    if (passwordsCount === 0) {
      console.log("[MongoDB Sync] Seeding user password hashes...");
      const currentPasswords = Object.keys(db.passwords).length > 0 ? db.passwords : PASSWORDS_MAP;
      const passDocs = Object.entries(currentPasswords).map(([userId, hash]) => ({ userId, hash }));
      if (passDocs.length > 0) {
        await passwordsCol.insertMany(passDocs);
      }
    } else {
      console.log("[MongoDB Sync] Downloading user password hashes...");
      const docs = await passwordsCol.find({}).toArray();
      const loadedPasswords: Record<string, string> = {};
      docs.forEach((doc: any) => {
        loadedPasswords[doc.userId] = doc.hash;
      });
      db.passwords = loadedPasswords;
    }
    
    // 3. Global AppSettings
    const settingsCol = mongoDb.collection('settings');
    const settingsCount = await settingsCol.countDocuments();
    if (settingsCount === 0) {
      console.log("[MongoDB Sync] Seeding global website settings...");
      await settingsCol.insertOne({ ...db.settings });
    } else {
      console.log("[MongoDB Sync] Downloading global website settings...");
      const doc = await settingsCol.findOne({});
      if (doc) {
        const { _id, ...cleanSettings } = doc as any;
        db.settings = cleanSettings as AppSettings;
      }
    }
    
    // Update local JSON cache to stay in full sync
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    console.log("[MongoDB Sync] Synchronization successfully finalized!");
  } catch (err) {
    console.error("[MongoDB Sync] Error during MongoDB data download:", err);
  }
}

async function syncToMongo(
  collectionName: string, 
  id: string | null, 
  doc: any, 
  action: 'insert' | 'update' | 'delete' | 'upsert'
) {
  if (!mongoDb) return;
  try {
    const col = mongoDb.collection(collectionName);
    
    let cleanDoc = null;
    if (doc) {
      const { _id, ...rest } = doc;
      cleanDoc = rest;
    }
    
    if (action === 'delete') {
      if (collectionName === 'passwords') {
        await col.deleteOne({ userId: id });
      } else {
        await col.deleteOne({ id });
      }
    } else if (action === 'insert') {
      await col.insertOne(cleanDoc);
    } else if (action === 'update') {
      if (id !== null) {
        if (collectionName === 'passwords') {
          await col.updateOne({ userId: id }, { $set: cleanDoc });
        } else {
          await col.updateOne({ id }, { $set: cleanDoc });
        }
      } else {
        await col.updateOne({}, { $set: cleanDoc }, { upsert: true });
      }
    } else if (action === 'upsert') {
      if (id !== null) {
        if (collectionName === 'passwords') {
          await col.replaceOne({ userId: id }, cleanDoc, { upsert: true });
        } else {
          await col.replaceOne({ id }, cleanDoc, { upsert: true });
        }
      } else {
        await col.replaceOne({}, cleanDoc, { upsert: true });
      }
    }
  } catch (err) {
    console.error(`[MongoDB Sync Error] Failed to ${action} in collection ${collectionName}:`, err);
  }
}

// -------------------------------------------------------------
// Google Cloud Firestore Integration & Sync Helpers
// -------------------------------------------------------------

export async function initFirestoreAndSync() {
  if (isFirestoreConnected || isFirestoreConnecting) return;
  isFirestoreConnecting = true;
  console.log("[Firestore Setup] Initializing Google Cloud Firestore connection...");
  
  try {
    const configPath = path.resolve('./firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (getApps().length === 0) {
        firebaseApp = initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId
        });
      } else {
        firebaseApp = getApps()[0];
      }
      
      // Access the named database using the ID from firebase-applet-config.json
      firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
      isFirestoreConnected = true;
      isFirestoreConnecting = false;
      console.log(`[Firestore Setup] Connected to named Firestore Database: ${config.firestoreDatabaseId}!`);
      
      // Perform initial sync from Firestore to memory database
      await syncFromFirestore();
    } else {
      console.log("[Firestore Setup] No firebase-applet-config.json found. Skipping Firestore sync.");
      isFirestoreConnecting = false;
    }
  } catch (err) {
    console.error("[Firestore Setup] Error initializing Firestore:", err);
    isFirestoreConnecting = false;
  }
}

async function syncFromFirestore() {
  if (!firestoreDb) return;
  
  try {
    console.log("[Firestore Sync] Synchronizing schemas and records from Firestore...");
    
    const collections = [
      { name: 'users', key: 'users', defaultData: INITIAL_USERS },
      { name: 'products', key: 'products', defaultData: INITIAL_PRODUCTS },
      { name: 'orders', key: 'orders', defaultData: INITIAL_ORDERS },
      { name: 'categories', key: 'categories', defaultData: INITIAL_CATEGORIES },
      { name: 'coupons', key: 'coupons', defaultData: INITIAL_COUPONS },
      { name: 'auditLogs', key: 'auditLogs', defaultData: INITIAL_LOGS },
      { name: 'notifications', key: 'notifications', defaultData: INITIAL_NOTIFICATIONS },
    ];
    
    // 1. Sync collections
    for (const col of collections) {
      const colRef = collection(firestoreDb, col.name);
      const snapshot = await getDocs(query(colRef, limit(1)));
      
      if (snapshot.empty) {
        console.log(`[Firestore Sync] Seeding collection '${col.name}' with current memory records...`);
        const currentData = (db as any)[col.key] && (db as any)[col.key].length > 0 
          ? (db as any)[col.key] 
          : col.defaultData;
          
        const batch = writeBatch(firestoreDb);
        for (const d of currentData) {
          const docId = d.id || crypto.randomUUID();
          const { _id, ...cleanDoc } = d;
          batch.set(doc(firestoreDb, col.name, docId), cleanDoc);
        }
        await batch.commit();
      } else {
        console.log(`[Firestore Sync] Downloading collection '${col.name}' from Firestore...`);
        const allDocsSnapshot = await getDocs(colRef);
        const docsList: any[] = [];
        allDocsSnapshot.forEach((docSnapshot) => {
          docsList.push({ id: docSnapshot.id, ...docSnapshot.data() });
        });
        (db as any)[col.key] = docsList;
      }
    }
    
    // 2. User passwords authentication credentials
    const passwordsCol = collection(firestoreDb, 'passwords');
    const passwordsSnapshot = await getDocs(query(passwordsCol, limit(1)));
    if (passwordsSnapshot.empty) {
      console.log("[Firestore Sync] Seeding user password hashes...");
      const currentPasswords = Object.keys(db.passwords).length > 0 ? db.passwords : PASSWORDS_MAP;
      const batch = writeBatch(firestoreDb);
      for (const [userId, hash] of Object.entries(currentPasswords)) {
        batch.set(doc(firestoreDb, 'passwords', userId), { hash });
      }
      await batch.commit();
    } else {
      console.log("[Firestore Sync] Downloading user password hashes...");
      const allPasswordsSnapshot = await getDocs(passwordsCol);
      const loadedPasswords: Record<string, string> = {};
      allPasswordsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data && data.hash) {
          loadedPasswords[docSnapshot.id] = data.hash;
        }
      });
      db.passwords = loadedPasswords;
    }
    
    // 3. Global AppSettings
    const settingsDocRef = doc(firestoreDb, 'settings', 'global');
    const settingsDoc = await getDoc(settingsDocRef);
    if (!settingsDoc.exists()) {
      console.log("[Firestore Sync] Seeding global website settings...");
      await setDoc(settingsDocRef, sanitizeForFirestore({ ...db.settings }));
    } else {
      console.log("[Firestore Sync] Downloading global website settings...");
      db.settings = settingsDoc.data() as AppSettings;
    }
    
    // Save local cache JSON database file
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    console.log("[Firestore Sync] Firestore synchronization successfully finalized!");
  } catch (err) {
    console.error("[Firestore Sync] Error during Firestore data sync:", err);
  }
}

function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

async function syncToFirestore(
  collectionName: string, 
  id: string | null, 
  docObj: any, 
  action: 'insert' | 'update' | 'delete' | 'upsert'
) {
  if (!firestoreDb) return;
  try {
    let cleanDoc = null;
    if (docObj) {
      const { _id, ...rest } = docObj;
      cleanDoc = sanitizeForFirestore(rest);
    }
    
    if (action === 'delete') {
      if (id !== null) {
        await deleteDoc(doc(firestoreDb, collectionName, id));
      }
    } else if (action === 'insert' || action === 'update' || action === 'upsert') {
      if (id !== null) {
        if (collectionName === 'passwords') {
          await setDoc(doc(firestoreDb, 'passwords', id), { hash: docObj.hash }, { merge: true });
        } else {
          await setDoc(doc(firestoreDb, collectionName, id), cleanDoc, { merge: true });
        }
      } else {
        if (collectionName === 'settings') {
          await setDoc(doc(firestoreDb, 'settings', 'global'), cleanDoc, { merge: true });
        }
      }
    }
  } catch (err) {
    console.error(`[Firestore Sync Error] Failed to ${action} in collection ${collectionName}:`, err);
  }
}

// IO Safe Reads & Writes
export function loadDatabase(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(raw);
      
      // Ensure all keys exist with seeds preserved
      const loadedUsers = loaded.users || [];
      const mergedUsers = [...loadedUsers];
      INITIAL_USERS.forEach(seedUser => {
        if (!mergedUsers.some(u => u.id === seedUser.id || u.email === seedUser.email)) {
          mergedUsers.push(seedUser);
        }
      });

      db = {
        users: mergedUsers,
        passwords: { ...PASSWORDS_MAP, ...loaded.passwords },
        products: loaded.products || INITIAL_PRODUCTS,
        orders: loaded.orders || INITIAL_ORDERS,
        categories: loaded.categories || INITIAL_CATEGORIES,
        coupons: loaded.coupons || INITIAL_COUPONS,
        auditLogs: loaded.auditLogs || INITIAL_LOGS,
        notifications: loaded.notifications || INITIAL_NOTIFICATIONS,
        settings: loaded.settings || DEFAULT_SETTINGS,
        realtimeVisitors: loaded.realtimeVisitors || 15
      };
    } else {
      saveDatabase();
    }
  } catch (error) {
    console.error("Failed to load local DB, fallback to memory", error);
  }
  
  // Randomize real-time visitors slightly for realism
  db.realtimeVisitors = Math.max(8, Math.min(48, db.realtimeVisitors + Math.floor(Math.random() * 5) - 2));
  return db;
}

export function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error("Failed to write database file", error);
  }
}

// Helper Getters & Modifiers
export function getUsers() { loadDatabase(); return db.users; }
export function getPasswords() { loadDatabase(); return db.passwords; }
export function getProducts() { loadDatabase(); return db.products; }
export function getOrders() { loadDatabase(); return db.orders; }
export function getCategories() { loadDatabase(); return db.categories; }
export function getCoupons() { loadDatabase(); return db.coupons; }
export function getAuditLogs() { loadDatabase(); return db.auditLogs; }
export function getNotifications() { loadDatabase(); return db.notifications; }
export function getSettings() { loadDatabase(); return db.settings; }
export function getRealtimeVisitors() { loadDatabase(); return db.realtimeVisitors; }

// Database Setters (Always calls saveDatabase and syncs with MongoDB/Firestore in the background)
export function addUser(user: User, passwordHash: string) {
  loadDatabase();
  db.users.push(user);
  db.passwords[user.id] = passwordHash;
  saveDatabase();
  syncToMongo('users', user.id, user, 'upsert');
  syncToMongo('passwords', user.id, { userId: user.id, hash: passwordHash }, 'upsert');
  syncToFirestore('users', user.id, user, 'upsert');
  syncToFirestore('passwords', user.id, { userId: user.id, hash: passwordHash }, 'upsert');
}

export function updateUser(id: string, updates: Partial<User>) {
  loadDatabase();
  db.users = db.users.map(u => u.id === id ? { ...u, ...updates } as User : u);
  saveDatabase();
  const user = db.users.find(u => u.id === id);
  if (user) {
    syncToMongo('users', id, user, 'upsert');
    syncToFirestore('users', id, user, 'upsert');
  }
}

export function updateUserPassword(id: string, newHash: string) {
  loadDatabase();
  db.passwords[id] = newHash;
  saveDatabase();
  syncToMongo('passwords', id, { userId: id, hash: newHash }, 'upsert');
  syncToFirestore('passwords', id, { userId: id, hash: newHash }, 'upsert');
}

export function addProduct(product: Product) {
  loadDatabase();
  db.products.push(product);
  saveDatabase();
  syncToMongo('products', product.id, product, 'upsert');
  syncToFirestore('products', product.id, product, 'upsert');
}

export function updateProduct(id: string, updates: Partial<Product>) {
  loadDatabase();
  db.products = db.products.map(p => p.id === id ? { ...p, ...updates } as Product : p);
  saveDatabase();
  const prod = db.products.find(p => p.id === id);
  if (prod) {
    syncToMongo('products', id, prod, 'upsert');
    syncToFirestore('products', id, prod, 'upsert');
  }
}

export function deleteProduct(id: string) {
  loadDatabase();
  db.products = db.products.filter(p => p.id !== id);
  saveDatabase();
  syncToMongo('products', id, null, 'delete');
  syncToFirestore('products', id, null, 'delete');
}

export function addOrder(order: Order) {
  loadDatabase();
  db.orders.unshift(order); // Newest orders first
  saveDatabase();
  syncToMongo('orders', order.id, order, 'upsert');
  syncToFirestore('orders', order.id, order, 'upsert');
}

export function updateOrder(id: string, updates: Partial<Order>) {
  loadDatabase();
  db.orders = db.orders.map(o => o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } as Order : o);
  saveDatabase();
  const ord = db.orders.find(o => o.id === id);
  if (ord) {
    syncToMongo('orders', id, ord, 'upsert');
    syncToFirestore('orders', id, ord, 'upsert');
  }
}

export function addCategory(category: Category) {
  loadDatabase();
  db.categories.push(category);
  saveDatabase();
  syncToMongo('categories', category.id, category, 'upsert');
  syncToFirestore('categories', category.id, category, 'upsert');
}

export function updateCategory(id: string, updates: Partial<Category>) {
  loadDatabase();
  db.categories = db.categories.map(c => c.id === id ? { ...c, ...updates } as Category : c);
  saveDatabase();
  const cat = db.categories.find(c => c.id === id);
  if (cat) {
    syncToMongo('categories', id, cat, 'upsert');
    syncToFirestore('categories', id, cat, 'upsert');
  }
}

export function deleteCategory(id: string) {
  loadDatabase();
  db.categories = db.categories.filter(c => c.id !== id);
  saveDatabase();
  syncToMongo('categories', id, null, 'delete');
  syncToFirestore('categories', id, null, 'delete');
}

export function addCoupon(coupon: Coupon) {
  loadDatabase();
  db.coupons.push(coupon);
  saveDatabase();
  syncToMongo('coupons', coupon.id, coupon, 'upsert');
  syncToFirestore('coupons', coupon.id, coupon, 'upsert');
}

export function updateCoupon(id: string, updates: Partial<Coupon>) {
  loadDatabase();
  db.coupons = db.coupons.map(c => c.id === id ? { ...c, ...updates } as Coupon : c);
  saveDatabase();
  const coup = db.coupons.find(c => c.id === id);
  if (coup) {
    syncToMongo('coupons', id, coup, 'upsert');
    syncToFirestore('coupons', id, coup, 'upsert');
  }
}

export function deleteCoupon(id: string) {
  loadDatabase();
  db.coupons = db.coupons.filter(c => c.id !== id);
  saveDatabase();
  syncToMongo('coupons', id, null, 'delete');
  syncToFirestore('coupons', id, null, 'delete');
}

export function addAuditLog(userId: string, userName: string, userRole: UserRole, action: string, details: string, ipAddress: string = "127.0.0.1") {
  loadDatabase();
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    userId,
    userName,
    userRole,
    action,
    details,
    ipAddress,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log); // Newest logs first
  saveDatabase();
  syncToMongo('auditLogs', log.id, log, 'insert');
  syncToFirestore('auditLogs', log.id, log, 'insert');
}

export function addNotification(userId: string, targetRole: UserRole | undefined, title: string, message: string, type: 'order' | 'product_approval' | 'product_rejection' | 'system') {
  loadDatabase();
  const notif: Notification = {
    id: `notif-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    userId,
    targetRole,
    title,
    message,
    isRead: false,
    type,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notif);
  saveDatabase();
  syncToMongo('notifications', notif.id, notif, 'insert');
  syncToFirestore('notifications', notif.id, notif, 'insert');
}

export function updateSettings(updates: Partial<AppSettings>) {
  loadDatabase();
  db.settings = { ...db.settings, ...updates };
  saveDatabase();
  syncToMongo('settings', null, db.settings, 'upsert');
  syncToFirestore('settings', null, db.settings, 'upsert');
}
