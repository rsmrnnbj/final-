import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = () => {
    setLoading(true);
    setError(null);
    fetch('http://168.231.118.191:8000/api/analytics')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        // --- FIX: API returns camelCase, map it correctly ---
        // The /api/analytics endpoint returns: totalRevenue, activeOrders, top_products, total_users
        let parsedTopProducts = [];
        if (Array.isArray(json.top_products)) {
          parsedTopProducts = json.top_products;
        } else if (typeof json.top_products === 'string') {
          try {
            parsedTopProducts = JSON.parse(json.top_products.replace(/'/g, '"'));
          } catch {
            parsedTopProducts = [];
          }
        }

        setData({
          totalRevenue:    Number(json.totalRevenue)   || 0,
          activeOrders:    Number(json.activeOrders)   || 0,
          totalItemsSold:  Number(json.totalItemsSold) || 0,
          total_users:     Number(json.total_users)    || 0,
          top_products:    parsedTopProducts,
        });
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading analytics:", err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleManualSync = () => {
    fetch('http://168.231.118.191:8000/api/trigger-etl', { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error(`ETL failed: HTTP ${res.status}`);
        return res.json();
      })
      .then(() => {
        alert("Sync complete! Refreshing analytics...");
        fetchAnalytics(); // Refresh data without full page reload
      })
      .catch(err => {
        console.error("Sync error:", err);
        alert(`Sync failed: ${err.message}`);
      });
  };

  // Bar chart data — Revenue vs Orders side by side
  const barChartData = data ? [
    { name: 'Revenue (₱)', value: data.totalRevenue },
    { name: 'Orders',       value: data.activeOrders },
    { name: 'Items Sold',   value: data.totalItemsSold },
    { name: 'Users',        value: data.total_users },
  ] : [];

  // Pie chart data — top products
  const COLORS = ['#f3c1c1', '#f9a8d4', '#fcd34d', '#86efac', '#93c5fd'];
  const pieData = data?.top_products?.map((name, i) => ({ name, value: i + 1 })) || [];

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e0e0e0' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Sales Intelligence Overview</h3>
        <button
          onClick={handleManualSync}
          style={{ padding: '10px 20px', background: '#f3c1c1', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '600' }}
        >
          🔄 Manual Sync
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #f3c1c1', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#c0392b' }}>
          ⚠️ Could not load analytics: {error}. Try clicking Manual Sync to populate the reporting DB.
        </div>
      )}

      {loading ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>Loading analytics data...</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
            <div style={kpiCard}>
              <p style={kpiLabel}>Total Revenue</p>
              <p style={kpiValue}>₱{data.totalRevenue.toLocaleString()}</p>
            </div>
            <div style={kpiCard}>
              <p style={kpiLabel}>Total Orders</p>
              <p style={kpiValue}>{data.activeOrders.toLocaleString()}</p>
            </div>
            <div style={kpiCard}>
              <p style={kpiLabel}>Items Sold</p>
              <p style={kpiValue}>{data.totalItemsSold.toLocaleString()}</p>
            </div>
            <div style={kpiCard}>
              <p style={kpiLabel}>Registered Users</p>
              <p style={kpiValue}>{data.total_users.toLocaleString()}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>

            {/* Bar Chart */}
            <div>
              <h4 style={{ marginBottom: '10px', color: '#555' }}>Key Metrics Overview</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(val) => val.toLocaleString()} />
                  <Bar dataKey="value" fill="#f3c1c1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart — Top Products */}
            <div>
              <h4 style={{ marginBottom: '10px', color: '#555' }}>Top Products (by sales volume)</h4>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name }) => name}
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', border: '1px dashed #ddd', borderRadius: '8px' }}>
                  No order data yet — place orders to see top products.
                </div>
              )}
            </div>
          </div>

          {/* Top Products List */}
          {data.top_products.length > 0 && (
            <div style={{ marginTop: '25px', background: '#fff8f8', borderRadius: '10px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#555' }}>🏆 Top Selling Products</h4>
              {data.top_products.map((product, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < data.top_products.length - 1 ? '1px solid #f0e0e0' : 'none' }}>
                  <span style={{ background: '#f3c1c1', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {i + 1}
                  </span>
                  <span style={{ fontWeight: '500' }}>{product}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const kpiCard = {
  background: '#fff8f8',
  borderRadius: '10px',
  padding: '18px 20px',
  border: '1px solid #f3c1c1',
};
const kpiLabel = {
  margin: 0,
  fontSize: '0.75rem',
  color: '#888',
  textTransform: 'uppercase',
  fontWeight: '600',
  letterSpacing: '0.05em',
};
const kpiValue = {
  margin: '6px 0 0 0',
  fontSize: '1.6rem',
  fontWeight: 'bold',
  color: '#2d2d2d',
};
