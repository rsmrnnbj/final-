// LiveOrderTracking.jsx
export default function LiveOrderTracking({ orders }) {
  console.log("DEBUG: Orders prop in component:", orders);

  if (!orders) {
    return <div style={{ padding: '20px' }}>Error: 'orders' prop is undefined!</div>;
  }
  
  if (orders.length === 0) {
    return <div style={{ padding: '20px' }}>No orders found in the database.</div>;
  }

  return (
    <div style={containerStyle}>
      {orders.map((order) => (
        <div key={order.id} style={orderRowStyle}>
          <div><strong>Order #{order.id}</strong><br/><small>{order.tracking_ref}</small></div>
          <div>{order.order_date}</div>
          <div style={{fontWeight: 'bold'}}>₱{order.total_statement}</div>
          <div style={{color: '#007bff'}}>{order.status}</div>
        </div>
      ))}
    </div>
  );
}

const containerStyle = { background: '#fff', padding: '20px', borderRadius: '12px' };
const orderRowStyle = { 
  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', 
  padding: '15px', borderBottom: '1px solid #eee', alignItems: 'center' 
};
