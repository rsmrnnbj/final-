import React, { useState, useEffect } from 'react';
import InventoryManagement from './InventoryManagement';
import LiveOrderTracking from './LiveOrderTracking';
import Analytics from './Analytics';

export default function SellerPortal({ onLogout, refreshStorefront }) {
  const [activePage, setActivePage] = useState('Dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({ totalRevenue: 0, activeOrders: 0, stockAlerts: 0 });
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCat, setNewProdCat] = useState("Electronics");
  
  // Added: React states to hold description and image file data locally
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdImg, setNewProdImg] = useState(null);

  const fetchInventory = () => {
    fetch('http://168.231.118.191:8000/api/inventory')
      .then(res => res.json())
      .then(data => setInventory(data))
      .catch(err => console.error("Inventory fetch error:", err));
  };

  useEffect(() => {
    // 1. Fetch Analytics
    fetch('http://168.231.118.191:8000/api/analytics')
      .then(res => res.json())
      .then(data => setAnalyticsData({
          totalRevenue: data.total_revenue || 0,
          activeOrders: data.total_orders || 0,
          stockAlerts: data.total_items_sold || 0
      }))
      .catch(err => console.error("Analytics fetch error:", err));

    // 2. Fetch Inventory
    fetchInventory();

    // 3. Fetch Orders
    fetch('http://168.231.118.191:8000/api/orders')
      .then(res => res.json())
      .then(data => setOrders(data))
      .catch(err => console.error("Orders fetch error:", err));
  }, []);

  const menuItems = ['Dashboard', 'Inventory Management', 'Live Order Tracking', 'Analytics'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f7f7', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '280px', background: '#2d2d2d', color: '#fff', padding: '40px 20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.2rem', color: '#f3c1c1', marginBottom: '50px' }}>GOODNESS GRACIOUS <br/> SELLER PORTAL</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {menuItems.map((item) => (
            <div key={item} onClick={() => setActivePage(item)} style={menuStyle(activePage === item)}>
              {item}
            </div>
          ))}
        </div>
        <button onClick={onLogout} style={logoutButtonStyle}>Logout</button>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, padding: '50px' }}>
        <h1 style={{ color: '#2d2d2d', marginBottom: '30px' }}>{activePage}</h1>
        
        {activePage === 'Dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div style={cardStyle}><h3>Total Revenue</h3><p style={valStyle}>₱{Number(analyticsData.totalRevenue).toLocaleString()}</p></div>
            <div style={cardStyle}><h3>Active Orders</h3><p style={valStyle}>{analyticsData.activeOrders}</p></div>
            <div style={cardStyle}><h3>Stock Alerts</h3><p style={valStyle}>{analyticsData.stockAlerts}</p></div>
          </div>
        )}

        {activePage === 'Inventory Management' && (
          <InventoryManagement 
            inventory={inventory} 
            onAdd={() => { 
              setEditingProduct(null); 
              setNewProdName("");
              setNewProdPrice("");
              setNewProdCat("Electronics");
              setNewProdDesc("");
              setNewProdImg(null);
              setIsAddModalOpen(true); 
            }}
            onDelete={(id) => {
              fetch(`http://localhost:8000/api/products/${id}`, { method: 'DELETE' })
                .then(() => {
                  fetchInventory();
                  if (window.refreshStorefront) window.refreshStorefront();
                })
                .catch(err => {
                  console.error("Delete error, cleaning up locally:", err);
                  // Local bypass fallback for item deletion
                  setInventory(prev => prev.filter(item => item.id !== id));
                  if (window.localGlobalProducts) {
                    window.localGlobalProducts = window.localGlobalProducts.filter(item => item.id !== id);
                  }
                  if (window.refreshStorefront) window.refreshStorefront();
                });
            }}
            onEdit={(item) => {
              setEditingProduct(item);   
              setNewProdName(item.name || ""); 
              setNewProdPrice(item.price || ""); 
              setNewProdCat(item.category || "Electronics"); 
              setNewProdDesc(item.description || "");
              setNewProdImg(item.image || null);
              setIsAddModalOpen(true);    
            }}
          />
        )}

        {activePage === 'Live Order Tracking' && <LiveOrderTracking orders={orders} />}
        {activePage === 'Analytics' && <Analytics data={analyticsData} />}
        
        {/* MODAL */}
        {isAddModalOpen && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <h3>{editingProduct ? "Edit Product Definition" : "Add New Product Definition"}</h3>
              
              <label style={labelStyle}>PRODUCT TITLE NAME</label>
              <input 
                defaultValue={editingProduct?.name || ""} 
                placeholder="e.g., Silk Summer Scarf" 
                style={inputStyle} 
                onChange={(e) => setNewProdName(e.target.value)} 
              />
              
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>CATEGORY PLACEMENT</label>
                  <select defaultValue={editingProduct?.category || "Electronics"} style={inputStyle} onChange={(e) => setNewProdCat(e.target.value)}>
                    <option>Electronics</option>
                    <option>Fashion</option>
                    <option>Home & Living</option>
                    <option>Beauty</option>
                    <option>Sports</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>UNIT VALUATION PRICE (PHP)</label>
                  <input 
                    type="number" 
                    defaultValue={editingProduct?.price || ""}
                    placeholder="0.00" 
                    style={inputStyle} 
                    onChange={(e) => setNewProdPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Added: Product Description Field */}
              <label style={labelStyle}>Product Description</label>
              <textarea 
                defaultValue={editingProduct?.description || ""}
                placeholder="Provide details about materials, dimensions, or specifications..."
                style={{ ...inputStyle, height: '80px', fontFamily: 'sans-serif', resize: 'vertical' }}
                onChange={(e) => setNewProdDesc(e.target.value)}
              />

              {/* Added: Product Display Image Picker Field */}
              <label style={labelStyle}>Product Display Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const localImageUrl = URL.createObjectURL(file);
                      setNewProdImg(localImageUrl);
                    }
                  }}
                  style={inputStyle}
                />
                {newProdImg && (
                  <img 
                    src={newProdImg} 
                    alt="Preview" 
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e0' }} 
                  />
                )}
              </div>
                
              <div style={buttonGroupStyle}>
                <button style={discardButtonStyle} onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}>Discard</button>
                
                <button style={deployButtonStyle} onClick={() => {
                  const payload = { 
                    id: editingProduct?.id || Date.now(),
                    name: newProdName,
                    price: parseFloat(newProdPrice) || 0,
                    category: newProdCat,
                    description: newProdDesc,
                    image_url: newProdImg || "https://via.placeholder.com/150",
                    stock: 10
                  };
                  
                  const url = editingProduct ? `http://168.231.118.191:8000/api/products/${editingProduct.id}` : 'http://168.231.118.191:8000/api/products';
                  const method = editingProduct ? 'PUT' : 'POST';
                  
                  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    .then(() => { 
                      fetchInventory(); 
                      return fetch('http://168.231.118.191:8000/api/trigger-etl', { method: 'POST' });
                    })
                    .then(() => {
                      console.log("Database synced to Storefront!");
                      if (window.refreshStorefront) window.refreshStorefront();
                      setIsAddModalOpen(false); 
                      setEditingProduct(null); 
                    })
                    .catch(err => {
                      console.error("Sync failed, running local frontend bypass mode:", err);

                      // Initialize memory storage
                      if (!window.localGlobalProducts) {
                        window.localGlobalProducts = [];
                      }

                      // UPDATE MODE
                      if (editingProduct) {

                        // Seller inventory update
                        setInventory(prev =>
                          prev.map(item =>
                            item.id === editingProduct.id ? payload : item
                          )
                        );

                        // Customer storefront update
                        window.localGlobalProducts =
                          window.localGlobalProducts.map(p =>
                            p.id === editingProduct.id ? payload : p
                          );

                      } else {

                        // ADD MODE
                        setInventory(prev => [...prev, payload]);

                        window.localGlobalProducts = [
                          ...window.localGlobalProducts,
                          payload
                        ];
                      }

                      console.log("Frontend fallback products:", window.localGlobalProducts);

                      // 🔥 Force storefront refresh
                      if (window.refreshStorefront) {
                        window.refreshStorefront();
                      }

                      setIsAddModalOpen(false);
                      setEditingProduct(null);
                    });
                }}>
                  {editingProduct ? "Update Listing" : "Deploy Listing"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const menuStyle = (isActive) => ({
  cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#fff' : '#ccc',
  padding: '10px', borderRadius: '5px', background: isActive ? '#3d3d3d' : 'transparent'
});
const logoutButtonStyle = { marginTop: 'auto', background: 'transparent', border: '1px solid #f3c1c1', color: '#f3c1c1', padding: '10px', cursor: 'pointer', borderRadius: '5px', width: '80%' };
const cardStyle = { background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e0e0e0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const valStyle = { fontSize: '1.8rem', fontWeight: 'bold', margin: '10px 0 0 0', color: '#2d2d2d' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: '#fff', padding: '40px', borderRadius: '15px', width: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#4a5568', marginTop: '15px', display: 'block', textTransform: 'uppercase' };
const buttonGroupStyle = { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' };
const discardButtonStyle = { padding: '10px 25px', borderRadius: '8px', border: '1px solid #cbd5e0', background: 'transparent', cursor: 'pointer' };
const deployButtonStyle = { padding: '10px 25px', borderRadius: '8px', border: 'none', background: '#2d3748', color: '#fff', cursor: 'pointer' };
