import React, { useState } from 'react';

export default function AddLeadForm({ onSuccess }) {
  const [form, setForm] = useState({
    owner: '',
    phone: '',
    address: '',
    status: 'Hot Lead',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:5000/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'Owner Name': form.owner,
          'Phone': form.phone,
          'Property Address': form.address,
          'Status': form.status,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit lead');

      alert('Lead submitted!');
      setForm({ owner: '', phone: '', address: '', status: 'Hot Lead' });
      onSuccess?.();
    } catch (error) {
      console.error(error);
      alert('Error submitting lead.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded-xl shadow border-2 border-gray-300 mb-6 max-w-xl mx-auto"
    >
      <input
        name="owner"
        value={form.owner}
        onChange={handleChange}
        placeholder="Owner Name"
        className="w-full border px-3 py-2 rounded"
      />
      <input
        name="phone"
        value={form.phone}
        onChange={handleChange}
        placeholder="Phone"
        className="w-full border px-3 py-2 rounded"
      />
      <input
        name="address"
        value={form.address}
        onChange={handleChange}
        placeholder="Property Address"
        className="w-full border px-3 py-2 rounded"
      />
      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
      >
        <option>Hot Lead</option>
        <option>Cold Lead</option>
        <option>Unsubscribed</option>
      </select>
      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={() =>
            setForm({ owner: '', phone: '', address: '', status: 'Hot Lead' })
          }
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
