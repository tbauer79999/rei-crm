// lib/api.js
export async function fetchProperties() {
    const res = await fetch('http://localhost:5000/api/leads');
    if (!res.ok) throw new Error('Failed to fetch leads');
    return await res.json();
  }
  