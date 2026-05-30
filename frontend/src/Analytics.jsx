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
          totalRevenue:   Number(json.total_revenue)    || 0,
          activeOrders:   Number(json.total_orders)     || 0,
          totalItemsSold: Number(json.total_items_sold) || 0,
          top_products:   parsedTopProducts,
          revenueTrend:   json.revenueTrend || [
            { day: 'Mon', revenue: 0 }, { day: 'Tue', revenue: 0 },
            { day: 'Wed', revenue: 0 }, { day: 'Thu', revenue: 0 },
            { day: 'Fri', revenue: 0 }, { day: 'Sat', revenue: 0 },
            { day: 'Sun', revenue: 0 }
          ],
          orderTrend: json.orderTrend || [
            { day: 'Mon', orders: 0 }, { day: 'Tue', orders: 0 },
            { day: 'Wed', orders: 0 }, { day: 'Thu', orders: 0 },
            { day: 'Fri', orders: 0 }, { day: 'Sat', orders: 0 },
            { day: 'Sun', orders: 0 }
          ],
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
        fetchAnalytics();
      })
      .catch(err => {
        console.error("Sync error:", err);
        alert(`Sync failed: ${err.message}`);
      });
  };

  const revenueChartData = data ? [
    { name: 'Revenue (₱)', value: data.totalRevenue },
  ] : [];

  const countsChartData = data ? [
    { name: 'Orders',     value: data.activeOrders },
    { name: 'Items Sold', value: data.totalItemsSold },
  ] : [];

  const COLORS = ['#f3c1c1', '#f9a8d4', '#fcd34d', '#86efac', '#93c5fd'];
  const pieData = data?.top_products?.map((name, i) => ({ name, value: i + 1 })) || [];

  return (
    <div style={styles.wrapper}>

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Sales Analytics Dashboard</h2>
          <p style={styles.subtitle}>Real-time sales intelligence overview</p>
        </div>
        <button onClick={handleManualSync} style={styles.syncBtn}>
          🔄 Manual Sync
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div style={styles.errorBanner}>
          ⚠️ Could not load analytics: {error}. Try clicking Manual Sync to populate the reporting DB.
        </div>
      )}

      {loading ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '60px 0' }}>Loading analytics data...</p>
      ) : (
        <>
          {/* KPI CARDS — 3 columns only */}
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <p style={styles.kpiLabel}>Total Revenue</p>
              <p style={styles.kpiValue}>₱{data.totalRevenue.toLocaleString()}</p>
            </div>
            <div style={styles.kpiCard}>
              <p style={styles.kpiLabel}>Total Orders</p>
              <p style={styles.kpiValue}>{data.activeOrders.toLocaleString()}</p>
            </div>
            <div style={styles.kpiCard}>
              <p style={styles.kpiLabel}>Items Sold</p>
              <p style={styles.kpiValue}>{data.totalItemsSold.toLocaleString()}</p>
            </div>
          </div>

          {/* CHARTS ROW 1 */}
          <div style={styles.chartGrid2}>
            <div style={styles.chartBox}>
              <h4 style={styles.chartTitle}>Total Revenue (₱)</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `₱${v.toLocaleString()}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={val => [`₱${val.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="value" fill="#f3c1c1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.chartBox}>
              <h4 style={styles.chartTitle}>Orders & Items Sold</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={countsChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val, name) => [val.toLocaleString(), name]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {countsChartData.map((_, i) => (
                      <Cell key={i} fill={['#f9a8d4', '#fcd34d'][i % 2]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHARTS ROW 2 */}
          <div style={styles.chartGrid2}>
            <div style={styles.chartBox}>
              <h4 style={styles.chartTitle}>Weekly Revenue Trend</h4>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={v => `₱${v.toLocaleString()}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={val => [`₱${val.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#f3c1c1" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.chartBox}>
              <h4 style={styles.chartTitle}>Weekly Order Volume</h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.orderTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#f9a8d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHARTS ROW 3 */}
          <div style={styles.chartGrid2}>
            <div style={styles.chartBox}>
              <h4 style={styles.chartTitle}>Top Products (by sales volume)</h4>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
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
                <div style={styles.emptyPie}>
                  No order data yet — place orders to see top products.
                </div>
              )}
            </div>

            <div style={styles.chartBox}>
              <h4 style={styles.chartTitle}>🏆 Top Selling Products</h4>
              {data.top_products.length > 0 ? (
                <div style={{ marginTop: '10px' }}>
                  {data.top_products.map((product, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 0',
                      borderBottom: i < data.top_products.length - 1 ? '1px solid #f0e0e0' : 'none'
                    }}>
                      <span style={styles.rankBadge}>{i + 1}</span>
                      <span style={{ fontWeight: '500', color: '#2d2d2d' }}>{product}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#aaa', marginTop: '20px' }}>No products data yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    background: '#ffffff',
    padding: '35px',
    borderRadius: '20px',
    border: '1px solid #e5e5e5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    color: '#2d2d2d',
    fontWeight: '700',
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#999',
    fontSize: '0.9rem',
  },
  syncBtn: {
    padding: '11px 22px',
    background: '#f3c1c1',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  errorBanner: {
    background: '#fff0f0',
    border: '1px solid #f3c1c1',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
    color: '#c0392b',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '28px',
  },
  kpiCard: {
    background: '#fff8f8',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid #f3c1c1',
  },
  kpiLabel: {
    margin: 0,
    fontSize: '0.72rem',
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  kpiValue: {
    margin: '8px 0 0 0',
    fontSize: '1.7rem',
    fontWeight: 'bold',
    color: '#2d2d2d',
  },
  chartGrid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '22px',
    marginBottom: '22px',
  },
  chartBox: {
    background: '#fafafa',
    borderRadius: '16px',
    padding: '22px',
    border: '1px solid #eeeeee',
  },
  chartTitle: {
    margin: '0 0 12px 0',
    color: '#555',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  emptyPie: {
    height: 260,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aaa',
    border: '1px dashed #ddd',
    borderRadius: '8px',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '20px',
  },
  rankBadge: {
    background: '#f3c1c1',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    flexShrink: 0,
  },
};
