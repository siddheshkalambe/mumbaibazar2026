import React, { useState, useEffect } from 'react';
import { Product, User, OrderItem, Coupon } from '../types.js';
import { useToast } from '../context/ToastContext.tsx';
import { Trash, Tag, ShieldCheck, Phone, MapPin, CreditCard, ShoppingBag, ArrowLeft } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartCheckoutProps {
  cartItems: CartItem[];
  currentUser: User | null;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onBackToShopping: () => void;
  onOrderPlaced: (order: any) => void;
}

export default function CartCheckout({
  cartItems,
  currentUser,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onBackToShopping,
  onOrderPlaced
}: CartCheckoutProps) {
  const { success, error } = useToast();
  
  // Checkout address inputs
  const [shippingAddress, setShippingAddress] = useState(currentUser?.address || '');
  const [billingAddress, setBillingAddress] = useState(currentUser?.address || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [sameAsShipping, setSameAsShipping] = useState(true);

  // Coupon inputs
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [standardDeliveryCharge, setStandardDeliveryCharge] = useState<number>(50);

  // Fetch standard delivery charge from global settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.shippingCharge === 'number') {
            setStandardDeliveryCharge(data.shippingCharge);
          }
        }
      } catch (err) {
        console.error("Failed to load global settings", err);
      }
    };
    fetchSettings();
  }, []);

  // Fetch active marketplace coupons dynamically from server
  useEffect(() => {
    const fetchActiveCoupons = async () => {
      try {
        const res = await fetch('/api/coupons/active');
        if (res.ok) {
          const data = await res.json();
          setAvailableCoupons(data);
        }
      } catch (err) {
        console.error("Failed to load active coupons", err);
      }
    };
    fetchActiveCoupons();
  }, []);

  // Sync address fields on login state update
  useEffect(() => {
    if (currentUser) {
      if (currentUser.address) {
        setShippingAddress(currentUser.address);
        setBillingAddress(currentUser.address);
      }
      if (currentUser.phone) {
        setPhoneNumber(currentUser.phone);
      }
    }
  }, [currentUser]);

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => {
    const discountedPrice = item.product.price * (1 - item.product.discount / 100);
    return sum + (discountedPrice * item.quantity);
  }, 0);

  // standard shipping uses configured setting, free above 1000
  const deliveryCharge = subtotal >= 1000 ? 0 : standardDeliveryCharge;

  // Coupon calculations
  let couponDiscount = 0;
  if (activeCoupon) {
    if (activeCoupon.type === 'Percentage') {
      couponDiscount = subtotal * (activeCoupon.value / 100);
    } else {
      // Flat discount
      couponDiscount = Math.min(subtotal, activeCoupon.value);
    }
  }

  const grandTotal = Math.max(0, Math.round(subtotal - couponDiscount + deliveryCharge));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    if (!couponCode.trim()) return;

    try {
      const res = await fetch(`/api/coupons/validate/${couponCode.toUpperCase().trim()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Invalid coupon code');
      }

      setActiveCoupon(data);
      setCouponSuccess(`Success! Coupon "${data.code}" applied: ${data.type === 'Percentage' ? `${data.value}% discount` : `₹${data.value} flat off`}`);
      success(`Coupon "${data.code}" applied successfully!`, 'Discount Applied');
    } catch (err: any) {
      setCouponError(err.message);
      error(err.message || 'Invalid coupon code');
      setActiveCoupon(null);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (!currentUser) {
      setCheckoutError('Please login to place an order.');
      error('Please login to complete checkout.', 'Authentication Required');
      return;
    }

    if (cartItems.length === 0) {
      setCheckoutError('Your shopping cart is empty.');
      return;
    }

    if (!shippingAddress.trim() || !phoneNumber.trim()) {
      setCheckoutError('Please fill in shipping address and phone number.');
      error('Please provide a valid shipping address and phone number.', 'Missing Details');
      return;
    }

    setLoading(true);

    try {
      const itemsPayload: OrderItem[] = cartItems.map(item => ({
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        discount: item.product.discount,
        quantity: item.quantity,
        image: item.product.primaryImage,
        sellerId: item.product.sellerId
      }));

      const payload = {
        items: itemsPayload,
        shippingAddress,
        billingAddress: sameAsShipping ? shippingAddress : billingAddress,
        phoneNumber,
        deliveryCharge,
        couponCode: activeCoupon?.code || '',
        couponDiscount,
        grandTotal,
        paymentMethod: 'COD'
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      onClearCart();
      success(`Order placed successfully! Order ID #${data.id.substring(0, 10)}`, 'Order Confirmed');
      onOrderPlaced(data); // navigates to order_tracking
    } catch (err: any) {
      setCheckoutError(err.message);
      error(err.message || 'Failed to place order.', 'Order Error');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-stone-900 dark:text-white">Your Shopping Cart is Empty</h2>
        <p className="text-xs text-stone-400 max-w-sm mx-auto mt-2">
          Explore local specialty items, Add paithani sarees, Alphonso mangoes, or aromatic masala powder to start!
        </p>
        <button
          onClick={onBackToShopping}
          className="mt-8 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-full shadow transition-all cursor-pointer"
        >
          Explore Mumbai Bazar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-screen py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBackToShopping}
            className="flex items-center gap-1 text-xs font-bold text-stone-500 dark:text-zinc-400 hover:text-stone-850 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </button>
          <span className="text-xs text-stone-400">Step 1 of 2: Cart Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Cart Items & Address Inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Shopping List Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-150 dark:border-zinc-800 p-6 shadow-sm transition-colors">
              <h2 className="text-lg font-black text-stone-900 dark:text-white mb-4">Cart Summary ({cartItems.length} items)</h2>
              
              <div className="divide-y divide-stone-50 dark:divide-zinc-850">
                {cartItems.map((item) => {
                  const finalItemPrice = item.product.price * (1 - item.product.discount/100);
                  return (
                    <div key={item.product.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                      <div className="w-16 h-16 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                        <img src={item.product.primaryImage} alt="" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-bold text-stone-800 dark:text-white leading-normal max-w-sm">{item.product.title}</h3>
                          <p className="text-[10px] text-stone-400 mt-1">Vendor: {item.product.sellerName}</p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                          
                          {/* Counter */}
                          <div className="flex items-center border border-stone-100 dark:border-zinc-800 rounded-lg px-2 py-0.5 bg-stone-50 dark:bg-zinc-850/60 text-xs">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                              className="px-1.5 font-bold text-stone-400 hover:text-stone-700 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold font-mono text-stone-800 dark:text-white">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                              className="px-1.5 font-bold text-stone-400 hover:text-stone-700 cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right flex items-center gap-4">
                            <span className="text-xs font-black font-mono text-stone-900 dark:text-white">
                              ₹{Math.round(finalItemPrice * item.quantity)}
                            </span>
                            <button
                              onClick={() => onRemoveItem(item.product.id)}
                              className="text-stone-300 hover:text-red-500 p-1 cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Billing / Shipping Address Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-150 dark:border-zinc-800 p-6 shadow-sm transition-colors">
              <h2 className="text-lg font-black text-stone-900 dark:text-white mb-4">Fulfillment Details</h2>
              
              {checkoutError && (
                <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/40">
                  {checkoutError}
                </div>
              )}

              <form className="space-y-4">
                
                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-stone-500 mb-1.5">Recipient Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="tel"
                      required
                      placeholder="Enter 10-digit phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs text-stone-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Shipping address */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-stone-500 mb-1.5">Shipping Destination Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                    <textarea
                      required
                      rows={3}
                      placeholder="Building name, apartment, street, pincode (Mumbai delivery prioritised)"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs text-stone-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Same as billing check */}
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="same_billing"
                    checked={sameAsShipping}
                    onChange={() => setSameAsShipping(!sameAsShipping)}
                    className="accent-amber-500"
                  />
                  <label htmlFor="same_billing" className="text-xs text-stone-600 dark:text-zinc-300 select-none cursor-pointer">
                    Billing Address is same as Shipping Address
                  </label>
                </div>

                {/* Billing address */}
                {!sameAsShipping && (
                  <div className="animate-fade-in">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-stone-500 mb-1.5">Billing Address *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                      <textarea
                        required
                        rows={3}
                        placeholder="Enter billing address details"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs text-stone-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

              </form>
            </div>

          </div>

          {/* Right Column: Calculations, Promos, Cash on Delivery Button */}
          <div className="space-y-6">
            
            {/* Coupon Promo Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-150 dark:border-zinc-800 p-6 shadow-sm transition-colors">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-500" />
                Apply Coupon Code
              </h3>
              
              <form onSubmit={handleApplyCoupon} className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="E.g. MUMBAI20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-stone-50 dark:bg-zinc-850 px-3 py-2 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs text-stone-850 dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Apply
                </button>
              </form>

              {couponError && <p className="text-[10px] text-red-500 font-bold mt-2">{couponError}</p>}
              {couponSuccess && <p className="text-[10px] text-emerald-500 font-bold mt-2">{couponSuccess}</p>}

              {/* Dynamic available marketplace coupons */}
              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-zinc-800 text-[10px] space-y-1.5 text-stone-500 dark:text-zinc-400">
                <p className="font-bold text-stone-700 dark:text-zinc-300">Available Marketplace Coupons:</p>
                {availableCoupons.length === 0 ? (
                  <p className="italic text-stone-400 dark:text-zinc-500">No active promotional coupons available.</p>
                ) : (
                  availableCoupons.map((c) => (
                    <p key={c.id || c.code} className="flex items-center gap-1.5">
                      • <button
                          type="button"
                          onClick={() => setCouponCode(c.code)}
                          title="Click to auto-fill code"
                          className="font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          {c.code}
                        </button> - {c.type === 'Percentage' ? `${c.value}% discount on cart value` : `₹${c.value} Flat discount on purchase`}
                    </p>
                  ))
                )}
              </div>
            </div>

            {/* Calculations Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-150 dark:border-zinc-800 p-6 shadow-sm transition-colors">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-800 dark:text-zinc-200 pb-3 border-b border-stone-100 dark:border-zinc-850">
                Payment Breakdown
              </h3>
              
              <div className="py-4 space-y-3.5 text-xs text-stone-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Cart Items Subtotal</span>
                  <span className="font-mono font-bold text-stone-850 dark:text-white">₹{Math.round(subtotal)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Coupon Savings</span>
                    <span className="font-mono">- ₹{Math.round(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping & Delivery Fee</span>
                  {deliveryCharge === 0 ? (
                    <span className="text-emerald-500 font-bold">
                      {standardDeliveryCharge === 0 ? 'FREE' : 'FREE (Above ₹1000)'}
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-stone-850 dark:text-white">₹{deliveryCharge}</span>
                  )}
                </div>

                <div className="flex justify-between border-t border-stone-50 dark:border-zinc-850/50 pt-3 text-sm font-bold text-stone-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="font-mono text-base font-black text-amber-500">₹{grandTotal}</span>
                </div>
              </div>

              {/* Secure Cash On Delivery Indicator */}
              <div className="p-3.5 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/40 dark:border-amber-900/30 rounded-xl flex gap-3 text-[10px] text-stone-500 dark:text-zinc-400">
                <CreditCard className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-stone-700 dark:text-zinc-300">Only Payment Method: Cash On Delivery</p>
                  <p className="mt-1 leading-relaxed">
                    By placing this order, you confirm you will pay ₹{grandTotal} in cash to our courier agent at the time of delivery.
                  </p>
                </div>
              </div>

              {/* Place Order CTA */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-450 text-stone-950 font-black rounded-xl text-sm transition-all shadow shadow-amber-500/10 mt-6 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Processing Order...' : `Place COD Order (₹${grandTotal})`}
              </button>

              <div className="flex items-center gap-1.5 justify-center text-[10px] text-stone-400 mt-4">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>100% Genuine Marketplace Fulfillment</span>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
