import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types.js';
import { 
  Search, ShoppingCart, User as UserIcon, LogOut, Sun, Moon, Bell, Menu, X, 
  Settings, ShoppingBag, ShieldAlert, CheckCircle2, ChevronDown 
} from 'lucide-react';

interface NavbarProps {
  logoText?: string;
  currentUser: User | null;
  onLogout: () => void;
  onNavigate: (view: any) => void;
  cartCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  searchValue?: string;
  currentView?: string;
}

export default function Navbar({
  logoText = "MUMBAI BAZAR",
  currentUser,
  onLogout,
  onNavigate,
  cartCount,
  darkMode,
  onToggleDarkMode,
  onSearchChange,
  onSearchSubmit,
  searchValue = "",
  currentView = "home"
}: NavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh notifications every 15s
    return () => clearInterval(interval);
  }, [currentUser]);

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-stone-100 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('home')} 
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-xl md:text-2xl font-black text-amber-500 tracking-tight select-none uppercase">
                {logoText} <span className="text-xs font-normal text-stone-500 dark:text-zinc-400 bg-stone-150 dark:bg-zinc-800 px-1.5 py-0.5 rounded ml-1">PORTAL</span>
              </span>
            </button>
          </div>

          {/* Search Bar - Only show on home / marketplace / product_details */}
          {(currentView === 'home' || currentView === 'product_details') && onSearchChange && (
            <form onSubmit={onSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-8 relative">
              <input
                type="text"
                placeholder="Search Paithani sarees, masala tea, Alphonso mangoes..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-white border border-stone-200 dark:border-zinc-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-500 cursor-pointer">
                <Search className="w-4.5 h-4.5" />
              </button>
            </form>
          )}

          {/* Desktop Right Side Control Icons */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Shopping Cart (Customer only) */}
            {(!currentUser || currentUser.role === 'buyer') && (
              <button
                onClick={() => onNavigate('cart_checkout')}
                className="relative p-2 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-zinc-850 rounded-full transition-all cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications Panel */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfileMenu(false);
                    if (!showNotifications) markAllRead();
                  }}
                  className="relative p-2 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-zinc-850 rounded-full transition-all cursor-pointer"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-stone-150 dark:border-zinc-800 overflow-hidden transform origin-top-right transition-all">
                    <div className="p-4 border-b border-stone-100 dark:border-zinc-800 flex justify-between items-center bg-stone-50 dark:bg-zinc-850">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-zinc-400">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto divide-y divide-stone-50 dark:divide-zinc-800/60">
                      {notifications.length === 0 ? (
                        <p className="text-center py-8 text-xs text-stone-400 dark:text-zinc-500">No active notifications</p>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-3.5 text-xs flex gap-3 transition-colors ${!n.isRead ? 'bg-amber-50/20 dark:bg-amber-950/10' : 'hover:bg-stone-50/50 dark:hover:bg-zinc-800/40'}`}
                          >
                            <div className="mt-0.5">
                              {n.type === 'order' ? (
                                <ShoppingBag className="w-4 h-4 text-amber-500" />
                              ) : n.type === 'product_approval' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <ShieldAlert className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-stone-800 dark:text-zinc-200">{n.title}</p>
                              <p className="text-stone-500 dark:text-zinc-450 mt-0.5">{n.message}</p>
                              <p className="text-[9px] text-stone-400 dark:text-zinc-500 mt-1">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-1.5 focus:outline-none cursor-pointer group"
                >
                  <img
                    src={currentUser.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=sid"}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border-2 border-stone-200 dark:border-zinc-700 object-cover group-hover:border-amber-500 transition-colors"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-800 dark:group-hover:text-white" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-stone-150 dark:border-zinc-800 py-1.5 overflow-hidden transform origin-top-right transition-all">
                    
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-stone-50 dark:border-zinc-800">
                      <p className="text-xs font-bold text-stone-950 dark:text-white">{currentUser.name}</p>
                      <p className="text-[10px] text-stone-500 dark:text-zinc-450 truncate">{currentUser.email}</p>
                    </div>

                    {/* Quick navigation dashboards based on Role */}
                    {currentUser.role === 'buyer' && (
                      <button
                        onClick={() => { onNavigate('profile'); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-stone-400" />
                        My Profile & Settings
                      </button>
                    )}

                    {currentUser.role === 'buyer' && (
                      <button
                        onClick={() => { onNavigate('order_history'); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 text-stone-400" />
                        My Orders
                      </button>
                    )}

                    {currentUser.role === 'seller' && (
                      <button
                        onClick={() => { onNavigate('seller_dashboard'); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2 font-semibold cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-amber-500" />
                        Seller Dashboard
                      </button>
                    )}

                    {['admin', 'super_admin'].includes(currentUser.role) && (
                      <button
                        onClick={() => { onNavigate('admin_portal'); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2 font-semibold cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-amber-500" />
                        Admin Panel
                      </button>
                    )}

                    {currentUser.role === 'super_admin' && (
                      <button
                        onClick={() => { onNavigate('super_admin'); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2 font-bold cursor-pointer"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        Super Admin Panel
                      </button>
                    )}

                    <div className="border-t border-stone-50 dark:border-zinc-850 mt-1">
                      <button
                        onClick={() => {
                          onLogout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 font-semibold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('auth')}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-full transition-all shadow-md hover:shadow-lg flex items-center gap-1 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

          </div>

          {/* Mobile hamburger menu */}
          <div className="md:hidden flex items-center gap-3">

            {/* Mobile Notifications Panel */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setMobileMenuOpen(false);
                    setShowProfileMenu(false);
                    if (!showNotifications) markAllRead();
                  }}
                  className="relative p-1.5 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-white rounded-full transition-all cursor-pointer"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-[-60px] sm:right-0 mt-3 w-76 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-stone-150 dark:border-zinc-800 overflow-hidden transform origin-top-right transition-all z-50">
                    <div className="p-3 border-b border-stone-100 dark:border-zinc-800 flex justify-between items-center bg-stone-50 dark:bg-zinc-850">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-zinc-400">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[9px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto divide-y divide-stone-50 dark:divide-zinc-800/60">
                      {notifications.length === 0 ? (
                        <p className="text-center py-6 text-xs text-stone-400 dark:text-zinc-500">No active notifications</p>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-3 text-[11px] flex gap-2.5 transition-colors ${!n.isRead ? 'bg-amber-50/20 dark:bg-amber-950/10' : 'hover:bg-stone-50/50 dark:hover:bg-zinc-800/40'}`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {n.type === 'order' ? (
                                <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                              ) : n.type === 'product_approval' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-stone-800 dark:text-zinc-200 truncate">{n.title}</p>
                              <p className="text-stone-500 dark:text-zinc-400 mt-0.5 leading-normal break-words">{n.message}</p>
                              <p className="text-[8px] text-stone-400 dark:text-zinc-500 mt-1">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentUser && (
              <button 
                onClick={() => { onNavigate('cart_checkout'); setShowNotifications(false); }} 
                className="p-1.5 text-stone-500 dark:text-zinc-400 relative"
              >
                <ShoppingCart className="w-4.5 h-4.5" />
                {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 text-[9px] text-white font-bold flex items-center justify-center">{cartCount}</span>}
              </button>
            )}

            <button
              onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setShowNotifications(false); }}
              className="p-2 text-stone-600 dark:text-zinc-300 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 space-y-3">
          
          {/* Quick search */}
          {onSearchChange && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg text-xs text-stone-800 dark:text-white"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            </div>
          )}

          {currentUser ? (
            <div className="space-y-2">
              <div className="py-2 border-b border-stone-50 dark:border-zinc-800">
                <p className="text-xs font-bold text-stone-800 dark:text-white">{currentUser.name}</p>
                <p className="text-[10px] text-stone-400">{currentUser.email}</p>
              </div>

              {currentUser.role === 'buyer' && (
                <>
                  <button onClick={() => { onNavigate('profile'); setMobileMenuOpen(false); }} className="w-full text-left py-2 text-xs text-stone-600 dark:text-zinc-400">My Profile</button>
                  <button onClick={() => { onNavigate('order_history'); setMobileMenuOpen(false); }} className="w-full text-left py-2 text-xs text-stone-600 dark:text-zinc-400">My Orders</button>
                </>
              )}

              {currentUser.role === 'seller' && (
                <button onClick={() => { onNavigate('seller_dashboard'); setMobileMenuOpen(false); }} className="w-full text-left py-2 text-xs font-bold text-amber-500">Seller Dashboard</button>
              )}

              {['admin', 'super_admin'].includes(currentUser.role) && (
                <button onClick={() => { onNavigate('admin_portal'); setMobileMenuOpen(false); }} className="w-full text-left py-2 text-xs font-bold text-amber-500">Admin Panel</button>
              )}

              {currentUser.role === 'super_admin' && (
                <button onClick={() => { onNavigate('super_admin'); setMobileMenuOpen(false); }} className="w-full text-left py-2 text-xs font-bold text-rose-500">Super Admin Panel</button>
              )}

              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2.5 text-xs font-bold text-red-500 border-t border-stone-100 dark:border-zinc-800 mt-2"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { onNavigate('auth'); setMobileMenuOpen(false); }}
              className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Sign In / Sign Up
            </button>
          )}

        </div>
      )}
    </nav>
  );
}
