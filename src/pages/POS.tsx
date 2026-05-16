import React, { useState, useEffect, useRef, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import './POS.css';

interface Product {
  id: string;
  name: string;
  cat: string;
  categoryCode: string;
  price: number;
  mrp: number;
  pic: string;
  details: string;
  variants: Variant[];
}

interface Variant {
  vId: string;
  price: number;
  mrp: number;
  stockQty: number;
  unitValue: string;
  unit: string;
  tax: number;
}

interface CartItem {
  id: string;
  vId: string;
  name: string;
  price: number;
  mrp: number;
  qty: number;
  unit: string;
  unitValue: string;
  tax: number;
}

interface HeldOrder {
  id: string;
  time: string;
  items: CartItem[];
  total: string;
}

const POS: React.FC = () => {
  // --- State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCart, setCurrentCart] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [orderId, setOrderId] = useState(() => `#${Math.floor(10000 + Math.random() * 90000)}`);
  const [isLightTheme, setIsLightTheme] = useState(false);
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  
  // Selection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  
  // Payment
  const [payMethod, setPayMethod] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  
  // Camera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [lastScanInfo, setLastScanInfo] = useState('No recent scan');

  // --- Firebase Loading ---
  useEffect(() => {
    const db = firebase.database();
    
    const loadAllData = async () => {
      // Try local storage cache first for speed
      const cachedProds = localStorage.getItem('pos_products');
      const cachedCats = localStorage.getItem('pos_categories');
      const cachedStock = localStorage.getItem('pos_stock');

      if (cachedProds && cachedCats && cachedStock) {
        processRawData(JSON.parse(cachedProds), JSON.parse(cachedCats), JSON.parse(cachedStock));
      }

      // Fetch fresh
      try {
        const [snapCat, snapProd, snapStock] = await Promise.all([
          db.ref('root/category').get(),
          db.ref('root/products').get(),
          db.ref('root/stock').get()
        ]);

        const newCats = snapCat.val() || {};
        const newProds = snapProd.val() || {};
        const newStock = snapStock.val() || {};

        localStorage.setItem('pos_products', JSON.stringify(newProds));
        localStorage.setItem('pos_categories', JSON.stringify(newCats));
        localStorage.setItem('pos_stock', JSON.stringify(newStock));

        processRawData(newProds, newCats, newStock);
      } catch (err) {
        console.error("Firebase load failed", err);
      }
    };

    const processRawData = (rawProds: any, rawCats: any, rawStock: any) => {
      const processed: Product[] = Object.entries(rawProds).map(([id, data]: [string, any]) => {
        const catName = rawCats[data.categoryCode]?.name || data.categoryCode || 'Uncategorized';
        const variantsNode = rawStock[id] || {};

        const variants: Variant[] = Object.entries(variantsNode).map(([vId, vData]: [string, any]) => {
          let price = parseFloat(vData.offerPrice || vData.mrp || vData.ogPrice || 0);
          let mrp = parseFloat(vData.mrp || vData.ogPrice || 0);
          return {
            vId,
            price: isNaN(price) ? 0 : price,
            mrp: isNaN(mrp) ? 0 : mrp,
            stockQty: parseInt(vData.quantity || 0),
            unitValue: vData.unitValue || '',
            unit: vData.pkg || vData.unit || data.unit || '',
            tax: parseFloat(vData.tax || 0)
          };
        });

        const displayPrice = variants.length > 0 ? variants[0].price : parseFloat(data.price || data.mrp || 0);
        const displayMrp = variants.length > 0 ? variants[0].mrp : parseFloat(data.mrp || 0);

        return {
          id,
          name: data.name || 'Unnamed Product',
          cat: catName,
          categoryCode: data.categoryCode,
          price: displayPrice,
          mrp: displayMrp,
          pic: data.pic || '',
          details: data.details || '',
          variants
        };
      });

      setProducts(processed);
      const uniqueCats = ['All', ...Array.from(new Set(processed.map(p => p.cat)))];
      setCategories(uniqueCats);
    };

    loadAllData();
  }, []);

  // --- Filtering ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'All' || p.cat === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.cat.toLowerCase().includes(searchQuery.toLowerCase());
      return searchQuery.length > 0 ? matchSearch : (matchCat && matchSearch);
    });
  }, [products, activeCategory, searchQuery]);

  // --- Totals ---
  const totals = useMemo(() => {
    const totalMRP = currentCart.reduce((sum, item) => sum + (item.mrp * item.qty), 0);
    const totalOffer = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalTax = currentCart.reduce((sum, item) => sum + (item.price * item.qty * (item.tax / 100)), 0);
    const discount = totalMRP - totalOffer;
    const grand = totalOffer + totalTax;
    return { totalMRP, totalOffer, totalTax, discount, grand };
  }, [currentCart]);

  // --- Cart Actions ---
  const addToCart = (product: Product | Partial<CartItem>, vIndex: number = 0, delta: number = 1) => {
    setCurrentCart(prev => {
      const isFullProduct = (product as Product).variants !== undefined;
      const p = product as any;
      
      let itemToMatch: Partial<CartItem>;
      
      if (isFullProduct) {
        const v = p.variants[vIndex] || { price: p.price, mrp: p.mrp, vId: 'default', unit: '', unitValue: '', tax: 0 };
        itemToMatch = {
          id: p.id,
          vId: v.vId,
          name: p.variants.length > 1 ? `${p.name} (${v.unitValue} ${v.unit})` : p.name,
          price: v.price,
          mrp: v.mrp,
          unit: v.unit,
          unitValue: v.unitValue,
          tax: v.tax
        };
      } else {
        itemToMatch = p;
      }

      const cartId = itemToMatch.id + '_' + itemToMatch.vId;
      const existingIndex = prev.findIndex(i => (i.id + '_' + i.vId) === cartId);

      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].qty += delta;
        if (newCart[existingIndex].qty <= 0) {
          newCart.splice(existingIndex, 1);
        }
        return newCart;
      } else if (delta > 0) {
        return [...prev, { ...itemToMatch, qty: delta } as CartItem];
      }
      return prev;
    });
  };

  const removeItem = (cartId: string) => {
    setCurrentCart(prev => prev.filter(i => (i.id + '_' + i.vId) !== cartId));
  };

  const handleProductClick = (p: Product) => {
    if (p.variants.length > 1) {
      setSelectedProduct(p);
      setSelectedVariantIndex(0);
      setShowVariantModal(true);
    } else {
      addToCart(p);
    }
  };

  // --- Camera Logic ---
  useEffect(() => {
    let animationFrame: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      
      ctx.strokeStyle = isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < W; i += 40) { ctx.moveTo(i, 0); ctx.lineTo(i, H); }
      for (let i = 0; i < H; i += 40) { ctx.moveTo(0, i); ctx.lineTo(W, i); }
      ctx.stroke();

      const scanY = ((Date.now() / 15) % H);
      ctx.fillStyle = isLightTheme ? 'rgba(255, 126, 103, 0.3)' : 'rgba(34, 197, 94, 0.2)';
      ctx.fillRect(0, scanY, W, 2);

      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [isLightTheme]);

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Mock scan
        setTimeout(() => {
          if (products.length > 0) {
            const randomP = products[Math.floor(Math.random() * products.length)];
            setLastScanInfo(`+1 ${randomP.name}`);
            handleProductClick(randomP);
            setTimeout(() => setLastScanInfo('No recent scan'), 2000);
          }
        }, 3000);
      } catch (err) {
        alert("Camera access failed");
      }
    }
  };

  // --- Transactions ---
  const holdTransaction = () => {
    if (currentCart.length === 0) return;
    const order: HeldOrder = {
      id: orderId,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: [...currentCart],
      total: `₹${totals.grand.toFixed(2)}`
    };
    setHeldOrders(prev => [...prev, order]);
    setCurrentCart([]);
    setOrderId(`#${Math.floor(10000 + Math.random() * 90000)}`);
  };

  const resumeOrder = (index: number) => {
    const order = heldOrders[index];
    if (currentCart.length > 0 && !confirm("Overwrite current cart?")) return;
    setOrderId(order.id);
    setCurrentCart(order.items);
    setHeldOrders(prev => prev.filter((_, i) => i !== index));
    setShowHeldModal(false);
  };

  const confirmPayment = () => {
    // In a real app, generate receipt and print
    window.print();
    setCurrentCart([]);
    setOrderId(`#${Math.floor(10000 + Math.random() * 90000)}`);
    setShowPaymentModal(false);
  };

  // --- Rendering Helpers ---
  const changeDue = Math.max(0, parseFloat(cashReceived || '0') - totals.grand);

  return (
    <div className={`pos-container ${isLightTheme ? 'light-theme' : ''}`}>
      <div className="pos-wrapper">
        <div className="pos-topbar">
          <div className="pos-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            AXIS POS
          </div>

          <div className="pos-status-row">
            <button className="pos-held-btn" onClick={() => setShowHeldModal(true)}>
              ⏸ Held {heldOrders.length > 0 && <span className="pos-badge">{heldOrders.length}</span>}
            </button>

            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

            <label className="pos-theme-switch">
              <input type="checkbox" checked={isLightTheme} onChange={e => setIsLightTheme(e.target.checked)} />
              <div className="pos-slider">
                <span style={{ fontSize: '10px', paddingLeft: '2px' }}>🌙</span>
                <span style={{ fontSize: '10px', paddingRight: '2px' }}>☀️</span>
              </div>
            </label>
          </div>
        </div>

        <div className="pos-app-container">
          {/* Left Column */}
          <div className="pos-left-col">
            <div className="pos-billing-input-wrapper">
              <div className="pos-panel-header" style={{ padding: '0 0 12px 0', border: 'none', height: 'auto' }}>
                AI Visual Scanner
              </div>
              <div className="pos-scanner-frame" onClick={toggleCamera}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: isCameraActive ? 'block' : 'none' }} 
                />
                <canvas ref={canvasRef} id="pos-cam-canvas" width={400} height={200} />
                {!isCameraActive && (
                  <div className="pos-scanner-overlay-content">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.5 }}>
                      <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3m18 8v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
                      <path d="M7 12h10" />
                      <path d="M12 9v6" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>AI SCANNER IDLE</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>Click to activate camera</div>
                  </div>
                )}
                {lastScanInfo !== 'No recent scan' && (
                  <div className="pos-latest-scan-chip">{lastScanInfo}</div>
                )}
              </div>
            </div>

            <div className="pos-products-panel">
              <div className="pos-search-container">
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              <div className="pos-categories-container">
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    className={`pos-cat-pill ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="pos-product-grid">
                {filteredProducts.map(p => (
                  <div key={p.id} className="pos-prod-tile" onClick={() => handleProductClick(p)}>
                    {p.pic ? (
                      <img src={p.pic} className="pos-prod-img" alt={p.name} loading="lazy" />
                    ) : (
                      <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', background: 'var(--bg-hover)', borderRadius: '4px', marginBottom: '8px' }}>📦</div>
                    )}
                    <div className="pos-prod-name">{p.name}</div>
                    <div className="pos-prod-cat">
                      {p.cat} {p.variants.length > 1 && <span style={{ color: 'var(--c-blue)', fontWeight: 'bold' }}>• {p.variants.length} Variants</span>}
                    </div>
                    <div className="pos-prod-price">₹{p.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button className="pos-held-btn" style={{ padding: '12px 24px' }} onClick={holdTransaction}>
                <span style={{ fontSize: '14px', marginRight: '8px' }}>⏸</span> HOLD TRANSACTION
              </button>
            </div>
          </div>

          {/* Right Column - Cart */}
          <div className="pos-right-col">
            <div className="pos-panel-header">
              Customer Order
              <span className="pos-invoice-number" style={{ fontFamily: 'var(--font-mono)' }}>{orderId}</span>
            </div>

            <div className="pos-table-header">
              <div>Item</div>
              <div style={{ textAlign: 'center' }}>Qty</div>
              <div style={{ textAlign: 'right' }}>Price</div>
              <div style={{ textAlign: 'right', color: 'var(--c-green)' }}>Offer</div>
              <div style={{ textAlign: 'right' }}>Total</div>
              <div></div>
            </div>

            <div className="pos-cart-list">
              {currentCart.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Cart is empty. Scan or select products to begin.
                </div>
              ) : (
                currentCart.map(item => {
                  const cartId = item.id + '_' + item.vId;
                  return (
                    <div key={cartId} className="pos-cart-item">
                      <div className="pos-item-name">{item.name}</div>
                      <div className="pos-qty-ctrl">
                        <button className="pos-qty-btn" onClick={() => addToCart(item, 0, -1)}>-</button>
                        <span className="pos-qty-val">{item.qty}</span>
                        <button className="pos-qty-btn" onClick={() => addToCart(item, 0, 1)}>+</button>
                      </div>
                      <div className="pos-item-val" style={{ textAlign: 'right' }}>₹{item.mrp.toFixed(2)}</div>
                      <div className="pos-item-val" style={{ textAlign: 'right', color: 'var(--c-green)', fontWeight: 'bold' }}>₹{item.price.toFixed(2)}</div>
                      <div className="pos-item-val" style={{ textAlign: 'right' }}>₹{(item.price * item.qty).toFixed(2)}</div>
                      <button className="pos-btn-trash" onClick={() => removeItem(cartId)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pos-totals-section">
              <div className="pos-tot-row">
                <span>Subtotal</span>
                <span>₹{totals.totalMRP.toFixed(2)}</span>
              </div>
              <div className="pos-tot-row discount">
                <span>Discount</span>
                <span>-₹{totals.discount.toFixed(2)}</span>
              </div>
              <div className="pos-tot-row">
                <span>Tax</span>
                <span>₹{totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="pos-grand-total-row">
                <span className="pos-grand-total-lbl">Total</span>
                <span className="pos-grand-total-val">₹{totals.grand.toFixed(2)}</span>
              </div>
              <button 
                className="pos-action-btn pos-btn-proceed" 
                style={{ marginTop: '16px', width: '100%' }}
                onClick={() => currentCart.length > 0 && setShowPaymentModal(true)}
              >
                PROCEED TO PAYMENT
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showPaymentModal && (
          <div className="pos-modal-overlay">
            <div className="pos-modal-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px' }}>Process Payment</h2>
                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
              </div>
              <div className="pos-grand-total-val" style={{ textAlign: 'center', fontSize: '42px', marginBottom: '24px' }}>₹{totals.grand.toFixed(2)}</div>
              
              <div className="pos-pay-method-grid">
                {(['Cash', 'Card', 'UPI'] as const).map(m => (
                  <button 
                    key={m}
                    className={`pos-pay-method-btn ${payMethod === m ? 'selected' : ''}`}
                    onClick={() => setPayMethod(m)}
                  >
                    {m === 'Cash' ? '💵 Cash' : m === 'Card' ? '💳 Card' : '📱 UPI'}
                  </button>
                ))}
              </div>

              {payMethod === 'Cash' && (
                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Amount Received</span>
                    <input 
                      type="number" 
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      placeholder="Enter amount"
                      style={{ width: '120px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', textAlign: 'right', fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Change Due</span>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: changeDue > 0 ? 'var(--c-green)' : 'var(--c-yellow-bg)', fontFamily: 'var(--font-mono)' }}>₹{changeDue.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button className="pos-action-btn pos-btn-proceed" style={{ width: '100%' }} onClick={confirmPayment}>
                CONFIRM & PRINT RECEIPT
              </button>
            </div>
          </div>
        )}

        {showVariantModal && selectedProduct && (
          <div className="pos-modal-overlay">
            <div className="pos-modal-box pos-variant-modal-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Home / {selectedProduct.cat} / {selectedProduct.name}</div>
                <button onClick={() => setShowVariantModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{selectedProduct.name}</h1>
              <div className="pos-variant-modal-content">
                <div className="pos-variant-image-side">
                  {selectedProduct.pic && <img src={selectedProduct.pic} className="pos-variant-img-large" alt={selectedProduct.name} />}
                </div>
                <div className="pos-variant-selection-side">
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Select Unit</h3>
                  <div className="pos-variant-grid">
                    {selectedProduct.variants.map((v, idx) => {
                      const discount = v.mrp > v.price ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : 0;
                      return (
                        <div key={v.vId} className={`pos-variant-card ${selectedVariantIndex === idx ? 'selected' : ''}`} onClick={() => setSelectedVariantIndex(idx)}>
                          {discount > 0 && <div className="pos-variant-badge">{discount}% OFF</div>}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '16px', fontWeight: 600 }}>{v.unitValue} {v.unit}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                              <div style={{ fontSize: '18px', fontWeight: 700 }}>₹{Math.round(v.price)}</div>
                              {v.mrp > v.price && <div style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{Math.round(v.mrp)}</div>}
                            </div>
                          </div>
                          {selectedProduct.pic && <img src={selectedProduct.pic} style={{ width: '60px', height: '60px', objectFit: 'contain', background: '#fff', padding: '4px', borderRadius: '4px' }} alt="v" />}
                        </div>
                      );
                    })}
                  </div>
                  <button 
                    className="pos-action-btn pos-btn-proceed" 
                    style={{ width: '100%', marginTop: '24px' }}
                    onClick={() => { addToCart(selectedProduct, selectedVariantIndex); setShowVariantModal(false); }}
                  >
                    ADD TO CART
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showHeldModal && (
          <div className="pos-modal-overlay">
            <div className="pos-modal-box" style={{ width: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px' }}>Held Transactions</h2>
                <button onClick={() => setShowHeldModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {heldOrders.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No held transactions.</div>
                ) : (
                  heldOrders.map((order, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{order.id}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.items.length} items • {order.time}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--c-green)', fontFamily: 'var(--font-mono)' }}>{order.total}</div>
                        <button className="pos-action-btn pos-btn-proceed" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => resumeOrder(idx)}>Resume</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Print Content (Hidden normally) */}
        <div id="pos-printable-receipt" style={{ padding: '20px', background: '#fff', color: '#000' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>DAILY CLUB</h2>
            <p style={{ margin: 0 }}>POS Receipt</p>
            <p style={{ margin: 0 }}>{new Date().toLocaleString()}</p>
          </div>
          <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
          {currentCart.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
              <span>{item.name} x {item.qty}</span>
              <span>₹{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' }}>
            <span>TOTAL</span>
            <span>₹{totals.grand.toFixed(2)}</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <p>Thank you for shopping!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
