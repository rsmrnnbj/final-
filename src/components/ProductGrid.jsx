// src/components/ProductGrid.jsx
import React from 'react';

export default function ProductGrid({ products, addToCart, favorites = [], toggleFavorite }) {
  if (products.length === 0) {
    return (
      <div className="empty-catalog-fallback">
        No product assets found matching those parameters.
      </div>
    );
  }

  return (
    <div className="premium-products-matrix-grid">
      {products.map(product => {
        const isFav = favorites.some(item => item.id === product.id);

        return (
          <div className="aesthetic-product-card" key={product.id}>
            
            {/* Visual Container Frame */}
            <div className="card-image-box">
              <img 
  // ADD THE http://localhost:8000/static/ BEFORE product.image_url
  src={`http://localhost:8000/static/${product.image_url}`} 
  alt={product.name} 
  onError={(e) => {
    e.target.onerror = null;
    e.target.src = 'https://via.placeholder.com/200?text=No+Image';
  }}
/>
              
              {/* FIXED: Added direct onClick trigger for favorites */}
              <button 
                className="card-favorite-overlay-trigger" 
                onClick={() => toggleFavorite(product)}
                title="Save to Favorites"
                style={{ cursor: 'pointer', zIndex: 10 }}
              >
                <i className={isFav ? "fa-solid fa-heart" : "fa-regular fa-heart"} style={{ color: isFav ? '#ef4444' : '' }}></i>
              </button>
            </div>

            {/* Details Descriptions Panel */}
            <div className="card-details-panel">
              <h4 className="product-title-heading">{product.name}</h4>
              
              <div className="card-footer-metrics-row">
                <span className="product-price-tag">₱{parseFloat(product.price || 0).toLocaleString()}</span>
                <span className="product-stock-counter-pill">Stock: {product.stock || 0}</span>
              </div>

              {/* FIXED: Changed style class to card-action-add-to-cart-btn and mapped onClick */}
              <button 
                className="card-action-add-to-cart-btn" 
                disabled={(product.stock || 0) <= 0}
                onClick={() => addToCart(product)}
                style={{ cursor: 'pointer' }}
              >
                {(product.stock || 0) <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
}