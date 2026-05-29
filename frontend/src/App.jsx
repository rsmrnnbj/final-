// src/App.jsx
import React, { useState, useEffect } from 'react';
import './index.css'; 
import ProductGrid from './components/ProductGrid';
import SellerDashboard from './SellerPortal';
import Analytics from './Analytics'; // Adjust path


function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetch('http://168.231.118.191:8000/api/analytics-data')
      .then(res => res.json())
      .then(data => setAnalyticsData(data))
      .catch(err => console.error("Error fetching analytics:", err));
  }, []);

  return <Analytics data={analyticsData} />;
}

export default function App() {
  // 🏪 EXISTING STOREFRONT STATES
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState('store'); // 'store', 'profile', or 'orders'
  const [orders, setOrders] = useState([]);

  // 🔑 NEW: AUTHENTICATION & PORTAL MANAGEMENT STATES
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' (Customer), 'seller_login' (Seller Workspace), or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupRole, setSignupRole] = useState('customer');

  // 👤 Profile Customer Variables Staging Cards
  const [userData, setUserData] = useState({
    fullName: 'Goodness Gracious',
    email: 'goodnessgracious@email.com',
    mobile: '+63 917 123 4567',
    paymentMethod: 'Cash on Delivery (COD)'
  });
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      type: 'Home / Primary Address',
      isDefault: true,
      addressLine: '123 Harmony Street, Brgy. Lifestyle, Cagayan de Oro City, 9000'
    },
    {
      id: 2,
      type: 'Office',
      isDefault: false,
      addressLine: 'Floor 14, Highrise Tech Tower, Business Avenue, Makati City, 1226'
    }
  ]);
  const [tempUserData, setTempUserData] = useState({ ...userData });
  const [tempAddresses, setTempAddresses] = useState([...addresses]);

  useEffect(() => {
    if (currentView === 'profile') {
      setTempUserData({ ...userData });
      setTempAddresses(JSON.parse(JSON.stringify(addresses)));
    }
  }, [currentView, userData, addresses]);

  // 🌐 DATA FETCH ENGINE CONNECTIONS
 const fetchProducts = () => {
  const timestamp = new Date().getTime();

  fetch(`http://168.231.118.191:8000/products?t=${timestamp}`)
    .then(res => res.json())
    .then(data => {
      console.log("Products received from server:", data);

      // ✅ If backend works
      if (Array.isArray(data)) {
        setProducts(data);

        // Save a frontend mirror copy
        window.localGlobalProducts = data;
      } else {
        // Fallback to local memory
        setProducts(window.localGlobalProducts || []);
      }
    })
    .catch(err => {
      console.error("Database Connection Offline:", err);

      // ✅ FRONTEND FALLBACK MODE
      setProducts(window.localGlobalProducts || []);
    });
};

  // --- GLOBAL SYNC FIX ---
  window.refreshStorefront = fetchProducts;

  const fetchOrderHistory = () => {
    fetch('http://168.231.118.191:8000/orders')
      .then(res => res.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(err => console.error("Could not fetch order data:", err));
  };

  useEffect(() => {
    fetchProducts();
    fetchOrderHistory();
  }, []);

  // 🚪 HANDLE ACCOUNT LOGOUT OPERATION
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserSession(null);
    setEmail('');
    setPassword('');
    setAuthView('login');
    setIsProfileDropdownOpen(false);
    setCurrentView('store');
    alert("Logged out successfully. Have a nice day! 👋");
  };

 // 📝 POST /AUTH/SIGNUP - USER REGISTRATION FORM SUBMIT
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Please fill out all fields!");

    try {
      const res = await fetch('http://168.231.118.191:8000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: signupRole })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Registration failed");

      alert(`🎉 ${data.message}`);
      setAuthView(signupRole === 'seller' ? 'seller_login' : 'login');
    } catch (err) {
      alert(`❌ Registration Error: ${err.message}`);
    }
  };

  // 🔑 POST /AUTH/LOGIN - CONDITIONAL GUARD ENTRY SYSTEM
  const handleLoginSubmit = async (e, operationalRole) => {
    e.preventDefault();
    try {
      const res = await fetch('http://168.231.118.191:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: operationalRole })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      // 1. Mark user as authenticated
      setIsAuthenticated(true);
      setUserSession(data); 

      // 2. CRITICAL: Force the view switch
      if (operationalRole === 'seller') {
        setCurrentView('seller_dashboard');
      } else {
        setCurrentView('store');
      }

      alert("Login Successful!");
    } catch (err) {
      alert(`❌ Login Blocked: ${err.message}`);
    }
  };

  // 🛍️ CART LOGIC ENGINE
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= (product.stock || 0)) return prevCart;
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, amount) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === id) {
          const matchedProd = products.find(p => p.id === id);
          const maxStock = matchedProd ? (matchedProd.stock || 0) : 99;
          const nextQty = item.quantity + amount;
          if (nextQty <= 0) return null;
          if (nextQty > maxStock) return item;
          return { ...item, quantity: nextQty };
        }
        return item;
      }).filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      for (const item of cart) {
        const response = await fetch('http://168.231.118.191:8000/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: item.id, quantity: item.quantity })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || `Failed to purchase ${item.name}`);
        }
      }
      alert("🎉 Checkout successful! Your orders have been safely recorded.");
      setCart([]);
      fetchProducts();
      await fetchOrderHistory();
      setIsCartOpen(false);
      setCurrentView('orders'); 
    } catch (err) {
      console.error("Checkout operation failed:", err);
      alert(`❌ Checkout failed: ${err.message}`);
    }
  };

  const toggleFavorite = (product) => {
    setFavorites(prevFavs => {
      const isAlreadyFav = prevFavs.some(item => item.id === product.id);
      if (isAlreadyFav) {
        return prevFavs.filter(item => item.id !== product.id);
      } else {
        return [...prevFavs, product];
      }
    });
  };

  const handleAddressChange = (id, value) => {
    setTempAddresses(prev => prev.map(addr => addr.id === id ? { ...addr, addressLine: value } : addr));
  };

  const handleAddressTypeChange = (id, value) => {
    setTempAddresses(prev => prev.map(addr => addr.id === id ? { ...addr, type: value } : addr));
  };

  const deleteAddress = (id) => {
    setTempAddresses(prev => prev.filter(addr => addr.id !== id));
  };

  const addNewAddress = () => {
    const newId = tempAddresses.length > 0 ? Math.max(...tempAddresses.map(a => a.id)) + 1 : 1;
    setTempAddresses([...tempAddresses, {
      id: newId,
      type: 'New Address Location',
      isDefault: false,
      addressLine: ''
    }]);
  };

  const saveProfileData = () => {
    setUserData({ ...tempUserData });
    setAddresses([...tempAddresses]);
    alert(`🎉 Profile successfully updated for ${tempUserData.fullName}!`);
    setCurrentView('profile');
  };

  const handleCancelProfile = () => {
    setTempUserData({ ...userData });
    setTempAddresses([...addresses]);
    setCurrentView('profile');
  };

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const filteredProducts = products.filter(p => {
    const productCategory = (p.category || '').toLowerCase().trim();
    const selectedCategory = (activeCategory || '').toLowerCase().trim();
    const matchesCategory = selectedCategory === 'all' || productCategory === selectedCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 🚪 BRICK-WALL SECURITY GATEKEEPER
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', background: '#fff' }}>
        <div style={{ flex: 1, backgroundColor: '#f3c1c1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', color: '#4a3f3f', textAlign: 'center' }}>
          {authView === 'signup' ? (
            <>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Welcome Back!</h2>
              <p style={{ fontSize: '1.1rem', maxWidth: '340px', lineHeight: '1.6', marginBottom: '24px' }}>To stay connected with your account, please log in with your credentials.</p>
              <button onClick={() => { setAuthView('login'); setEmail(''); setPassword(''); }} style={{ background: 'transparent', border: '2px solid #4a3f3f', color: '#4a3f3f', borderRadius: '50px', padding: '12px 40px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer' }}>Sign In</button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '16px' }}>New here?</h2>
              <p style={{ fontSize: '1.1rem', maxWidth: '340px', lineHeight: '1.6', marginBottom: '24px' }}>Sign up now to start tracking your orders and shopping smart!</p>
              <button onClick={() => { setAuthView('signup'); setEmail(''); setPassword(''); }} style={{ background: 'transparent', border: '2px solid #4a3f3f', color: '#4a3f3f', borderRadius: '50px', padding: '12px 40px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer' }}>Sign Up</button>
            </>
          )}
        </div>
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '40px', left: '40px', display: 'flex', alignItems: 'center', gap: '8px', color: '#4a3f3f', fontWeight: '700' }}>
            <span style={{ backgroundColor: '#f3c1c1', padding: '6px 10px', borderRadius: '8px', color: '#fff' }}><i className="fa-solid fa-bag-shopping"></i></span>
            GoodnessGracious
          </div>
          {authView === 'login' && (
            <form onSubmit={(e) => handleLoginSubmit(e, 'customer')} style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '2.2rem', fontWeight: '700', color: '#4a3f3f', margin: '0 0 8px 0' }}>Welcome Back!</h3>
                <p style={{ margin: 0, color: '#a09090', fontSize: '0.9rem' }}>Log in to your customer account</p>
              </div>
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '14px 20px', borderRadius: '50px', border: '1px solid #ebdada', background: '#faf6f6', fontSize: '0.95rem', outline: 'none' }} required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '14px 20px', borderRadius: '50px', border: '1px solid #ebdada', background: '#faf6f6', fontSize: '0.95rem', outline: 'none' }} required />
              <button type="submit" style={{ background: '#4a3f3f', color: '#fff', padding: '14px', borderRadius: '50px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>Log In</button>
              <div style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '12px', color: '#7c6c6c' }}>
                Are you a seller? <span onClick={() => { setAuthView('seller_login'); setEmail(''); setPassword(''); }} style={{ color: '#b06000', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Access Seller Portal</span>
              </div>
            </form>
          )}
          {authView === 'seller_login' && (
            <form onSubmit={(e) => handleLoginSubmit(e, 'seller')} style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '2.2rem', fontWeight: '700', color: '#4a3f3f', margin: '0 0 8px 0' }}>Seller Workspace</h3>
                <p style={{ margin: 0, color: '#a09090', fontSize: '0.9rem' }}>Authorized personnel access only</p>
              </div>
              <input type="email" placeholder="Admin Registered Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '14px 20px', borderRadius: '50px', border: '1px solid #ebdada', background: '#faf6f6', fontSize: '0.95rem', outline: 'none' }} required />
              <input type="password" placeholder="Secure Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '14px 20px', borderRadius: '50px', border: '1px solid #ebdada', background: '#faf6f6', fontSize: '0.95rem', outline: 'none' }} required />
              <button type="submit" style={{ background: '#4a3f3f', color: '#fff', padding: '14px', borderRadius: '50px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>Verify & Enter</button>
              <div style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '12px', color: '#7c6c6c' }}>
                Back to store? <span onClick={() => { setAuthView('login'); setEmail(''); setPassword(''); }} style={{ color: '#4a3f3f', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Customer Log In</span>
              </div>
            </form>
          )}
          {authView === 'signup' && (
            <form onSubmit={handleSignUpSubmit} style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '2.2rem', fontWeight: '700', color: '#4a3f3f', margin: '0 0 8px 0' }}>Create Account</h3>
                <p style={{ margin: 0, color: '#a09090', fontSize: '0.9rem' }}>Join the marketplace workspace today</p>
              </div>
              <input type="email" placeholder="Your Active Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '14px 20px', borderRadius: '50px', border: '1px solid #ebdada', background: '#faf6f6', fontSize: '0.95rem', outline: 'none' }} required />
              <input type="password" placeholder="Choose Strong Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '14px 20px', borderRadius: '50px', border: '1px solid #ebdada', background: '#faf6f6', fontSize: '0.95rem', outline: 'none' }} required />
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '4px 0' }}>
                <label style={{ color: '#4a3f3f', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer' }}>
                  <input type="radio" name="role" value="customer" checked={signupRole === 'customer'} onChange={() => setSignupRole('customer')} style={{ marginRight: '6px' }} /> I am a Customer
                </label>
                <label style={{ color: '#b06000', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer' }}>
                  <input type="radio" name="role" value="seller" checked={signupRole === 'seller'} onChange={() => setSignupRole('seller')} style={{ marginRight: '6px' }} /> I am a Seller
                </label>
              </div>
              <button type="submit" style={{ background: '#4a3f3f', color: '#fff', padding: '14px', borderRadius: '50px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>Register Account</button>
            </form>
          )}
          {currentView === 'seller_dashboard' && (
            <SellerDashboard onLogout={handleLogout} refreshStorefront={fetchProducts} />
          )}
        </div>
      </div>
    );
  }

 if (userSession?.role === 'seller') {
  return (
    <SellerDashboard
      onLogout={handleLogout}
      refreshStorefront={fetchProducts}
    />
  );
}

  return (
    <div className="storefront-root-wrapper">
      <header className="premium-store-header">
        <div className="brand-title-group" style={{ cursor: 'pointer' }} onClick={() => { setCurrentView('store'); setActiveCategory('all'); setSearchQuery(''); }}>
          <div className="brand-logo-emblem"><i className="fa-solid fa-bag-shopping"></i></div>
          <span className="brand-name-text">GoodnessGracious</span>
        </div>
        <div className="search-input-frame">
          <i className="fa-solid fa-magnifying-glass search-icon-label"></i>
          <input type="text" placeholder="Search products" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="header-icon-actions" style={{ alignItems: 'center' }}>
          <button className="nav-action-icon-btn" onClick={() => { setIsFavoritesOpen(true); setIsCartOpen(false); }} title="Open Favorites Drawer">
            <i className={favorites.length > 0 ? "fa-solid fa-heart" : "fa-regular fa-heart"} style={{ color: favorites.length > 0 ? '#ef4444' : '' }}></i>
            {favorites.length > 0 && <span className="icon-badge-indicator highlight-accent">{favorites.length}</span>}
          </button>
          <button className="nav-action-icon-btn" onClick={() => { setIsCartOpen(true); setIsFavoritesOpen(false); }} title="Open Shopping Bag Drawer">
            <i className="fa-solid fa-basket-shopping"></i>
            {cartCount > 0 && <span className="icon-badge-indicator">{cartCount}</span>}
          </button>
          <div style={{ position: 'relative' }}>
            <button className="navbar-user-account-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: '#f5ebeb', border: 'none', padding: '6px 14px', borderRadius: '50px', fontSize: '0.9rem', color: '#4a3f3f', fontWeight: '500', maxWidth: '220px', boxSizing: 'border-box' }} onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
              <span style={{ background: '#4a3f3f', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>
                {userData.fullName.charAt(0).toUpperCase()}
              </span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', display: 'inline-block' }}>
                {userData.fullName}
              </span>
              <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', opacity: 0.7, flexShrink: 0 }}></i>
            </button>
            {isProfileDropdownOpen && (
              <div style={{ position: 'absolute', top: '45px', right: '0', backgroundColor: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', borderRadius: '12px', width: '220px', padding: '16px 0', zIndex: 999, border: '1px solid #f0e4e4' }}>
                <div style={{ padding: '0 20px 12px 20px', borderBottom: '1px solid #f5ebeb' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#4a3f3f', textTransform: 'capitalize' }}>{userData.fullName.toLowerCase()}</div>
                  <div style={{ fontSize: '0.8rem', color: '#a09090', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userSession?.email}</div>
                  <div style={{ fontSize: '0.7rem', color: '#b06000', fontWeight: 'bold', marginTop: '2px' }}>ROLE: {userSession?.role.toUpperCase()}</div>
                </div>
                {userSession?.role === 'customer' && (
                  <>
                    <button style={{ width: '100%', textAlign: 'left', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#4a3f3f' }} onClick={() => { setCurrentView('profile'); setIsProfileDropdownOpen(false); }}>
                      <i className="fa-regular fa-user"></i> My Profile
                    </button>
                    <button style={{ width: '100%', textAlign: 'left', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#4a3f3f' }} onClick={() => { setCurrentView('orders'); setIsProfileDropdownOpen(false); }}>
                      <i className="fa-solid fa-boxes-packing"></i> Order History
                    </button>
                  </>
                )}
                {userSession?.role === 'seller' && (
                  <button style={{ width: '100%', textAlign: 'left', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#b06000', fontWeight: '600' }} onClick={() => { setCurrentView('seller_dashboard'); setIsProfileDropdownOpen(false); }}>
                    <i className="fa-solid fa-chart-line"></i> Seller Control Panel
                  </button>
                )}
                <div style={{ borderTop: '1px solid #f5ebeb', marginTop: '8px', paddingTop: '8px' }}>
                  <button style={{ width: '100%', textAlign: 'left', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#e05a5a', fontWeight: '600' }} onClick={handleLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {currentView === 'store' && (
        <nav className="horizontal-category-strip">
          {['all', 'electronics', 'fashion', 'home & living', 'beauty', 'sports'].map(cat => (
            <button key={cat} className={`category-tag-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
              {cat === 'all' ? 'All Products' : cat === 'home & living' ? 'Home & Living' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </nav>
      )}

      <main className="storefront-main-workspace">
        {currentView === 'store' && (
          <>
            {activeCategory === 'all' && !searchQuery && (
              <div className="summer-promo-hero-banner">
                <div className="banner-editorial-content">
                  <span className="banner-sub-tagline">SUMMER ARRIVAL</span>
                  <h1 className="banner-main-title">Fresh Trends<br />For Everyone</h1>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginTop: '12px' }}>
                    <button style={{ cursor: 'pointer', backgroundColor: '#4a3f3f', color: '#ffffff', border: 'none', borderRadius: '50px', padding: '14px 32px', fontSize: '0.95rem', fontWeight: '500', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} onClick={() => { const target = document.querySelector('.horizontal-category-strip'); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                      <i className="fa-solid fa-basket-shopping"></i> Explore Store
                    </button>
                  </div>
                </div>
                <div className="banner-logo-graphics-frame">
                  <div className="banner-circle-emblem-badge">
                    <div className="emblem-inner-bag-icon">
                      <i className="fa-solid fa-bag-shopping"></i>
                      <span className="emblem-letters-brand-overlay">GG</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <h3 className="section-title-label">Trending Best Sellers</h3>
            <ProductGrid products={filteredProducts} addToCart={addToCart} favorites={favorites} toggleFavorite={toggleFavorite} />
          </>
        )}

        {currentView === 'profile' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px' }}>
            <div style={{ textAlign: 'left', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#4a3f3f', margin: '0 0 6px 0' }}>My Profile Management</h2>
              <p style={{ margin: 0, color: '#a09090', fontSize: '0.9rem' }}>Keep your contact credentials and home delivery destination updated.</p>
            </div>
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f2e6e6', padding: '40px', boxShadow: '0 4px 24px rgba(74, 63, 63, 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '36px', borderBottom: '1px solid #fcf9f9', paddingBottom: '24px', overflow: 'hidden' }}>
                <div style={{ width: '72px', height: '72px', background: '#f5ebeb', color: '#4a3f3f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: '600', flexShrink: 0 }}>
                  {tempUserData.fullName.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', color: '#4a3f3f', fontWeight: '600', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tempUserData.fullName}</h3>
                  <p style={{ margin: 0, color: '#a09090', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tempUserData.email}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#8c7d7d', textTransform: 'uppercase', marginBottom: '8px' }}>Account Name Tag</label>
                  <input type="text" value={tempUserData.fullName} onChange={(e) => setTempUserData({ ...tempUserData, fullName: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e8dede', color: '#4a3f3f', backgroundColor: '#faf6f6', boxSizing: 'border-box' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#8c7d7d', textTransform: 'uppercase', marginBottom: '8px' }}>Email Profile Line</label>
                  <input type="email" value={tempUserData.email} disabled style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e8dede', color: '#7c6c6c', backgroundColor: '#eee', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#8c7d7d', textTransform: 'uppercase', marginBottom: '8px' }}>Mobile Line Number</label>
                  <input type="text" value={tempUserData.mobile} onChange={(e) => setTempUserData({ ...tempUserData, mobile: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e8dede', color: '#4a3f3f', backgroundColor: '#faf6f6', boxSizing: 'border-box' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#8c7d7d', textTransform: 'uppercase', marginBottom: '8px' }}>Default Payment Method</label>
                  <select value={tempUserData.paymentMethod} onChange={(e) => setTempUserData({ ...tempUserData, paymentMethod: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e8dede', color: '#4a3f3f', background: '#faf6f6', boxSizing: 'border-box', height: '49px' }}>
                    <option>Cash on Delivery (COD)</option>
                    <option>Credit / Debit Card</option>
                    <option>GCash / Digital Wallet</option>
                  </select>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #fdf5f5', paddingTop: '28px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0, color: '#4a3f3f', fontWeight: '600', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-truck-ramp-box"></i> Shipping Addresses</h4>
                  <button onClick={addNewAddress} style={{ background: '#fff', border: '1px dashed #4a3f3f', color: '#4a3f3f', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ Add New Address</button>
                </div>
                {tempAddresses.map((addr) => (
                  <div key={addr.id} style={{ background: '#fff', border: '1px solid #f0e4e4', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      {addr.isDefault && <span style={{ fontSize: '0.65rem', background: '#4a3f3f', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DEFAULT</span>}
                      <input type="text" value={addr.type} onChange={(e) => handleAddressTypeChange(addr.id, e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 'bold', fontSize: '0.95rem', color: '#4a3f3f', borderBottom: '1px dashed #d0c0c0' }} />
                      <button onClick={() => deleteAddress(addr.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#a09090', cursor: 'pointer' }}><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                    <textarea value={addr.addressLine} onChange={(e) => handleAddressChange(addr.id, e.target.value)} placeholder="Enter full address line here..." style={{ width: '100%', border: '1px solid #f0e4e4', borderRadius: '8px', padding: '12px', fontSize: '0.9rem', color: '#4a3f3f', background: '#faf6f6', boxSizing: 'border-box' }} rows={2} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '36px', borderTop: '1px solid #fdf5f5', paddingTop: '24px' }}>
                <button onClick={handleCancelProfile} style={{ padding: '12px 28px', background: '#f5ebeb', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#4a3f3f' }}>Cancel</button>
                <button onClick={saveProfileData} style={{ padding: '12px 28px', background: '#4a3f3f', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#fff' }}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'orders' && (
          <div style={{ maxWidth: '840px', margin: '0 auto', padding: '0 20px', textAlign: 'left' }}>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#4a3f3f', margin: '0 0 6px 0' }}>Order Tracking History</h2>
              <p style={{ margin: 0, color: '#a09090', fontSize: '0.9rem' }}>Monitor your active shipments or review statements of previous completed orders.</p>
            </div>
            {orders.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '20px', padding: '60px 40px', border: '1px solid #f2e6e6', textAlign: 'center', color: '#a09090' }}>
                <i className="fa-solid fa-boxes-packing" style={{ fontSize: '3rem', color: '#e8dede', marginBottom: '16px' }}></i>
                <p style={{ margin: 0, fontSize: '1rem' }}>You haven't placed any orders yet.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #f0e4e4', boxShadow: '0 4px 16px rgba(74, 63, 63, 0.02)', marginBottom: '24px', overflow: 'hidden' }}>
                  <div style={{ background: '#faf6f6', padding: '16px 24px', borderBottom: '1px solid #f0e4e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '40px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a09090', textTransform: 'uppercase' }}>Order Placed</div>
                        <div style={{ fontSize: '0.9rem', color: '#4a3f3f', fontWeight: '600', marginTop: '2px' }}>{order.order_date}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a09090', textTransform: 'uppercase' }}>Total Statement</div>
                        <div style={{ fontSize: '0.9rem', color: '#4a3f3f', fontWeight: '600', marginTop: '2px' }}>₱{Number(order.total_statement || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a09090', textTransform: 'uppercase' }}>ID Reference</div>
                        <div style={{ fontSize: '0.9rem', color: '#7c6c6c', marginTop: '2px', fontWeight: '500' }}>{order.tracking_ref}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '8px 24px' }}>
                    {(order.items || [order]).map((item, idx, arr) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #fcf9f9' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '8px', overflow: 'hidden', background: '#faf6f6', border: '1px solid #f5ebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <img src={item.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=150'} alt={item.product_name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 4px 0', color: '#4a3f3f', fontSize: '1rem', fontWeight: '600' }}>{item.product_name}</h4>
                          <p style={{ margin: 0, color: '#a09090', fontSize: '0.85rem' }}>Quantity ordered: {item.quantity}</p>
                        </div>
                        <div style={{ fontWeight: '600', color: '#4a3f3f', fontSize: '1rem' }}>₱{Number(item.item_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <div className={`cart-slide-out-panel ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-panel-overlay" onClick={() => setIsCartOpen(false)}></div>
        <div className="cart-panel-content-card">
          <div className="cart-panel-header-row">
            <h3>Your Shopping Bag ({cartCount})</h3>
            <button className="cart-panel-close-x" onClick={() => setIsCartOpen(false)}><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="cart-panel-items-body">
            {cart.length === 0 ? (
              <div className="empty-cart-drawer-fallback">
                <i className="fa-solid fa-basket-shopping empty-icon-graphic"></i>
                <p>Your shopping basket feels light. Add items to get started!</p>
              </div>
            ) : (
              cart.map(item => (
                <div className="drawer-product-row-item" key={item.id}>
                  <div className="drawer-img-aspect-frame"><img src={item.image_url} alt={item.name} /></div>
                  <div className="drawer-product-info-column">
                    <div className="drawer-item-heading-name">{item.name}</div>
                    <div className="drawer-item-pricing-label">₱{parseFloat(item.price || 0).toLocaleString()}</div>
                    <div className="drawer-qty-stepper-engine">
                      <button className="stepper-action-btn" onClick={() => updateQuantity(item.id, -1)}><i className="fa-solid fa-minus"></i></button>
                      <div className="stepper-quantity-box">{item.quantity}</div>
                      <button className="stepper-action-btn" onClick={() => updateQuantity(item.id, 1)}><i className="fa-solid fa-plus"></i></button>
                    </div>
                  </div>
                  <button className="drawer-trash-delete-btn" onClick={() => removeFromCart(item.id)}><i className="fa-solid fa-trash-can"></i></button>
                </div>
              ))
            )}
          </div>
          <div className="cart-panel-summary-footer">
            <div className="drawer-subtotal-data-row">
              <span>Subtotal Value:</span>
              <span className="drawer-total-amount-accent">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button className="drawer-secure-checkout-submit-btn" disabled={cart.length === 0} onClick={handleCheckout}>Checkout</button>
          </div>
        </div>
      </div>

      <div className={`cart-slide-out-panel ${isFavoritesOpen ? 'open' : ''}`}>
        <div className="cart-panel-overlay" onClick={() => setIsFavoritesOpen(false)}></div>
        <div className="cart-panel-content-card">
          <div className="cart-panel-header-row">
            <h3>Saved Favorites ({favorites.length})</h3>
            <button className="cart-panel-close-x" onClick={() => setIsFavoritesOpen(false)}><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="cart-panel-items-body">
            {favorites.length === 0 ? (
              <div className="empty-cart-drawer-fallback">
                <i className="fa-regular fa-heart empty-icon-graphic" style={{ color: 'var(--border-color)' }}></i>
                <p>Your favorites list is empty. Heart products to save them here!</p>
              </div>
            ) : (
              favorites.map(item => (
                <div className="drawer-product-row-item" key={item.id}>
                  <div className="drawer-img-aspect-frame"><img src={item.image_url} alt={item.name} /></div>
                  <div className="drawer-product-info-column">
                    <div className="drawer-item-heading-name">{item.name}</div>
                    <div className="drawer-item-pricing-label" style={{ margin: '0 0 6px 0' }}>₱{parseFloat(item.price || 0).toLocaleString()}</div>
                    <button className="card-action-add-to-cart-btn" style={{ margin: 0, padding: '6px 12px', fontSize: '0.75rem' }} disabled={(item.stock || 0) <= 0} onClick={() => addToCart(item)}>
                      {(item.stock || 0) <= 0 ? 'Out of Stock' : 'Add to Bag'}
                    </button>
                  </div>
                  <button className="drawer-trash-delete-btn" onClick={() => toggleFavorite(item)}><i className="fa-solid fa-heart" style={{ color: '#ef4444' }}></i></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
