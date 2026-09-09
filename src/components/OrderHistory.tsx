import { useState, useEffect } from 'react';
import { Order } from '../types.js';
import { ShoppingBag, Star, ArrowRight, Clock, ShieldCheck, HelpCircle } from 'lucide-react';

interface OrderHistoryProps {
  onOrderClick: (order: Order) => void;
}

export default function OrderHistory({ onOrderClick }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` }
      });
      if (res.ok) {
        const list = await res.json();
        setOrders(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-screen py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page title header */}
        <div className="border-b border-stone-200 pb-4 mb-6">
          <h1 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">Your Order History</h1>
          <p className="text-xs text-stone-400 mt-1">Trace statuses of your Crawford Market and South Mumbai artisan parcel deliveries</p>
        </div>

        {loading ? (
          <p className="text-center py-20 text-xs text-stone-400 italic animate-pulse">Syncing orders tracker...</p>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-12 text-center shadow-sm">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h2 className="text-sm font-black text-stone-850 dark:text-white">No Orders Placed Yet</h2>
            <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
              Explore Mumbai Bazar's curated storefront. Add silk sarees, traditional spices, or Alphonso mango pulps to complete your first order.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const firstItem = order.items[0];
              const extraCount = order.items.length - 1;

              return (
                <div
                  key={order.id}
                  onClick={() => onOrderClick(order)}
                  className="bg-white dark:bg-zinc-900 border border-stone-150 dark:border-zinc-800 rounded-2xl p-5 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left segment details */}
                  <div className="flex gap-4">
                    {/* Primary item thumbnail */}
                    {firstItem && (
                      <div className="w-16 h-16 rounded-xl bg-stone-50 border overflow-hidden flex-shrink-0">
                        <img src={firstItem.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-stone-400 uppercase">Order #{order.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          order.status === 'Cancelled' || order.status === 'Rejected'
                            ? 'bg-red-50 text-red-600'
                            : order.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-stone-850 dark:text-zinc-200 line-clamp-1 leading-normal max-w-md">
                        {firstItem?.title || "Mumbai Curated Parcel"}
                        {extraCount > 0 && <span className="text-amber-500"> (+{extraCount} more item{extraCount > 1 ? 's' : ''})</span>}
                      </h3>

                      <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        Placed on {new Date(order.createdAt).toLocaleDateString([], { dateStyle: 'medium' })} • Cash On Delivery
                      </p>
                    </div>
                  </div>

                  {/* Right segment price & CTA */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] text-stone-400 uppercase font-semibold">Total Invoice</p>
                      <p className="text-base font-black text-stone-900 dark:text-white font-mono mt-0.5">₹{order.grandTotal}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                      <span>Track Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Informative footer */}
        <div className="mt-8 bg-stone-100/50 dark:bg-zinc-900/40 p-4 border rounded-xl flex gap-3 text-[10px] text-stone-400">
          <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-stone-600 dark:text-zinc-300">Mumbai Bazar COD Protection Guarantee</p>
            <p className="mt-0.5 leading-relaxed">
              All package tracking logs are updated in real-time. Since we operate on 100% Cash on Delivery, you only pay once the package reaches your doorstep and you verify it.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
