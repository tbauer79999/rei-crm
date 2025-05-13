import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, User, Phone } from 'lucide-react';

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    axios.get(`/api/properties/${id}`).then((res) => setLead(res.data));
    axios.get(`/api/messages/${id}`).then((res) => setMessages(res.data));
  }, [id]);

  if (!lead) return <div className="p-6">Loading...</div>;

  const f = lead.fields || {};

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Lead Overview</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Property Info */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold text-lg mb-2">Property Info</h2>
          <p className="flex items-center gap-2 text-gray-600 mb-1">
            <MapPin size={16} />
            {f["Property Address"] || 'N/A'}
          </p>
          <p><strong>Bedrooms:</strong> {f.Bedrooms || 'N/A'}</p>
          <p><strong>Bathrooms:</strong> {f.Bathrooms || 'N/A'}</p>
          <p><strong>Square Feet:</strong> {f["Square Feet"] || 'N/A'}</p>
          {f["Property Address"] && (
            <>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(f["Property Address"])}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm underline mt-2 block"
              >
                View on Google Maps
              </a>
              <a
                href={`https://www.zillow.com/homes/${encodeURIComponent(f["Property Address"])}_rb/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm underline mt-1 block"
              >
                View on Zillow
              </a>
            </>
          )}
        </div>

        {/* Lead Info */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold text-lg mb-2">Lead Info</h2>
          <p className="flex items-center gap-2 text-gray-600 mb-1">
            <User size={16} />
            {f["Owner Name"] || 'No Name'}
          </p>
          <p className="flex items-center gap-2 text-gray-600 mb-1">
            <Phone size={16} />
            {f.Phone || 'No phone'}
          </p>
          <p><strong>Status:</strong> {f.Status || 'New Lead'}</p>
          <p><strong>Motivation Score:</strong> {f["Motivation Score"] || 'N/A'}</p>
          <p><strong>Campaign:</strong> {f["Campaign"] || 'N/A'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Customer Messages</h2>
        {messages.length === 0 ? (
          <p className="text-gray-500">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isInbound = msg.fields?.Direction === 'inbound';
              const timestamp = msg.fields?.Timestamp
                ? new Date(msg.fields.Timestamp).toLocaleString()
                : '';
              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded ${
                    isInbound ? 'bg-gray-100 text-left' : 'bg-blue-100 text-right'
                  }`}
                >
                  <p className="text-sm">{msg.fields?.Text || '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">{timestamp}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
