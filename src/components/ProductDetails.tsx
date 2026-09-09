import React, { useState, useEffect } from 'react';
import { Product, User, ProductReview } from '../types.js';
import { useToast } from '../context/ToastContext.tsx';
import { Star, Heart, ShoppingCart, ArrowLeft, ShieldCheck, RefreshCw, Truck, Trash, Share2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
  currentUser: User | null;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onProductClick: (product: Product) => void;
}

export default function ProductDetails({
  product: initialProduct,
  currentUser,
  onBack,
  onAddToCart,
  onProductClick
}: ProductDetailsProps) {
  const { success, error, info } = useToast();
  const [product, setProduct] = useState<Product>(initialProduct);
  const [selectedImage, setSelectedImage] = useState(initialProduct.primaryImage);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ backgroundPosition: '0% 0%' });
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  
  // Review inputs
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [postingReview, setPostingReview] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('mumbai_bazar_wishlist') || '[]');
  });

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
        console.error('Failed to load settings in ProductDetails:', err);
      }
    };
    fetchSettings();
  }, []);

  const finalPrice = product.price * (1 - product.discount/100);

  const images = product.images && product.images.length > 0 ? product.images : [product.primaryImage];
  const currentIndex = images.indexOf(selectedImage) !== -1 ? images.indexOf(selectedImage) : 0;

  const handlePrevImage = () => {
    const prevIdx = (currentIndex - 1 + images.length) % images.length;
    setSelectedImage(images[prevIdx]);
  };

  const handleNextImage = () => {
    const nextIdx = (currentIndex + 1) % images.length;
    setSelectedImage(images[nextIdx]);
  };

  // Sync state if initial product prop changes
  useEffect(() => {
    setProduct(initialProduct);
    setSelectedImage(initialProduct.primaryImage);
    setQuantity(1);
    fetchProductDetails(initialProduct.id);
  }, [initialProduct]);

  // Retrieve fresh product (with updated reviews) and related category items
  const fetchProductDetails = async (id: string) => {
    try {
      const prodRes = await fetch(`/api/products/${id}`);
      if (prodRes.ok) {
        const fresh = await prodRes.json();
        setProduct(fresh);
      }
      
      const listRes = await fetch(`/api/products?category=${encodeURIComponent(initialProduct.category)}`);
      if (listRes.ok) {
        const list = await listRes.json();
        setRelatedProducts(list.filter((p: Product) => p.id !== id).slice(0, 4));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Image Zoom on Hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      backgroundImage: `url(${selectedImage})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '200%'
    });
  };

  // Submit fresh review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');
    setPostingReview(true);

    if (!commentInput.trim()) {
      setReviewError('Review comment cannot be empty.');
      setPostingReview(false);
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({ rating: ratingInput, comment: commentInput })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviewSuccess('Review posted successfully! Thank you for sharing.');
      setCommentInput('');
      setRatingInput(5);
      // reload product details
      fetchProductDetails(product.id);
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setPostingReview(false);
    }
  };

  // Delete review (Review owner or Admin/SuperAdmin)
  const handleDeleteReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/products/${product.id}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` }
      });
      if (res.ok) {
        success('Review deleted successfully.', 'Review Removed');
        fetchProductDetails(product.id);
      } else {
        const data = await res.json();
        error(data.error || 'Failed to delete review');
      }
    } catch (err) {
      console.error(err);
      error('An error occurred while deleting the review.');
    }
  };

  // Wishlist helper
  const toggleWishlist = () => {
    let updated;
    if (wishlist.includes(product.id)) {
      updated = wishlist.filter(id => id !== product.id);
      info(`Removed "${product.title}" from wishlist.`, 'Wishlist Updated');
    } else {
      updated = [...wishlist, product.id];
      success(`Added "${product.title}" to wishlist!`, 'Saved to Wishlist');
    }
    setWishlist(updated);
    localStorage.setItem('mumbai_bazar_wishlist', JSON.stringify(updated));
  };

  // Simple copy share link simulator
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    success('Product link copied to clipboard!', 'Link Copied');
  };

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-screen py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back navigation line */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-500 dark:text-zinc-400 hover:text-stone-850 dark:hover:text-white mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bazaar Marketplace
        </button>

        {/* Primary details card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-stone-150 dark:border-zinc-800 shadow-sm overflow-hidden p-6 md:p-10 transition-colors">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-14">
            
            {/* Left Image Section */}
            <div className="space-y-4">
              
              <div className="relative group/carousel">
                {/* Main zoomable display frame */}
                <div 
                  className="w-full h-80 md:h-[420px] rounded-2xl border border-stone-100 dark:border-zinc-800 bg-stone-50 overflow-hidden relative cursor-zoom-in group"
                  onMouseMove={handleMouseMove}
                  style={{
                    backgroundImage: `url(${selectedImage})`,
                    backgroundSize: '100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {/* Real-time Hover magnify block */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={zoomStyle}
                  />
                </div>

                {/* Left navigation arrow */}
                {images.length > 1 && (
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-stone-800 dark:text-white p-2.5 rounded-full border border-stone-200 dark:border-zinc-700 shadow-md transition-all cursor-pointer z-10 hover:scale-110 active:scale-95 flex items-center justify-center opacity-70 group-hover/carousel:opacity-100"
                    title="Previous Image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {/* Right navigation arrow */}
                {images.length > 1 && (
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-stone-800 dark:text-white p-2.5 rounded-full border border-stone-200 dark:border-zinc-700 shadow-md transition-all cursor-pointer z-10 hover:scale-110 active:scale-95 flex items-center justify-center opacity-70 group-hover/carousel:opacity-100"
                    title="Next Image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {/* Dots indicator */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/45 backdrop-blur-xs px-3 py-1.5 rounded-full z-10">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(images[i])}
                        className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                          currentIndex === i ? 'bg-amber-400 w-5' : 'bg-white/60 hover:bg-white'
                        }`}
                        title={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Gallery thumbnails */}
              <div className="flex gap-3 overflow-x-auto py-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`w-18 h-18 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                      selectedImage === img ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-stone-100 dark:border-zinc-800 hover:border-amber-400'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

            </div>

            {/* Right Product Summary Controls */}
            <div className="flex flex-col justify-between">
              <div>
                
                {/* Badges line */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-full">
                    {product.category}
                  </span>
                  
                  {/* Share & Wishlist button */}
                  <div className="flex gap-2">
                    <button 
                      onClick={handleShare}
                      className="p-2 hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 rounded-full transition-colors cursor-pointer"
                      title="Share product link"
                    >
                      <Share2 className="w-4.5 h-4.5" />
                    </button>
                    <button 
                      onClick={toggleWishlist}
                      className="p-2 hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                      title="Add to Wishlist"
                    >
                      <Heart className={`w-4.5 h-4.5 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white mt-4 tracking-tight leading-snug">
                  {product.title}
                </h1>

                {/* Star rating summary */}
                <div className="flex items-center gap-2 mt-3 pb-4 border-b border-stone-100 dark:border-zinc-850">
                  <div className="flex text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <span className="text-sm font-black text-stone-850 dark:text-zinc-200">{product.rating}</span>
                  <span className="text-xs text-stone-400 dark:text-zinc-500">({product.reviews.length} product reviews)</span>
                  <span className="mx-2 text-stone-200 dark:text-zinc-800">|</span>
                  <span className="text-xs text-stone-500 dark:text-zinc-400">Store Vendor: <span className="font-bold text-amber-600">{product.sellerName}</span></span>
                </div>

                {/* Price block */}
                <div className="mt-5 space-y-1">
                  {product.discount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-400 line-through">₹{product.price}</span>
                      <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-extrabold rounded">
                        Save {product.discount}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-stone-950 dark:text-white font-mono">
                      ₹{Math.round(finalPrice)}
                    </span>
                    <span className="text-xs text-stone-400">(Inclusive of all taxes)</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs md:text-sm text-stone-600 dark:text-zinc-350 leading-relaxed mt-6">
                  {product.description || "Authentic curated product directly sourced and shipped securely from local artisan markets in Mumbai."}
                </p>

                {/* Quick features specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6 py-4 px-4 bg-stone-50 dark:bg-zinc-850 rounded-2xl border border-stone-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-zinc-300">
                    <Truck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>COD Doorstep Delivery ({standardDeliveryCharge === 0 ? 'FREE' : `₹${standardDeliveryCharge} Fee`})</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-zinc-300">
                    <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{product.warranty || "No brand warranty applicable"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-zinc-300">
                    <RefreshCw className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{product.returnPolicy || "7-Days easy replacement window"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-zinc-300">
                    <span className="font-bold text-stone-500 dark:text-zinc-500">Available Stock:</span>
                    <span className={`font-black ${product.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {product.stock > 0 ? `${product.stock} Units Left` : 'Out of Stock'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Action Buttons: Quantity Counter + Cart Adder */}
              <div className="mt-8 pt-6 border-t border-stone-100 dark:border-zinc-850">
                {product.stock > 0 ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    
                    {/* Quantity selectors */}
                    <div className="flex items-center justify-between border border-stone-200 dark:border-zinc-700 rounded-xl px-2 py-1.5 bg-stone-50 dark:bg-zinc-800">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-1 font-bold text-stone-500 hover:text-stone-850 dark:hover:text-white cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-xs font-black text-stone-900 dark:text-white font-mono">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="px-3 py-1 font-bold text-stone-500 hover:text-stone-850 dark:hover:text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart button */}
                    <button
                      onClick={() => onAddToCart(product, quantity)}
                      className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-stone-950 font-black rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Shopping Cart (₹{Math.round(finalPrice * quantity)})
                    </button>

                  </div>
                ) : (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-semibold text-center rounded-xl border border-red-100 dark:border-red-900/40">
                    This item is currently sold out. Check back later!
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* Technical Specs Tab Grid */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-stone-150 dark:border-zinc-800 p-6 md:p-10 mt-8 transition-colors">
          <h2 className="text-lg font-black text-stone-950 dark:text-white mb-4 border-b border-stone-50 dark:border-zinc-850 pb-2">
            Specifications & Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-stone-50 dark:border-zinc-800/40 text-xs">
                <span className="font-semibold text-stone-400 uppercase">Product SKU</span>
                <span className="font-mono text-stone-800 dark:text-zinc-200 font-bold">{product.sku}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-50 dark:border-zinc-800/40 text-xs">
                <span className="font-semibold text-stone-400 uppercase">Item Weight</span>
                <span className="text-stone-800 dark:text-zinc-200 font-bold">{product.weight || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-50 dark:border-zinc-800/40 text-xs">
                <span className="font-semibold text-stone-400 uppercase">Dimensions</span>
                <span className="text-stone-800 dark:text-zinc-200 font-bold">{product.dimensions || "N/A"}</span>
              </div>
            </div>

            <div className="space-y-4">
              {product.specifications && product.specifications.length > 0 ? (
                product.specifications.map((spec, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-stone-50 dark:border-zinc-800/40 text-xs">
                    <span className="font-semibold text-stone-400 uppercase">{spec.key}</span>
                    <span className="text-stone-800 dark:text-zinc-200 font-bold">{spec.value}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 italic">No extra attributes specified.</p>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          
          {/* Reviews listing */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl border border-stone-150 dark:border-zinc-800 p-6 md:p-8 space-y-6 transition-colors">
            <h3 className="text-lg font-black text-stone-950 dark:text-white pb-3 border-b border-stone-100 dark:border-zinc-850">
              Customer Feedback ({product.reviews.length})
            </h3>
            
            <div className="divide-y divide-stone-50 dark:divide-zinc-850 max-h-96 overflow-y-auto pr-2">
              {product.reviews.length === 0 ? (
                <p className="text-center py-10 text-xs text-stone-400 italic">No customer reviews yet. Be the first to leave a review!</p>
              ) : (
                product.reviews.map((r) => {
                  const isOwner = currentUser && r.userId === currentUser.id;
                  const isAdmin = currentUser && ['admin', 'super_admin'].includes(currentUser.role);
                  return (
                    <div key={r.id} className="py-4 first:pt-0 last:pb-0 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={r.userAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(r.userName)}`}
                            alt=""
                            className="w-8 h-8 rounded-full border object-cover"
                          />
                          <div>
                            <p className="font-black text-stone-800 dark:text-zinc-200">{r.userName}</p>
                            <p className="text-[10px] text-stone-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Rating stars & Delete option */}
                        <div className="flex items-center gap-3">
                          <div className="flex text-amber-400">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star key={idx} className={`w-3 h-3 ${idx < r.rating ? 'fill-current' : 'text-stone-150'}`} />
                            ))}
                          </div>
                          {(isOwner || isAdmin) && (
                            <button
                              onClick={() => handleDeleteReview(r.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1 cursor-pointer"
                              title="Delete review"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-stone-600 dark:text-zinc-350 mt-3.5 leading-relaxed bg-stone-50/50 dark:bg-zinc-850/40 p-3 rounded-xl border border-stone-100/40 dark:border-zinc-800/30">
                        {r.comment}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Leave a review form (For registered buyers) */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-stone-150 dark:border-zinc-800 p-6 md:p-8 h-fit transition-colors">
            <h3 className="text-lg font-black text-stone-950 dark:text-white pb-3 border-b border-stone-100 dark:border-zinc-850">
              Submit Review
            </h3>
            
            {currentUser && currentUser.role === 'buyer' ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4 mt-4">
                
                {reviewError && <p className="text-xs text-red-500 font-bold">{reviewError}</p>}
                {reviewSuccess && <p className="text-xs text-emerald-500 font-bold">{reviewSuccess}</p>}

                {/* Stars selector */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1.5">Rating Scale</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRatingInput(val)}
                        className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star className={`w-6 h-6 ${val <= ratingInput ? 'fill-current' : 'text-stone-200 dark:text-zinc-800'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1.5">Your Feedback</label>
                  <textarea
                    rows={4}
                    required
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Share your experience preparing this chai, wear of the silk saree, etc..."
                    className="w-full p-3 bg-stone-50 dark:bg-zinc-850 text-xs text-stone-800 dark:text-white border border-stone-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={postingReview}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow transition-all cursor-pointer"
                >
                  {postingReview ? 'Posting Review...' : 'Post Review'}
                </button>
              </form>
            ) : (
              <div className="text-center py-8 text-xs text-stone-400">
                <p>Only verified customer accounts can leave product reviews.</p>
                <p className="mt-2 text-amber-500 font-bold">Please login to submit feedback.</p>
              </div>
            )}
          </div>

        </div>

        {/* Related items carousel */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-black text-stone-950 dark:text-white mb-6 tracking-tight">
              Related Specialties
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p) => {
                const finalPPrice = p.price * (1 - p.discount/100);
                return (
                  <div
                    key={p.id}
                    onClick={() => onProductClick(p)}
                    className="group bg-white dark:bg-zinc-900 rounded-2xl border border-stone-150 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer p-3 flex flex-col justify-between h-72"
                  >
                    <div className="h-32 rounded-xl overflow-hidden bg-stone-100">
                      <img src={p.primaryImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transform transition duration-300" />
                    </div>
                    <div className="mt-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">{p.brand}</span>
                        <h4 className="text-xs font-extrabold text-stone-800 dark:text-white group-hover:text-amber-500 transition-colors line-clamp-2 mt-1 leading-snug">
                          {p.title}
                        </h4>
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-stone-50 dark:border-zinc-850/50 pt-2 mt-2">
                        <span className="text-xs font-black text-stone-950 dark:text-white font-mono">₹{Math.round(finalPPrice)}</span>
                        <div className="flex items-center text-[10px] font-bold text-amber-500 gap-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{p.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
