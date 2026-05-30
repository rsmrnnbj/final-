import React, { useState, useEffect } from 'react';
import InventoryManagement from './InventoryManagement';
import LiveOrderTracking from './LiveOrderTracking';
import Analytics from './Analytics';

export default function SellerPortal({ onLogout, refreshStorefront }) {
  const [activePage, setActivePage] = useState('Dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- FIX: Field names now match what /api/analytics actually returns (camelCase) ---
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    activeOrders: 0,
    totalItemsSold: 0,
  });

  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCat, setNewProdCat] = useState("Electronics");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdImg, setNewProdImg] = useState(null);

  const fetchInventory = () => {
    fetch('http://168.231.118.191:8000/api/inventory')
      .then(res => res.json())
      .then(data => setInventory(data))
      .catch(err => console.error("Inventory fetch error:", err));
  };

  useEffect(() => {
    // 1. Fetch Analytics — API returns camelCase: totalRevenue, activeOrders, totalItemsSold
    fetch('http://168.231.118.191:8000/api/analytics')
      .then(res => res.json())
      .then(data => {
        setAnalyticsData({
          totalRevenue:   data.totalRevenue   || 0,
          activeOrders:   data.activeOrders   || 0,
          totalItemsSold: data.totalItemsSold || 0,
        });
      })
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
        <h2 style={{ fontSize: '1.2rem', color: '#f3c1c1', marginBottom: '50px' }}>GOODNESS GRACIOUS <br /> SELLER PORTAL</h2>
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
            {/* --- FIX: Now correctly reads camelCase fields --- */}
            <div style={cardStyle}>
              <h3>Total Revenue</h3>
              <p style={valStyle}>₱{Number(analyticsData.totalRevenue).toLocaleString()}</p>
            </div>
            <div style={cardStyle}>
              <h3>Total Orders</h3>
              <p style={valStyle}>{analyticsData.activeOrders}</p>
            </div>
            <div style={cardStyle}>
              <h3>Items Sold</h3>
              <p style={valStyle}>{analyticsData.totalItemsSold}</p>
            </div>
          </div>
        )}

        {activePage === 'Inventory Management' && (
          <InventoryManagement
            inventory={inventory}
            onAdd={() => {
              setEditingProduct(null);
              setNewProdName(""); setNewProdPrice(""); setNewProdCat("Electronics");
              setNewProdDesc(""); setNewProdImg(null);
              setIsAddModalOpen(true);
            }}
            onDelete={(id) => {
              fetch(`http://168.231.118.191:8000/api/products/${id}`, { method: 'DELETE' })
                .then(() => {
                  fetchInventory();
                  if (window.refreshStorefront) window.refreshStorefront();
                })
                .catch(err => {
                  console.error("Delete error, local fallback:", err);
                  setInventory(prev => prev.filter(item => item.id !== id));
                  if (window.refreshStorefront) window.refreshStorefront();
                });
            }}
            onEdit={(item) => {
              setEditingProduct(item);
              setNewProdName(item.name || "");
              setNewProdPrice(item.price || "");
              setNewProdCat(item.category || "Electronics");
              setNewProdDesc(item.description || "");
              setNewProdImg(item.image_url || null);
              setIsAddModalOpen(true);
            }}
          />
        )}

        {activePage === 'Live Order Tracking' && <LiveOrderTracking orders={orders} />}
        {activePage === 'Analytics' && <Analytics />}

        {/* MODAL */}
        {isAddModalOpen && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <h3>{editingProduct ? "Edit Product" : "Add New Product"}</h3>

              <label style={labelStyle}>PRODUCT NAME</label>
              <input
                defaultValue={editingProduct?.name || ""}
                placeholder="e.g., Silk Summer Scarf"
                style={inputStyle}
                onChange={(e) => setNewProdName(e.target.value)}
              />

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>CATEGORY</label>
                  <select defaultValue={editingProduct?.category || "Electronics"} style={inputStyle} onChange={(e) => setNewProdCat(e.target.value)}>
                    <option>Electronics</option>
                    <option>Fashion</option>
                    <option>Home & Living</option>
                    <option>Beauty</option>
                    <option>Sports</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>PRICE (PHP)</label>
                  <input
                    type="number"
                    defaultValue={editingProduct?.price || ""}
                    placeholder="0.00"
                    style={inputStyle}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                  />
                </div>
              </div>

              <label style={labelStyle}>DESCRIPTION</label>
              <textarea
                defaultValue={editingProduct?.description || ""}
                placeholder="Product details..."
                style={{ ...inputStyle, height: '80px', resize: 'vertical', fontFamily: 'sans-serif' }}
                onChange={(e) => setNewProdDesc(e.target.value)}
              />

              <label style={labelStyle}>PRODUCT IMAGE</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setNewProdImg(URL.createObjectURL(file));
                  }}
                  style={inputStyle}
                />
                {newProdImg && (
                  <img src={newProdImg} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e0' }} />
                )}
              </div>

              <div style={buttonGroupStyle}>
                <button style={discardButtonStyle} onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }}>
                  Discard
                </button>
                <button style={deployButtonStyle} onClick={() => {
                  const payload = {
                    id: editingProduct?.id || Date.now(),
                    name: newProdName,
                    price: parseFloat(newProdPrice) || 0,
                    category: newProdCat,
                    description: newProdDesc,
                    image_url: newProdImg || "https://via.placeholder.com/150",
                    stock: editingProduct?.stock ?? 10,
                  };

                  const url = editingProduct
                    ? `http://168.231.118.191:8000/api/products/${editingProduct.id}`
                    : 'http://168.231.118.191:8000/api/products';
                  const method = editingProduct ? 'PUT' : 'POST';

                  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    .then(() => {
                      fetchInventory();
                      if (window.refreshStorefront) window.refreshStorefront();
                      setIsAddModalOpen(false);
                      setEditingProduct(null);
                    })
                    .catch(err => {
                      console.error("Save failed, local fallback:", err);
                      if (editingProduct) {
                        setInventory(prev => prev.map(item => item.id === editingProduct.id ? payload : item));
                      } else {
                        setInventory(prev => [...prev, payload]);
                      }
                      if (window.refreshStorefront) window.refreshStorefront();
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
  cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal',
  color: isActive ? '#fff' : '#ccc', padding: '10px',
  borderRadius: '5px', background: isActive ? '#3d3d3d' : 'transparent'
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
