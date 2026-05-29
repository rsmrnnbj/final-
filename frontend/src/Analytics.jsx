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

  useEffect(() => {
    fetch('http://168.231.118.191:8000/api/analytics')
      .then(res => res.json())
      .then(json => {
        setData({
          totalRevenue: Number(json.totalRevenue) || 0,
          activeOrders: Number(json.activeOrders) || 0,
          top_products: typeof json.top_products === 'string' 
                        ? JSON.parse(json.top_products.replace(/'/g, '"')) 
                        : (json.top_products || []),
          total_users: Number(json.total_users) || 0
        });
      })
      .catch(err => console.error("Error loading analytics:", err));
  }, []);

  const handleManualSync = () => {
    fetch('http://168.231.118.191:8000/api/trigger-etl', { method: 'POST' })
      .then(() => {
        alert("Sync complete! The page will refresh now.");
        window.location.reload(); 
      })
      .catch(err => console.error("Sync error:", err));
  };

  // Only define chartData if we have data
  const chartData = data ? [
    { name: 'Revenue', value: data.totalRevenue },
    { name: 'Orders', value: data.activeOrders },
  ] : [];
  

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Sales Intelligence Overview</h3>
        <button 
          onClick={handleManualSync}
          style={{ padding: '10px 20px', background: '#f3c1c1', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Manual Sync
        </button>
      </div>
      
      <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
        {data ? (
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f3c1c1" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>Loading analytics...</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div style={{ padding: '20px', background: '#fff0f0', borderRadius: '10px' }}>
          <p style={{ margin: 0 }}><strong>Total Revenue:</strong> ₱{data ? data.totalRevenue.toLocaleString() : '0'}</p>
        </div>
        <div style={{ padding: '20px', background: '#fff0f0', borderRadius: '10px' }}>
          <p style={{ margin: 0 }}><strong>Total Completed Orders:</strong> {data ? data.activeOrders : '0'}</p>
        </div>
        <div style={{ padding: '20px', background: '#fff0f0', borderRadius: '10px' }}>
          <p style={{ margin: 0 }}><strong>Top 3 Products:</strong></p>
          <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
            {data?.top_products.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
        <div style={{ padding: '20px', background: '#fff0f0', borderRadius: '10px' }}>
          <p style={{ margin: 0 }}><strong>Total Registered Users:</strong> {data ? data.total_users : '0'}</p>
        </div>
      </div>
    </div>
  );
}
