import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../lib/apiClient';
const LeadMessages = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

const fetchMessages = async () => {
  try {
    const res = await apiClient.get(`/messages/${id}`);
    console.log('✅ Full message data:', res.data);
    setMessages(res.data);
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
};


  useEffect(() => {
    fetchMessages();
  }, [id]);

const handleSend = async () => {
  if (!newMessage.trim()) return;

  setIsSending(true);
  try {
    await apiClient.post('/sendMessage', {
      leadId: id,
      message: newMessage,
    });
    setNewMessage('');
    fetchMessages(); // Refresh messages after sending
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    setIsSending(false);
  }
};


  const formatTimestamp = (msg) => {
    const raw = msg.Timestamp || msg['Created Time'] || msg['Date'] || null;
    return raw
      ? new Date(raw).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';
  };

  return (
    <div className="bg-white border rounded shadow p-6 mt-8">
      <h2 className="text-xl font-bold mb-4">Customer Messages</h2>
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded ${
                msg.Direction === 'Inbound' ? 'bg-gray-100' : 'bg-blue-100'
              }`}
            >
              <div className="text-sm">
                <span className="font-semibold">
                  {msg.Direction === 'Inbound' ? 'Customer:' : 'You:'}
                </span>{' '}
                {msg['Message Body'] || 'No content'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatTimestamp(msg)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="border rounded px-3 py-2 w-full"
        />
        <button
          onClick={handleSend}
          disabled={isSending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default LeadMessages;
