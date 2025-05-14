import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart2, Settings, Home, ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/analytics', label: 'Analytics', icon: <BarChart2 size={20} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [recentLeads, setRecentLeads] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [hotLead, setHotLead] = useState(null);
  const [showRecents, setShowRecents] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('recentLeads');
    if (stored) {
      setRecentLeads(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/^\/lead\/(.+)$/);
    const id = match?.[1];
    if (id) {
      // fetch latest lead data to get name
      axios.get(`/api/properties/${id}`).then(res => {
        const name = res.data?.fields?.['Owner Name'] || 'Unnamed';
        const entry = { id, name };
        setRecentLeads(prev => {
          const updated = [entry, ...prev.filter(r => r.id !== id)].slice(0, 5);
          localStorage.setItem('recentLeads', JSON.stringify(updated));
          return updated;
        });
      }).catch(() => {
        // fallback in case of failure
        const entry = { id, name: 'Unnamed' };
        setRecentLeads(prev => {
          const updated = [entry, ...prev.filter(r => r.id !== id)].slice(0, 5);
          localStorage.setItem('recentLeads', JSON.stringify(updated));
          return updated;
        });
      });
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propsRes, messagesRes] = await Promise.all([
          axios.get('/api/properties'),
          axios.get('/api/messages')
        ]);

        const leads = propsRes.data;
        const messages = messagesRes.data;

        const inbound = messages
          .filter(m => m.fields?.Direction === 'inbound')
          .sort((a, b) => new Date(b.fields?.Timestamp) - new Date(a.fields?.Timestamp));
        setRecentMessages(inbound.slice(0, 5));

        const hotCandidates = leads.filter(l =>
          (l.fields?.['Status History'] || '').includes('Hot Lead')
        );

        const lastHot = hotCandidates
          .map(l => {
            const historyLines = (l.fields?.['Status History'] || '').split('\n');
            const hotLine = historyLines.find(h => h.includes('Hot Lead'));
            const date = hotLine ? new Date(hotLine.split(':')[0]) : null;
            return { ...l, hotDate: date };
          })
          .filter(l => l.hotDate)
          .sort((a, b) => b.hotDate - a.hotDate)[0];

        setHotLead(lastHot);
      } catch (err) {
        console.error('Failed to load recents:', err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } bg-white border-r shadow-sm transition-all duration-200 ease-in-out`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {!collapsed && <div className="font-bold text-lg">REI-CRM</div>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500">
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Main Nav */}
        <nav className="mt-2 space-y-1">
          {navItems.map(({ path, label, icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center px-4 py-2 text-sm hover:bg-gray-100 ${
                  isActive
                    ? 'bg-blue-100 text-blue-600 font-semibold'
                    : 'text-gray-700'
                }`}
              >
                <div className="mr-3">{icon}</div>
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Recents */}
        {!collapsed && (
          <div className="mt-6 border-t pt-3 px-4 text-sm text-gray-700">
            <button
              onClick={() => setShowRecents(!showRecents)}
              className="flex justify-between items-center w-full font-semibold"
            >
              <span>Recents</span>
              <span>{showRecents ? '▾' : '▸'}</span>
            </button>

            {showRecents && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="font-medium mb-1">🆕 Leads</p>
                  <ul className="space-y-1">
                    {recentLeads.map((lead) => (
                      <li key={lead.id}>
                        <Link to={`/lead/${lead.id}`} className="block hover:underline truncate">
                          {lead.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-medium mt-3 mb-1">💬 Messages</p>
                  <ul className="space-y-1">
                    {recentMessages.map((msg) => (
                      <li key={msg.id}>
                        <Link to={`/lead/${msg.fields?.Property}`} className="block hover:underline truncate">
                          {msg.fields?.From || 'Lead'}: "{msg.fields?.Body?.slice(0, 30)}"
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {hotLead && (
                  <div>
                    <p className="font-medium mt-3 mb-1">🔥 Last Hot Lead</p>
                    <Link to={`/lead/${hotLead.id}`} className="block text-red-600 hover:underline truncate">
                      {hotLead.fields?.['Owner Name'] || 'Unnamed'}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {hotLead.hotDate?.toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Content container */}
      <div className="flex flex-col flex-1 min-h-screen">
        {/* Top header */}
        <header className="bg-white border-b shadow-sm px-6 py-5 flex justify-between items-center h-20">
          <div className="text-lg font-semibold text-gray-800">REI-CRM</div>
          <div className="text-sm text-gray-600">Welcome, User</div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
