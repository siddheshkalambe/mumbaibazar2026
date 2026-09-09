import { useState, useEffect } from 'react';
import { User, Product, Order } from './types.js';
import Navbar from './components/Navbar.js';
import BuyerHome from './components/BuyerHome.js';
import ProductDetails from './components/ProductDetails.js';
import CartCheckout from './components/CartCheckout.js';
import OrderTracking from './components/OrderTracking.js';
import OrderHistory from './components/OrderHistory.js';
import Profile from './components/Profile.js';
import SellerDashboard from './components/SellerDashboard.js';
import AdminPortal from './components/AdminPortal.js';
import SuperAdminPortal from './components/SuperAdminPortal.js';
import AuthPages from './components/AuthPages.js';
import { useToast } from './context/ToastContext.tsx';
import { ShieldAlert, RefreshCw, ShoppingBag, AlertTriangle } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function App() {
  const { showCartToast, info, success } = useToast();
  const [page, setPage] = useState<
    'home' | 'product_details' | 'cart_checkout' | 'order_history' | 'order_tracking' | 'profile' | 'seller_dashboard' | 'admin_portal' | 'super_admin' | 'auth'
  >('home');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [systemMaintenance, setSystemMaintenance] = useState(false);
  const [logoBranding, setLogoBranding] = useState('MUMBAI BAZAR');
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  // Cart Local Persistence State
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('mumbai_bazar_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Dark/Light Theme state
  const [darkMode, setDarkMode] = useState(false);

  // Force Light mode (crisp white background) as requested
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('mumbai_bazar_theme', 'light');
  }, []);

  // Auth bootstrap check
  const checkAuthToken = async () => {
    setLoadingUser(true);
    const token = localStorage.getItem('mumbai_bazar_token');
    if (!token) {
      setCurrentUser(null);
      setLoadingUser(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        localStorage.removeItem('mumbai_bazar_token');
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Auth verification error:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  // Sync maintenance settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        setSystemMaintenance(settings.maintenanceMode);
        setLogoBranding(settings.logoText || 'MUMBAI BAZAR');
      }
    } catch (err) {
      console.error('Settings sync error:', err);
    }
  };

  useEffect(() => {
    checkAuthToken();
    fetchSettings();
  }, []);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem('mumbai_bazar_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Cart operations
  const handleAddToCart = (product: Product, qty: number) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: Math.min(product.stock, item.quantity + qty) } 
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    showCartToast(product, qty, () => {
      setPage('cart_checkout');
    });
  };

  const handleUpdateCartQty = (productId: string, quantity: number) => {
    setCartItems(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('mumbai_bazar_token');
    setCurrentUser(null);
    setCartItems([]);
    setPage('home');
    info('You have logged out successfully.', 'Logged Out');
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'buyer') {
      setPage('home');
    } else if (user.role === 'seller') {
      setPage('seller_dashboard');
    } else if (user.role === 'admin') {
      setPage('admin_portal');
    } else if (user.role === 'super_admin') {
      setPage('super_admin');
    }
  };

  // Safe page transitions
  const handleNavigate = (targetPage: typeof page) => {
    if (targetPage === 'profile' || targetPage === 'order_history' || targetPage === 'cart_checkout') {
      if (!currentUser) {
        setPage('auth');
        return;
      }
    }
    setPage(targetPage);
  };

  // Buy Again handler (puts old order items into cart)
  const handleBuyAgain = (order: Order) => {
    // try to fetch active products to match
    order.items.forEach(async (item) => {
      try {
        const res = await fetch(`/api/products/${item.productId}`);
        if (res.ok) {
          const freshProd = await res.json();
          handleAddToCart(freshProd, item.quantity);
        }
      } catch (e) {
        console.error(e);
      }
    });
    setPage('cart_checkout');
  };

  // Block maintenance mode for buyers/guests
  const isBlockedByMaintenance = systemMaintenance && (!currentUser || currentUser.role === 'buyer');

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-zinc-950 text-stone-850 dark:text-zinc-250 transition-colors">
      
      {/* 1. Navbar */}
      {!isBlockedByMaintenance && (
        <Navbar
          logoText={logoBranding}
          cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
          currentUser={currentUser}
          darkMode={darkMode}
          onNavigate={handleNavigate}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onLogout={handleLogout}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          currentView={page}
        />
      )}

      {/* Main Content Stage */}
      <main className="flex-grow">
        
        {loadingUser ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-xs text-stone-400 font-medium">Verifying active merchant session credentials...</p>
          </div>
        ) : isBlockedByMaintenance ? (
          /* Maintenance Block Screen */
          <div className="max-w-md mx-auto text-center px-4 py-32 flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-stone-900 dark:text-white uppercase tracking-wider">{logoBranding}</h1>
            <h2 className="text-sm font-bold text-stone-600 dark:text-zinc-350 mt-2">Bazaar Under Maintenance</h2>
            <p className="text-xs text-stone-400 mt-4 leading-relaxed">
              We are currently reorganizing our Crawford Market merchant stalls and upgrading our database routers. Please check back in a few minutes!
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-2 bg-stone-900 hover:bg-stone-850 dark:bg-zinc-850 dark:hover:bg-zinc-750 text-white font-bold text-xs rounded-full transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Page
            </button>
          </div>
        ) : (
          /* Page router rendering */
          <>
            {page === 'home' && (
              <BuyerHome
                onProductClick={(p) => {
                  setSelectedProduct(p);
                  setPage('product_details');
                }}
                onAddToCart={handleAddToCart}
                searchValue={searchValue}
                currentUser={currentUser}
              />
            )}

            {page === 'product_details' && selectedProduct && (
              <ProductDetails
                product={selectedProduct}
                currentUser={currentUser}
                onBack={() => setPage('home')}
                onAddToCart={handleAddToCart}
                onProductClick={(p) => setSelectedProduct(p)}
              />
            )}

            {page === 'cart_checkout' && (
              <CartCheckout
                cartItems={cartItems}
                currentUser={currentUser}
                onUpdateQuantity={handleUpdateCartQty}
                onRemoveItem={handleRemoveCartItem}
                onClearCart={handleClearCart}
                onBackToShopping={() => setPage('home')}
                onOrderPlaced={(order) => {
                  setSelectedOrder(order);
                  setPage('order_tracking');
                }}
              />
            )}

            {page === 'order_history' && (
              <OrderHistory
                onOrderClick={(order) => {
                  setSelectedOrder(order);
                  setPage('order_tracking');
                }}
              />
            )}

            {page === 'order_tracking' && selectedOrder && (
              <OrderTracking
                order={selectedOrder}
                onBack={() => setPage('order_history')}
                onBuyAgain={handleBuyAgain}
              />
            )}

            {page === 'profile' && currentUser && (
              <Profile
                currentUser={currentUser}
                onLogout={handleLogout}
                onUpdateUser={(updated) => setCurrentUser(updated)}
              />
            )}

            {page === 'seller_dashboard' && currentUser && (
              <SellerDashboard currentUser={currentUser} />
            )}

            {page === 'admin_portal' && currentUser && (
              <AdminPortal currentUser={currentUser} />
            )}

            {page === 'super_admin' && currentUser && (
              <SuperAdminPortal currentUser={currentUser} />
            )}

            {page === 'auth' && (
              <AuthPages
                onLoginSuccess={(token, user) => {
                  localStorage.setItem('mumbai_bazar_token', token);
                  handleAuthSuccess(user);
                }}
                onBackToHome={() => setPage('home')}
              />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      {!isBlockedByMaintenance && (
        <footer className="bg-white dark:bg-zinc-900 border-t border-stone-200/60 dark:border-zinc-800/80 py-8 text-center text-xs text-stone-400 mt-20 transition-colors">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <p className="font-extrabold text-stone-600 dark:text-zinc-300 tracking-tight">
              {logoBranding} - © {new Date().getFullYear()}
            </p>
            <p className="text-[10px] leading-relaxed max-w-md mx-auto">
              Authentic Indian artisan items, silks sarees, pure spices, and traditional artifacts directly shipped using secure Cash on Delivery logistics from South Mumbai, Maharashtra.
            </p>
          </div>
        </footer>
      )}

    </div>
  );
}
