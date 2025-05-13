// lib/api.js
export async function fetchProperties() {
    const res = await fetch('http://localhost:5000/api/properties');
    if (!res.ok) throw new Error('Failed to fetch properties');
    return await res.json();
  }
  