import React, { useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';

export default function InventoryManagement({ inventory, onDelete, onEdit, onAdd }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInventory = inventory.filter((item) =>
    item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={containerStyle}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: 12, top: 13, color: '#aaa' }} />
          <input
            placeholder="Filter stock by name..."
            style={searchStyle}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button style={addButtonStyle} onClick={onAdd}>
          <FaPlus style={{ marginRight: '8px' }} /> Add New Product
        </button>
      </div>

      {/* Table Area */}
      <table style={tableStyle}>
        <thead>
          <tr style={headerRowStyle}>
            <th style={{ padding: '15px' }}>ITEM INFO</th>
            <th>CATEGORY KEY</th>
            <th>UNIT VALUATION PRICE</th>
            <th>DISPLAY VISIBILITY</th>
            <th>OPERATIONAL ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {filteredInventory.map((item) => (
            <tr key={item.id} style={rowStyle}>
              <td style={{ padding: '15px' }}>{item.name}</td>
              <td>{item.category || 'N/A'}</td>
              <td>₱{Number(item.price || 0).toLocaleString()}</td>
              <td>
                <span style={visibilityBadge}>✔ Live On Store</span>
              </td>
              <td>
                <button onClick={() => onEdit(item)} style={actionButtonStyle}>
                  <FaEdit />
                </button>
                {/* THIS IS THE DELETE BUTTON */}
                <button 
                  onClick={() => onDelete(item.id)} 
                  style={{ ...actionButtonStyle, color: '#d93025' }}
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Ensure these styles are at the bottom of the file
const containerStyle = { background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e0e0e0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '10px' };
const headerRowStyle = { borderBottom: '2px solid #f0f0f0', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase' };
const rowStyle = { borderBottom: '1px solid #f9f9f9', fontSize: '0.95rem', height: '60px' };
const searchStyle = { padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #ddd', width: '280px' };
const addButtonStyle = { background: '#2d2d2d', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' };
const actionButtonStyle = { border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', marginRight: '15px', color: '#555' };
const visibilityBadge = { color: '#1e7e34', fontSize: '0.85rem', fontWeight: 'bold', background: '#e8f5e9', padding: '4px 8px', borderRadius: '4px' };