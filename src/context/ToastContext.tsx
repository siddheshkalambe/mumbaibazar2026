import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, AlertCircle, AlertTriangle, Info, 
  ShoppingCart, X, ArrowRight, Sparkles 
} from 'lucide-react';
import { Product } from '../types.js';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'cart';

export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  product?: Product;
  quantity?: number;
  action?: ToastAction;
  duration?: number;
}

export interface DialogOptions {
  type?: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm?: (inputValue?: string) => void;
  onCancel?: () => void;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  showCartToast: (product: Product, quantity: number, onGoToCart?: () => void) => string;
  success: (message: string, title?: string, action?: ToastAction) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  dismissToast: (id: string) => void;
  
  // Custom dialogs replacing alert(), confirm(), prompt()
  showDialog: (options: DialogOptions) => Promise<string | boolean | null>;
  alertDialog: (message: string, title?: string) => Promise<void>;
  confirmDialog: (message: string, title?: string, isDestructive?: boolean) => Promise<boolean>;
  promptDialog: (message: string, title?: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeDialog, setActiveDialog] = useState<(DialogOptions & { id: string; resolve: (val: any) => void }) | null>(null);
  const [promptInputVal, setPromptInputVal] = useState('');

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = {
      ...toast,
      id,
      duration: toast.duration ?? 4500,
    };

    setToasts((prev) => {
      // Keep max 4 toasts visible at a time
      const filtered = prev.slice(-3);
      return [...filtered, newToast];
    });

    return id;
  }, []);

  const showCartToast = useCallback((product: Product, quantity: number, onGoToCart?: () => void): string => {
    const discountedPrice = Math.round(product.price * (1 - (product.discount || 0) / 100));
    return showToast({
      type: 'cart',
      title: 'Added to Cart',
      message: `${quantity}x ${product.title}`,
      product,
      quantity,
      action: onGoToCart ? {
        label: 'View Cart',
        onClick: onGoToCart,
        primary: true,
      } : undefined,
      duration: 5000,
    });
  }, [showToast]);

  const success = useCallback((message: string, title?: string, action?: ToastAction) => {
    return showToast({ type: 'success', title: title || 'Success', message, action, duration: 4000 });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    return showToast({ type: 'error', title: title || 'Error', message, duration: 5000 });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    return showToast({ type: 'info', title: title || 'Notice', message, duration: 4000 });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    return showToast({ type: 'warning', title: title || 'Warning', message, duration: 4500 });
  }, [showToast]);

  // Dialog implementations
  const showDialog = useCallback((options: DialogOptions): Promise<any> => {
    return new Promise((resolve) => {
      setPromptInputVal(options.defaultValue || '');
      setActiveDialog({
        ...options,
        id: `dialog-${Date.now()}`,
        resolve,
      });
    });
  }, []);

  const alertDialog = useCallback(async (message: string, title = 'Notice') => {
    await showDialog({
      type: 'alert',
      title,
      message,
      confirmText: 'OK',
    });
  }, [showDialog]);

  const confirmDialog = useCallback(async (message: string, title = 'Confirmation', isDestructive = false): Promise<boolean> => {
    const res = await showDialog({
      type: 'confirm',
      title,
      message,
      confirmText: isDestructive ? 'Delete' : 'Confirm',
      cancelText: 'Cancel',
      isDestructive,
    });
    return Boolean(res);
  }, [showDialog]);

  const promptDialog = useCallback(async (message: string, title = 'Input Required', defaultValue = '', placeholder = ''): Promise<string | null> => {
    const res = await showDialog({
      type: 'prompt',
      title,
      message,
      defaultValue,
      placeholder,
      confirmText: 'Submit',
      cancelText: 'Cancel',
    });
    return typeof res === 'string' ? res : null;
  }, [showDialog]);

  const handleDialogConfirm = () => {
    if (!activeDialog) return;
    if (activeDialog.type === 'prompt') {
      activeDialog.resolve(promptInputVal);
    } else {
      activeDialog.resolve(true);
    }
    setActiveDialog(null);
  };

  const handleDialogCancel = () => {
    if (!activeDialog) return;
    if (activeDialog.type === 'prompt') {
      activeDialog.resolve(null);
    } else {
      activeDialog.resolve(false);
    }
    setActiveDialog(null);
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showCartToast,
        success,
        error,
        info,
        warning,
        dismissToast,
        showDialog,
        alertDialog,
        confirmDialog,
        promptDialog,
      }}
    >
      {children}

      {/* Floating Toast Notification Stack */}
      <div 
        id="toast-notification-root"
        className="fixed top-4 right-4 z-99999 flex flex-col gap-3 w-full max-w-md pointer-events-none px-3 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Modal Dialog (Alert / Confirm / Prompt) */}
      <AnimatePresence>
        {activeDialog && (
          <div 
            id="custom-modal-overlay"
            className="fixed inset-0 z-100000 flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl overflow-hidden relative text-stone-850 dark:text-zinc-100"
            >
              {/* Top Accent Glow */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                activeDialog.isDestructive 
                  ? 'bg-rose-500' 
                  : 'bg-amber-500'
              }`} />

              <div className="flex items-start gap-3.5 mb-4">
                <div className={`p-2.5 rounded-2xl flex-shrink-0 ${
                  activeDialog.isDestructive 
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500' 
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                }`}>
                  {activeDialog.isDestructive ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : activeDialog.type === 'prompt' ? (
                    <Sparkles className="w-6 h-6" />
                  ) : (
                    <Info className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-base font-black tracking-tight text-stone-900 dark:text-white">
                    {activeDialog.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1 leading-relaxed whitespace-pre-wrap">
                    {activeDialog.message}
                  </p>
                </div>
              </div>

              {/* Input for prompt dialogs */}
              {activeDialog.type === 'prompt' && (
                <div className="mt-4 mb-2">
                  <input
                    id="dialog-prompt-input"
                    type="text"
                    autoFocus
                    value={promptInputVal}
                    onChange={(e) => setPromptInputVal(e.target.value)}
                    placeholder={activeDialog.placeholder || 'Enter value...'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDialogConfirm();
                      if (e.key === 'Escape') handleDialogCancel();
                    }}
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 rounded-2xl text-xs font-semibold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-stone-400"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-2.5">
                {activeDialog.type !== 'alert' && (
                  <button
                    id="dialog-cancel-btn"
                    type="button"
                    onClick={handleDialogCancel}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-bold text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {activeDialog.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  id="dialog-confirm-btn"
                  type="button"
                  onClick={handleDialogConfirm}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer ${
                    activeDialog.isDestructive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-amber-500/20'
                  }`}
                >
                  {activeDialog.confirmText || 'OK'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

interface ToastCardProps {
  key?: React.Key;
  toast: ToastItem;
  onDismiss: () => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const [isPaused, setIsPaused] = React.useState(false);
  const duration = toast.duration || 4500;

  React.useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, isPaused, onDismiss]);

  const isCart = toast.type === 'cart';
  const product = toast.product;
  const unitPrice = product ? Math.round(product.price * (1 - (product.discount || 0) / 100)) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.92, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, scale: 0.94, filter: 'blur(4px)' }}
      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="pointer-events-auto w-full bg-white dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-stone-200/90 dark:border-zinc-800 shadow-xl overflow-hidden relative group"
    >
      {/* Visual Accent bar */}
      <div 
        className={`h-1 w-full ${
          toast.type === 'success' || toast.type === 'cart'
            ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
            : toast.type === 'error'
            ? 'bg-rose-500'
            : toast.type === 'warning'
            ? 'bg-amber-500'
            : 'bg-blue-500'
        }`} 
      />

      <div className="p-3.5 sm:p-4">
        {isCart && product ? (
          /* Enhanced Cart Notification Card */
          <div className="flex items-center gap-3.5">
            {/* Thumbnail */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-stone-150 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-800 flex-shrink-0 shadow-xs">
              <img
                src={product.primaryImage || product.images?.[0] || 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=60'}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 bg-emerald-500 text-white p-0.5 rounded-full shadow">
                <CheckCircle2 className="w-3 h-3" />
              </div>
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  Added to Cart
                </span>
                {toast.quantity && toast.quantity > 1 && (
                  <span className="text-[10px] font-bold text-stone-500 dark:text-zinc-400">
                    Qty: {toast.quantity}
                  </span>
                )}
              </div>
              
              <h4 className="text-xs font-black text-stone-900 dark:text-white truncate mt-1">
                {product.title}
              </h4>
              
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono font-extrabold text-amber-600 dark:text-amber-400">
                  ₹{unitPrice}
                </span>
                {product.discount > 0 && (
                  <span className="text-[10px] text-stone-400 line-through font-mono">
                    ₹{product.price}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Button & Close */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={onDismiss}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss();
                  }}
                  className="px-3 py-1.5 bg-stone-900 dark:bg-amber-500 hover:bg-stone-800 dark:hover:bg-amber-600 text-white dark:text-stone-950 text-[11px] font-extrabold rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer hover:scale-102 active:scale-98"
                >
                  <span>{toast.action.label}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Standard Rich Notification Card */
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                : toast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                : toast.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-4.5 h-4.5" />}
              {toast.type === 'error' && <AlertCircle className="w-4.5 h-4.5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4.5 h-4.5" />}
              {toast.type === 'info' && <Info className="w-4.5 h-4.5" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <h4 className="text-xs font-extrabold text-stone-900 dark:text-white">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-stone-600 dark:text-zinc-300 leading-snug mt-0.5">
                {toast.message}
              </p>

              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss();
                  }}
                  className="mt-2 text-[11px] font-black text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {toast.action.label} <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onDismiss}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Subtle Auto-Dismiss Countdown Progress Bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: isPaused ? '100%' : '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`h-0.5 ${
          toast.type === 'success' || toast.type === 'cart'
            ? 'bg-emerald-500/40'
            : toast.type === 'error'
            ? 'bg-rose-500/40'
            : 'bg-amber-500/40'
        }`}
      />
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
