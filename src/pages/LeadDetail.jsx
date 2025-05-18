import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function LeadDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    axios.get(`/api/properties/${id}`).then((res) => setProperty(res.data));
    axios.get(`/api/messages/${id}`).then((res) => {
      const sortedMessages = res.data.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
      setMessages(sortedMessages);
    });
  }, [id]);

  if (!property) return <div className="p-6">Loading lead details...</div>;

  const fields = property.fields || {};
  const address = `${fields["Property Address"] || ''}, ${fields.City || ''}, ${fields.State || ''} ${fields["Zip Code"] || ''}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(address)}`;

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen" data-lead-name={fields["Owner Name"] || 'Unnamed'}>
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
        <div className="flex justify-center">
          <div className="w-full max-w-2xl flex flex-col gap-1 max-h-[400px] overflow-y-auto px-4">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500">No messages yet.</p>
            )}
            {messages.map((msg) => {
  const isInbound = msg.fields.Direction === 'Inbound';
  const timestamp = new Date(msg.fields.Timestamp).toLocaleString();
  const messageText = msg.fields["Message Body"]?.trim() || '[Empty Message]';

  return (
    <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'} py-2`}>
      <div className={`max-w-lg px-4 py-2 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${
        isInbound
          ? 'bg-blue-100 text-gray-900 rounded-bl-none'
          : 'bg-gray-200 text-gray-800 rounded-br-none'
      }`}>
        <div>{messageText}</div>
        <div className="text-[11px] text-gray-500 mt-1 text-right">
          {timestamp}
        </div>
      </div>
    </div>
  );
})}



          </div>
        </div>
      </div>
    </div>
  );
}
