import React, { useState } from 'react';

export default function AddProduct() {
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', e.target.name.value);
    formData.append('price', e.target.price.value);

    await fetch('http://localhost:8000/api/add-product', {
      method: 'POST',
      body: formData,
    });
    alert("Product Deployed!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Product Title" required />
      <input name="price" type="number" placeholder="Price" required />
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button type="submit">Deploy Listing</button>
    </form>
  );
}