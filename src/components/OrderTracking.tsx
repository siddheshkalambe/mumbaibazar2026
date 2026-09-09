import { useState } from 'react';
import { Order, OrderStatus } from '../types.js';
import { CheckCircle2, Circle, Clock, Printer, Download, MapPin, Phone, User, ShoppingBag, ArrowLeft } from 'lucide-react';

interface OrderTrackingProps {
  order: Order;
  onBack: () => void;
  onBuyAgain?: (order: Order) => void;
}

export default function OrderTracking({ order: initialOrder, onBack, onBuyAgain }: OrderTrackingProps) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [showPrintToast, setShowPrintToast] = useState(false);

  // Define steps for our timeline
  const ORDER_STEPS: OrderStatus[] = [
    'Pending',
    'Accepted',
    'Processing',
    'Packed',
    'Shipped',
    'Out For Delivery',
    'Delivered'
  ];

  // Refresh order state helper
  const handleRefresh = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const list = await res.json();
        const found = list.find((o: Order) => o.id === order.id);
        if (found) {
          setOrder(found);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Determine active step index
  let activeIndex = ORDER_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'Cancelled';
  const isRejected = order.status === 'Rejected';

  // Printer support
  const handlePrint = () => {
    // Attempt browser window.print() inside iframe as fallback
    try {
      window.print();
    } catch (e) {
      console.warn("Iframe printed blocked by sandboxing.", e);
    }

    // Generate premium self-contained printable invoice document with automatic print command
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * (1 - item.discount / 100) * item.quantity), 0);
    const discountRow = order.couponDiscount && order.couponDiscount > 0 
      ? `<div class="total-row" style="display: flex; justify-content: space-between; padding: 6px 0; color: #10b981; font-weight: 600;">
          <span>Applied Coupon Discount (${order.couponCode || 'COUPON'}):</span>
          <span>- ₹${Math.round(order.couponDiscount)}</span>
         </div>`
      : '';

    const itemsRows = order.items.map(item => {
      const discountedPrice = Math.round(item.price * (1 - item.discount / 100));
      return `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #F3EAE0; text-align: left;">
            <p style="margin: 0; font-weight: 700; color: #332317; font-size: 13px;">${item.title}</p>
            <p style="margin: 3px 0 0 0; font-size: 10px; color: #A28269; font-weight: 500;">Vendor Store ID: ${item.sellerId}</p>
          </td>
          <td style="padding: 14px 0; border-bottom: 1px solid #F3EAE0; text-align: center; font-family: monospace; font-weight: 600; color: #5D4330;">₹${discountedPrice}</td>
          <td style="padding: 14px 0; border-bottom: 1px solid #F3EAE0; text-align: center; font-weight: 700; color: #332317;">${item.quantity}</td>
          <td style="padding: 14px 0; border-bottom: 1px solid #F3EAE0; text-align: right; font-family: monospace; font-weight: 700; color: #332317;">₹${discountedPrice * item.quantity}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mumbai Bazar Invoice - Order #${order.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #FAF5EE;
      color: #332317;
      margin: 0;
      padding: 30px 15px;
    }
    .invoice-card {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #EADECF;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 12px 32px rgba(70, 49, 34, 0.05);
      box-sizing: border-box;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #F3EAE0;
      padding-bottom: 20px;
    }
    .brand {
      color: #D4A325;
      font-size: 26px;
      font-weight: 900;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 10px;
      color: #A28269;
      margin: 4px 0 0 0;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .brand-addr {
      font-size: 12px;
      color: #75553F;
      margin: 8px 0 0 0;
      line-height: 1.4;
    }
    .title {
      font-size: 18px;
      font-weight: 900;
      margin: 0;
      color: #463122;
      letter-spacing: -0.01em;
    }
    .order-meta {
      font-size: 12px;
      color: #75553F;
      margin: 6px 0 0 0;
      line-height: 1.5;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 24px;
      padding-bottom: 24px;
      border-bottom: 2px solid #F3EAE0;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      color: #B79B83;
      letter-spacing: 0.1em;
      margin-bottom: 10px;
      display: block;
    }
    .info-block p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #5D4330;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    .table th {
      border-bottom: 2px solid #F3EAE0;
      padding: 10px 0;
      text-align: left;
      color: #A28269;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
    }
    .totals-container {
      border-top: 2px solid #F3EAE0;
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
      color: #5D4330;
    }
    .grand-total {
      border-top: 2px solid #DDCBB8;
      padding-top: 10px;
      margin-top: 6px;
      font-weight: 900;
      font-size: 16px;
      color: #D4A325;
    }
    .footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #F3EAE0;
      text-align: center;
      font-size: 11px;
      color: #B79B83;
      line-height: 1.5;
    }
    .print-notice {
      text-align: center;
      background: #FFFBF2;
      border: 1px solid #F9E0A4;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #8E6512;
      font-weight: 600;
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
      🖨️ <strong>MUMBAI BAZAR print-ready billing.</strong> Your browser printer setup has been triggered. If the dialog did not open automatically, please press <strong>Ctrl + P</strong> (or <strong>Cmd + P</strong>) to print or save as a digital PDF receipt.
    </div>
    
    <div class="header">
      <div>
        <h1 class="brand">MUMBAI BAZAR</h1>
        <p class="brand-sub">Multi-Vendor E-Commerce Marketplace Hub</p>
        <p class="brand-addr">Crawford Market, Fort, South Mumbai, MH - 400001</p>
      </div>
      <div style="text-align: right;">
        <h2 class="title">INVOICE BILLING</h2>
        <p class="order-meta">
          <strong>Order ID:</strong> <span style="font-family: monospace;">#${order.id}</span><br>
          <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}<br>
          <strong>Payment:</strong> Cash on Delivery (COD)
        </p>
      </div>
    </div>

    <div class="grid">
      <div class="info-block">
        <span class="section-title">Customer Details</span>
        <p><strong>Name:</strong> ${order.buyerName}</p>
        <p><strong>Email:</strong> ${order.buyerEmail}</p>
        <p><strong>Phone:</strong> ${order.phoneNumber}</p>
      </div>
      <div class="info-block">
        <span class="section-title">Delivery Destination</span>
        <p>${order.shippingAddress}</p>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item Specifications</th>
          <th style="text-align: center;">Unit Price</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals-container">
      <div class="totals">
        <div class="total-row">
          <span>Subtotal Amount:</span>
          <span style="font-family: monospace; font-weight: 600;">₹${Math.round(subtotal)}</span>
        </div>
        ${discountRow}
        <div class="total-row">
          <span>Shipping & Delivery Charge:</span>
          <span style="font-family: monospace; font-weight: 600;">${order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}</span>
        </div>
        <div class="total-row grand-total">
          <span>Grand Total:</span>
          <span style="font-family: monospace;">₹${order.grandTotal}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p style="font-weight: 700; margin: 0 0 4px 0;">Thank you for shopping at Mumbai Bazar!</p>
      <p style="margin: 0;">This is a computer-generated cash memo invoice under the single Cash on Delivery (COD) marketplace framework.</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    }
  </script>
</body>
</html>`;

    // Download the premium invoice file instantly
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mumbai_Bazar_Invoice_${order.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show temporary confirmation toast
    setShowPrintToast(true);
    setTimeout(() => {
      setShowPrintToast(false);
    }, 4500);
  };

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-screen py-8 transition-colors print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 print:px-0">
        
        {/* Back navigation */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-850 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders History
          </button>
          <button
            onClick={handleRefresh}
            className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
          >
            Refresh Status
          </button>
        </div>

        <div className="space-y-6">
          
          {showPrintToast && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-2xl p-4 text-xs font-semibold flex items-center justify-between gap-3 animate-bounce-subtle print:hidden shadow-sm">
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Invoice Ready!</strong> We've saved a printable billing file (<strong>Mumbai_Bazar_Invoice_${order.id}.html</strong>) directly to your downloads. Open the file to view, save as PDF, or print immediately.
                </span>
              </span>
              <button 
                onClick={() => setShowPrintToast(false)} 
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Tracking Status Banner */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-150 dark:border-zinc-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors print:hidden">
            <div>
              <p className="text-xs text-stone-400 font-semibold uppercase">Fulfillment Status</p>
              <h1 className="text-xl font-black text-stone-900 dark:text-white mt-1">
                Order <span className="font-mono text-amber-600">#{order.id}</span> is{' '}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                  isCancelled || isRejected 
                    ? 'bg-red-100 text-red-600' 
                    : order.status === 'Delivered' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-amber-100 text-amber-600'
                }`}>
                  {order.status}
                </span>
              </h1>
              <p className="text-xs text-stone-500 mt-2">
                Placed on {new Date(order.createdAt).toLocaleDateString([], { dateStyle: 'medium' })} • COD Payment Method
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 text-stone-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Bill
              </button>
              {onBuyAgain && (
                <button
                  onClick={() => onBuyAgain(order)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  Buy These Items Again
                </button>
              )}
            </div>
          </div>

          {/* Timeline Display Card */}
          {!isCancelled && !isRejected && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-150 dark:border-zinc-800 p-6 shadow-sm transition-colors print:hidden">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-800 dark:text-zinc-200 mb-6">Delivery Timeline Tracker</h2>
              
              <div className="relative pl-6 space-y-6">
                
                {/* Visual Line */}
                <div className="absolute top-2.5 bottom-2.5 left-[11px] w-0.5 bg-stone-100 dark:bg-zinc-800" />

                {ORDER_STEPS.map((step, idx) => {
                  const isDone = idx <= activeIndex;
                  const isCurrent = idx === activeIndex;
                  const log = order.timeline.find(t => t.status === step);

                  return (
                    <div key={step} className="relative flex gap-4 text-xs">
                      
                      {/* Circle Dot marker */}
                      <div className="absolute -left-[21px] top-0.5 bg-white dark:bg-zinc-900 rounded-full z-10">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                        ) : (
                          <Circle className="w-5 h-5 text-stone-200 dark:text-zinc-800" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-black uppercase tracking-wider ${isCurrent ? 'text-amber-500 text-sm' : isDone ? 'text-stone-800 dark:text-zinc-200' : 'text-stone-400 dark:text-zinc-500'}`}>
                            {step}
                          </p>
                          {log && (
                            <span className="text-[10px] text-stone-400 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {log ? (
                          <p className="text-stone-500 dark:text-zinc-400 mt-1 bg-stone-50 dark:bg-zinc-850/60 p-2.5 border border-stone-100 dark:border-zinc-800 rounded-xl leading-relaxed">{log.note}</p>
                        ) : (
                          <p className="text-stone-400 dark:text-zinc-550 mt-0.5 italic">Awaiting dispatch checkpoint</p>
                        )}
                      </div>

                    </div>
                  );
                })}

              </div>
            </div>
          )}

          {/* Cancelled/Rejected state message */}
          {(isCancelled || isRejected) && (
            <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/40 rounded-2xl p-6 text-center print:hidden">
              <p className="text-red-600 dark:text-red-400 font-extrabold text-base">This Order was {order.status}</p>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {order.timeline[order.timeline.length - 1]?.note || "This order status has been updated. Please contact support or seller vendor for details."}
              </p>
            </div>
          )}

          {/* Premium Invoice / Receipt Printable Panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-stone-150 dark:border-zinc-800 p-8 shadow-sm transition-colors print:border-none print:shadow-none">
            
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-stone-100 dark:border-zinc-800 pb-6">
              <div>
                <h1 className="text-2xl font-black text-amber-500 tracking-tight">MUMBAI BAZAR</h1>
                <p className="text-[10px] text-stone-400 mt-1">Multi-Vendor E-Commerce Marketplace Hub</p>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-2">Crawford Market, Fort, South Mumbai, MH - 400001</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-black text-stone-800 dark:text-zinc-200">INVOICE BILLING</h2>
                <p className="text-xs font-bold text-stone-400 mt-1 uppercase">Order ID: <span className="font-mono text-stone-800 dark:text-white">#{order.id}</span></p>
                <p className="text-xs text-stone-500 mt-1">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Billing addresses details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-stone-50 dark:border-zinc-850">
              
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Customer Details</span>
                <div className="text-xs space-y-1 text-stone-600 dark:text-zinc-350">
                  <p className="font-bold text-stone-850 dark:text-white flex items-center gap-1"><User className="w-3.5 h-3.5" /> {order.buyerName}</p>
                  <p className="font-mono">{order.buyerEmail}</p>
                  <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {order.phoneNumber}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Delivery Destination</span>
                <p className="text-xs text-stone-600 dark:text-zinc-350 flex items-start gap-1 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-stone-400 flex-shrink-0" />
                  {order.shippingAddress}
                </p>
              </div>

            </div>

            {/* Items Listing Table */}
            <div className="py-6 overflow-x-auto">
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-4">Purchased Catalog Items</span>
              <table className="w-full min-w-[500px] text-xs text-left">
                <thead>
                  <tr className="border-b border-stone-100 dark:border-zinc-800 text-stone-400 font-bold">
                    <th className="py-2">Item Specifications</th>
                    <th className="py-2 text-center">Unit Price</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 dark:divide-zinc-850/60">
                  {order.items.map((item, idx) => {
                    const discountedPrice = item.price * (1 - item.discount/100);
                    return (
                      <tr key={idx} className="text-stone-700 dark:text-zinc-300">
                        <td className="py-3 pr-4">
                          <p className="font-bold text-stone-900 dark:text-white leading-normal">{item.title}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">Vendor Store ID: {item.sellerId}</p>
                        </td>
                        <td className="py-3 text-center font-mono font-semibold">₹{Math.round(discountedPrice)}</td>
                        <td className="py-3 text-center font-bold font-mono">{item.quantity}</td>
                        <td className="py-3 text-right font-bold font-mono text-stone-900 dark:text-white">
                          ₹{Math.round(discountedPrice * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bill summation footer */}
            <div className="border-t border-stone-100 dark:border-zinc-800 pt-6">
              <div className="w-full sm:w-80 ml-auto space-y-2.5 text-xs text-stone-600 dark:text-zinc-400">
                
                <div className="flex justify-between">
                  <span>Subtotal Amount</span>
                  <span className="font-mono font-bold text-stone-850 dark:text-white">
                    ₹{Math.round(order.items.reduce((sum, item) => sum + (item.price * (1 - item.discount/100) * item.quantity), 0))}
                  </span>
                </div>

                {order.couponDiscount && order.couponDiscount > 0 ? (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Applied Coupon Discount ({order.couponCode})</span>
                    <span className="font-mono">- ₹{Math.round(order.couponDiscount)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between">
                  <span>Shipping & Delivery Charge</span>
                  <span className="font-mono font-bold text-stone-850 dark:text-white">
                    {order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}
                  </span>
                </div>

                <div className="flex justify-between border-t border-stone-50 dark:border-zinc-850 pt-2 text-sm font-black text-stone-900 dark:text-white">
                  <span>Grand Total (COD Cash Due)</span>
                  <span className="font-mono text-amber-500">₹{order.grandTotal}</span>
                </div>

              </div>
            </div>

            {/* Bottom Disclaimer */}
            <div className="mt-12 pt-6 border-t border-stone-50 dark:border-zinc-850 text-center text-[10px] text-stone-400 space-y-1">
              <p className="font-bold">Thank you for shopping at Mumbai Bazar!</p>
              <p>This is a computer-generated cash memo invoice under the single Cash on Delivery (COD) marketplace framework.</p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
