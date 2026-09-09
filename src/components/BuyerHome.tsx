import React, { useState, useEffect } from 'react';
import { Product, Category, User } from '../types.js';
import { Filter, Star, Heart, ShoppingCart, ArrowUpDown, ChevronLeft, ChevronRight, Tag, HelpCircle, Check, Info, ShieldAlert, Sparkles, Clock, BadgeHelp } from 'lucide-react';

interface BuyerHomeProps {
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  searchValue: string;
  currentUser: User | null;
}

export default function BuyerHome({ onProductClick, onAddToCart, searchValue, currentUser }: BuyerHomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filtering & Sorting State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedSort, setSelectedSort] = useState<string>('Newest');
  const [selectedTag, setSelectedTag] = useState<string>(''); // Trending, Popular, Best Selling, Flash Sale etc.
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('mumbai_bazar_wishlist') || '[]');
  });

  // Main Banners/Sliders state
  const [currentSlide, setCurrentSlide] = useState(0);
 const banners = [
  {
    id: 1,
    title: "Mumbai Bazar Grand Opening 🎉",
    desc: "Shop from hundreds of trusted local sellers across Mumbai. Fashion, Electronics, Grocery, Home Decor, Beauty and much more—all in one marketplace.",
    tag: "New Arrival",
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    title: "Ganesh Chaturthi Festival Offers 🪔",
    desc: "Celebrate with exclusive discounts on idols, decorations, pooja essentials, sweets, flowers and festive gifts from local vendors.",
    tag: "Festival Sale",
    image: "https://images.unsplash.com/photo-1561375545-be02bfdf0b87?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    title: "Fashion Week Specials 👗",
    desc: "Discover trending ethnic wear, western outfits, handbags, footwear and accessories from Mumbai's top fashion sellers.",
    tag: "Trending",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    title: "Electronics Mega Deals 💻",
    desc: "Best prices on laptops, smartphones, headphones, smartwatches and accessories with exciting daily offers.",
    tag: "Hot Deals",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 5,
    title: "Fresh Grocery Delivered 🛒",
    desc: "Fresh fruits, vegetables, dairy products, spices and household essentials delivered straight to your doorstep.",
    tag: "Daily Essentials",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 6,
    title: "Home & Living Collection 🏡",
    desc: "Upgrade your home with stylish furniture, décor, lighting, kitchen essentials and premium home accessories.",
    tag: "Top Picks",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 7,
    title: "Beauty & Personal Care 💄",
    desc: "Explore skincare, cosmetics, perfumes, wellness products and grooming essentials from trusted brands.",
    tag: "Best Sellers",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 8,
    title: "Monsoon Mega Sale 🌧️",
    desc: "Rainwear, umbrellas, waterproof bags, footwear and monsoon essentials with discounts up to 50% OFF.",
    tag: "Flash Sale",
    image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 9,
    title: "Support Local Mumbai Sellers ❤️",
    desc: "Every purchase helps local businesses grow. Discover unique products from verified sellers across Mumbai.",
    tag: "Local Business",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: 10,
    title: "Today's Flash Deals ⚡",
    desc: "Limited-time offers on fashion, electronics, groceries and home essentials. Grab your favorites before they're gone.",
    tag: "Limited Time",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80",
  },
];

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, []);

  // Fetch categories and products
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const catRes = await fetch('/api/categories');
        const prodRes = await fetch(`/api/products?search=${encodeURIComponent(searchValue)}`);
        
        if (catRes.ok && prodRes.ok) {
          const cats = await catRes.json();
          let prods = await prodRes.json();
          
          const token = localStorage.getItem('mumbai_bazar_token');
          if (currentUser && currentUser.role === 'seller' && token) {
            try {
              const ownRes = await fetch('/api/products-all', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (ownRes.ok) {
                const ownProds = await ownRes.json();
                const merged = [...ownProds];
                prods.forEach((p: Product) => {
                  if (!merged.some(m => m.id === p.id)) {
                    merged.push(p);
                  }
                });
                prods = merged;
              }
            } catch (e) {
              console.error("Error fetching seller custom products", e);
            }
          }
          
          setCategories(cats.filter((c: Category) => c.isActive));
          setProducts(prods);
        }
      } catch (err) {
        console.error("Error loading marketplace catalog", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [searchValue, currentUser]);

  // Handle local Wishlist toggles
  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (wishlist.includes(productId)) {
      updated = wishlist.filter(id => id !== productId);
    } else {
      updated = [...wishlist, productId];
    }
    setWishlist(updated);
    localStorage.setItem('mumbai_bazar_wishlist', JSON.stringify(updated));
  };

  // Filter local products to cover rich tags
  const getFilteredProducts = () => {
    let list = [...products];

    if (selectedCategory) {
      list = list.filter(p => p.category === selectedCategory);
    }

    // Price range calculation including discounts
    list = list.filter(p => {
      const finalPrice = p.price * (1 - p.discount/100);
      return finalPrice >= minPrice && finalPrice <= maxPrice;
    });

    if (minRating > 0) {
      list = list.filter(p => p.rating >= minRating);
    }

    // Dynamic label tags filtering
    if (selectedTag === 'Best Selling') {
      list = list.filter(p => p.rating >= 4.7);
    } else if (selectedTag === 'Offers') {
      list = list.filter(p => p.discount >= 15);
    } else if (selectedTag === 'Trending') {
      list = list.filter(p => p.stock < 50); // mock trending for items with higher purchase frequency
    } else if (selectedTag === 'Flash Sale') {
      list = list.filter(p => p.discount >= 20);
    } else if (selectedTag === 'Recently Added') {
      list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Sort order
    if (selectedSort === 'Newest') {
      list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (selectedSort === 'priceAsc') {
      list.sort((a,b) => (a.price * (1 - a.discount/100)) - (b.price * (1 - b.discount/100)));
    } else if (selectedSort === 'priceDesc') {
      list.sort((a,b) => (b.price * (1 - b.discount/100)) - (a.price * (1 - a.discount/100)));
    } else if (selectedSort === 'ratingDesc') {
      list.sort((a,b) => b.rating - a.rating);
    }

    return list;
  };

  const filteredProducts = getFilteredProducts();

  return (
    <div className="bg-white dark:bg-zinc-950 min-h-screen transition-colors">
      
      <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-64px)]">
        
        {/* 1. Left Vertical Categories Sidebar (Sticky & Scrollable) */}
        <div className="w-16 sm:w-20 md:w-24 lg:w-28 border-r border-stone-200/40 dark:border-zinc-800/60 sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto bg-[#f4f6fb] dark:bg-[#151515] select-none flex-shrink-0 z-20 scrollbar-none flex flex-col">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isActive ? '' : cat.name)}
                className={`w-full flex flex-col items-center justify-center py-4 px-1 relative border-b border-stone-100 dark:border-zinc-900/40 transition-all group cursor-pointer ${
                  isActive 
                    ? 'bg-white dark:bg-zinc-900 font-extrabold text-emerald-600 dark:text-emerald-400' 
                    : 'bg-[#f4f6fb] dark:bg-[#151515] text-stone-500 dark:text-zinc-400 hover:bg-stone-200/30 dark:hover:bg-zinc-900/20'
                }`}
              >
                {/* Active Left Accent Line */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600 dark:bg-emerald-400 rounded-r" />
                )}
                
                {/* Category circular thumbnail */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden mb-1.5 p-0.5 bg-stone-50 dark:bg-zinc-850 border transition-all ${
                  isActive 
                    ? 'border-emerald-600 dark:border-emerald-400 scale-105 shadow-xs' 
                    : 'border-stone-200/50 dark:border-zinc-800 group-hover:scale-105'
                }`}>
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-full" />
                </div>
                
                {/* Category label name */}
                <span className={`text-[9px] sm:text-[10px] md:text-[11px] font-bold text-center leading-tight tracking-tight px-1 transition-colors w-full break-words line-clamp-2 ${
                  isActive 
                    ? 'text-emerald-600 dark:text-emerald-450' 
                    : 'text-stone-600 dark:text-zinc-400 group-hover:text-stone-900 dark:group-hover:text-white'
                }`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2. Right Main Content Area (Banners, Tags, Horizontal Filters, Product Grid) */}
        <div className="flex-1 min-w-0 p-3 sm:p-5 md:p-6 space-y-5 overflow-y-auto">
          
          {/* Carousel Banner Panel (Compact and fitted inside main panel) */}
          {searchValue === "" && (
            <div className="relative w-full h-[150px] sm:h-[220px] md:h-[260px] overflow-hidden bg-stone-900 rounded-2xl border border-stone-200/40 dark:border-zinc-800 shadow-xs">
              {banners.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-stone-900/40 to-transparent z-10" />
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5 sm:px-10 md:px-14 z-20 max-w-xl text-white">
                    <span className="inline-block px-2.5 py-0.5 bg-amber-500 text-stone-950 font-bold text-[9px] uppercase tracking-wider rounded-md mb-2 w-max">
                      {slide.tag}
                    </span>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight mb-2 drop-shadow-sm">
                      {slide.title}
                    </h1>
                    <p className="text-stone-200 text-[10px] sm:text-xs leading-relaxed mb-4 line-clamp-2">
                      {slide.desc}
                    </p>
                    <div className="flex gap-2.5">
                      <button 
                        onClick={() => setSelectedTag('Offers')}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-[10px] sm:text-xs rounded-lg transition-all shadow-sm transform hover:scale-102 cursor-pointer"
                      >
                        Shop Offers
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Dots navigation */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${idx === currentSlide ? 'bg-amber-500 w-4' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Filter Tags bar */}
          <div className="flex flex-wrap gap-1.5 py-1.5 border-y border-stone-200/50 dark:border-zinc-800/60 overflow-x-auto scrollbar-none">
            {(['All Products', 'Trending', 'Popular', 'Best Selling', 'Offers', 'Flash Sale', 'Recently Added'] as string[]).map((tag) => {
              const isSelected = selectedTag === tag || (tag === 'All Products' && selectedTag === '');
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === 'All Products' ? '' : tag)}
                  className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected 
                      ? 'bg-amber-500 text-stone-950 shadow-xs' 
                      : 'bg-white dark:bg-zinc-900 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 border border-stone-150 dark:border-zinc-850'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>



          {/* Section Heading Label */}
          <div className="border-b border-stone-200/50 dark:border-zinc-800 pb-2">
            <h2 className="text-lg md:text-xl font-black text-stone-900 dark:text-white tracking-tight">
              {selectedCategory ? `${selectedCategory} Online` : 'All Grocery Categories'}
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-400 dark:text-zinc-500">
              {selectedCategory 
                ? `Fresh, Crawford Market-rate ${selectedCategory.toLowerCase()} delivered right to your doorstep.` 
                : 'Browse fresh ingredients, snacks, dairy and daily essentials delivered in minutes.'}
            </p>
          </div>

          {/* 3. Core Product Grid Pane */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 h-72 rounded-2xl border border-stone-150 dark:border-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-150 dark:border-zinc-800 text-center py-16 px-4">
              <div className="w-12 h-12 bg-stone-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Tag className="w-6 h-6 text-stone-400" />
              </div>
              <h3 className="text-base font-extrabold text-stone-850 dark:text-white">No products found</h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                No items match your filters or search value. Try adjusting the price slider or resetting criteria.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setMinPrice(0);
                  setMaxPrice(5000);
                  setMinRating(0);
                  setSelectedTag('');
                }}
                className="mt-4 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-lg cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => {
                const finalPrice = p.price * (1 - p.discount/100);
                const isLowStock = p.stock > 0 && p.stock <= 5;
                const isOutOfStock = p.stock === 0;
                const isSellerPreview = p.status && p.status !== 'Approved';

                // Consistent delivery time based on ID
                const getDeliveryTime = (pId: string) => {
                  const num = (pId.charCodeAt(0) + pId.charCodeAt(pId.length - 1)) % 8 + 9;
                  return `${num} MINS`;
                };

                return (
                  <div
                    key={p.id}
                    onClick={() => onProductClick(p)}
                    className={`group bg-white dark:bg-zinc-900 rounded-2xl border overflow-hidden p-2.5 sm:p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] transition-all duration-300 cursor-pointer flex flex-col justify-between relative ${
                      isSellerPreview 
                        ? 'border-dashed border-amber-400 dark:border-amber-600/60 bg-amber-50/5 dark:bg-amber-950/5' 
                        : 'border-stone-150/60 dark:border-zinc-800/60 hover:border-emerald-500/85 dark:hover:border-emerald-500/85'
                    }`}
                  >
                    
                    {/* Image Block with Padding */}
                    <div className="h-32 sm:h-40 w-full relative bg-white dark:bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center p-2.5 border border-stone-50 dark:border-zinc-850/20">
                      <img
                        src={p.primaryImage}
                        alt={p.title}
                        className="w-full h-full object-contain group-hover:scale-105 transform transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Wishlist Button */}
                      <button
                        onClick={(e) => toggleWishlist(p.id, e)}
                        className="absolute top-2 right-2 p-1.5 bg-white/95 dark:bg-zinc-900/95 hover:bg-amber-500/10 hover:text-amber-500 rounded-full shadow-xs transition-all cursor-pointer z-10 text-stone-500 dark:text-zinc-400"
                      >
                        <Heart className={`w-3.5 h-3.5 ${wishlist.includes(p.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>

                      {/* Top Left Discount Flag */}
                      {p.discount > 0 && !isSellerPreview ? (
                        <div className="absolute top-0 left-0 bg-[#2b66f6] text-white text-[9px] font-black px-2 py-1 rounded-br-xl uppercase tracking-wider shadow-xs z-10">
                          {p.discount}% OFF
                        </div>
                      ) : null}

                      {/* Status Overlay or Badge */}
                      {isSellerPreview ? (
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-amber-500 text-stone-950 font-black text-[8px] rounded-md uppercase tracking-wider shadow-sm flex items-center gap-1 z-10">
                          <Clock className="w-2.5 h-2.5" />
                          Pending Approval
                        </span>
                      ) : currentUser && currentUser.role === 'seller' && p.sellerId === currentUser.id ? (
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-emerald-500 text-white font-black text-[8px] rounded-md uppercase tracking-wider shadow-xs flex items-center gap-1 z-10">
                          <Sparkles className="w-2.5 h-2.5" />
                          My Shop
                        </span>
                      ) : null}

                      {/* Sold Out Cover */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                          <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-[9px] rounded-md uppercase tracking-widest shadow">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meta specifications & delivery times */}
                    <div className="mt-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Instant Delivery Badge */}
                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-stone-500 dark:text-zinc-400 mb-1">
                          <Clock className="w-3 h-3 text-stone-400 dark:text-zinc-500" />
                          <span className="tracking-wide uppercase">{getDeliveryTime(p.id)}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-[13px] font-extrabold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug min-h-[2.2rem] mt-1">
                          {p.title}
                        </h3>

                        {/* Weight/Variant specification */}
                        <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-semibold block mt-0.5">
                          {p.weight || '500 ml'}
                        </span>
                      </div>

                      {/* Bottom Price & Blinkit ADD Button Row */}
                      <div className="flex items-center justify-between mt-3 pt-2">
                        <div className="flex flex-col justify-center">
                          <span className="text-[13px] sm:text-sm font-extrabold text-stone-900 dark:text-white font-sans leading-none">
                            ₹{Math.round(finalPrice)}
                          </span>
                          {p.discount > 0 && (
                            <span className="text-[11px] text-stone-400 dark:text-zinc-500 line-through leading-none mt-1 font-sans">
                              ₹{p.price}
                            </span>
                          )}
                        </div>

                        {/* Emerald Green ADD button */}
                        {!isOutOfStock ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(p, 1);
                            }}
                            className="px-5 py-1 border border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 active:scale-95 text-[11px] font-black rounded-lg transition-all shadow-xs cursor-pointer bg-white dark:bg-zinc-900 uppercase tracking-widest text-center min-w-[70px]"
                          >
                            ADD
                          </button>
                        ) : (
                          <span className="text-[9px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            Out of Stock
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
