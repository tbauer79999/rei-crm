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
      const parsed = JSON.parse(stored);
      Promise.all(
        parsed.map(async (r) => {
          try {
            const res = await axios.get(`/api/properties/${r.id}`);
            return {
              id: r.id,
              name: res.data.fields?.['Owner Name'] || 'Unnamed',
            };
          } catch {
            return null;
          }
        })
      ).then((validated) => {
        const filtered = validated.filter(Boolean);
        setRecentLeads(filtered);
        localStorage.setItem('recentLeads', JSON.stringify(filtered));
      });
    }
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/^\/lead\/(.+)$/);
    const id = match?.[1];
    if (id) {
      axios.get(`/api/properties/${id}`).then(res => {
        const name = res.data?.fields?.['Owner Name'] || 'Unnamed';
        const entry = { id, name };
        setRecentLeads(prev => {
          const updated = [entry, ...prev.filter(r => r.id !== id)].slice(0, 5);
          localStorage.setItem('recentLeads', JSON.stringify(updated));
          return updated;
        });
      }).catch(() => {
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-indigo-50 to-white text-gray-800 border-r shadow-sm transition-all duration-200 ease-in-out`}>

        <div className="flex items-center justify-between px-4 py-3 h-16 border-b border-indigo-300">
          {!collapsed && <div className="font-bold text-lg tracking-tight text-indigo-800">REI-CRM</div>}
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
                className={`flex items-center px-4 py-2 text-sm rounded-md mx-2 transition font-medium 
                  ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-100 text-gray-800'}`}
              >
                <div className="mr-3 text-indigo-800">{icon}</div>
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Recents */}
        {!collapsed && (
          <div className="mt-6 border-t pt-4 px-4 text-sm text-gray-700">
            <button
              onClick={() => setShowRecents(!showRecents)}
              className="flex justify-between items-center w-full font-semibold text-gray-800"
            >
              <span>Recents</span>
              <span>{showRecents ? '▾' : '▸'}</span>
            </button>

            {showRecents && (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="font-medium mb-1 text-indigo-700">🆕 Leads</p>
                  <ul className="space-y-1">
                    {recentLeads.map((lead) => (
                      <li key={lead.id}>
                        <Link to={`/lead/${lead.id}`} className="block hover:underline truncate text-sm">
                          {lead.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-medium mt-3 mb-1 text-indigo-700">💬 Messages</p>
                  <ul className="space-y-1">
                    {recentMessages.map((msg) => (
                      <li key={msg.id}>
                        <Link to={`/lead/${msg.fields?.Property}`} className="block hover:underline truncate text-sm">
                          {msg.fields?.From || 'Lead'}: "{msg.fields?.Body?.slice(0, 30)}"
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {hotLead && (
                  <div>
                    <p className="font-medium mt-3 mb-1 text-indigo-700">🔥 Last Hot Lead</p>
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
<header className="bg-gradient-to-b from-blue-200 to-white border-b border-blue-300 px-6 py-3 flex justify-between items-center h-16 shadow-sm">
          <div className="text-base font-semibold text-gray-700 tracking-tight">Welcome to REI-CRM</div>
          <nav className="flex items-center space-x-6 text-sm">
            <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600 font-medium">Dashboard</Link>
            <Link to="/analytics" className="text-gray-700 hover:text-indigo-600 font-medium">Analytics</Link>
            <Link to="/settings" className="text-gray-700 hover:text-indigo-600 font-medium">Settings</Link>
            <span className="text-gray-500">Welcome, <span className="font-semibold text-indigo-700">User</span></span>
          </nav>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
