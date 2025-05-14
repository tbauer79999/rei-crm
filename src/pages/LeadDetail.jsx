import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function LeadDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    axios.get(`/api/properties/${id}`).then((res) => setProperty(res.data));
    axios.get(`/api/messages/${id}`).then((res) => setMessages(res.data));
  }, [id]);

  if (!property) return <div className="p-6">Loading lead details...</div>;

  const fields = property.fields || {};
  const address = `${fields["Property Address"] || ''}, ${fields.City || ''}, ${fields.State || ''} ${fields["Zip Code"] || ''}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(address)}`;

  return (
    <div
      className="p-6 space-y-6 bg-gray-100 min-h-screen"
      data-lead-name={fields["Owner Name"] || 'Unnamed'}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lead Detail</h1>
        <Link to="/dashboard" className="text-blue-600 underline text-sm hover:text-blue-800">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Property + Owner Info */}
      <div className="bg-white rounded shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Property Info</h2>
          <div className="text-sm space-y-1">
            <p><strong>Address:</strong> {fields["Property Address"] || '—'}</p>
            <p><strong>City:</strong> {fields.City || '—'}</p>
            <p><strong>State:</strong> {fields.State || '—'}</p>
            <p><strong>Zip Code:</strong> {fields["Zip Code"] || '—'}</p>
            <p><strong>Bedrooms:</strong> {fields.Bedrooms || '—'}</p>
            <p><strong>Bathrooms:</strong> {fields.Bathrooms || '—'}</p>
            <p><strong>Square Footage:</strong> {fields["Square Footage"] || '—'}</p>
            <p className="pt-2 space-x-3">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Maps</a>
              <a href={zillowUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Zillow</a>
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Owner Info</h2>
          <div className="text-sm space-y-1">
            <p><strong>Name:</strong> {fields["Owner Name"] || '—'}</p>
            <p><strong>Phone:</strong> {fields.Phone || '—'}</p>
            <p><strong>Email:</strong> {fields.Email || '—'}</p>
            <p><strong>Campaign:</strong> {fields.Campaign || '—'}</p>
            <p><strong>Status:</strong> {fields.Status || '—'}</p>
            <p><strong>Notes:</strong> {fields.Notes || '—'}</p>
          </div>
        </div>
      </div>

      {/* Message History */}
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Message History</h2>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-gray-500">No messages yet.</p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-xl px-4 py-2 rounded-lg text-sm shadow ${
                msg.fields.Direction === 'inbound'
                  ? 'bg-blue-100 text-blue-900 self-start'
                  : 'bg-gray-200 text-gray-800 self-end ml-auto'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {new Date(msg.fields.Timestamp).toLocaleString()}
              </div>
              <div>{msg.fields.Body || '[Empty Message]'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
