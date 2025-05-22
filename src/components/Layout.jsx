import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2, Settings, Home, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signOutUser } from '../../lib/authService';
import apiClient from '../../lib/apiClient';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/analytics', label: 'Analytics', icon: <BarChart2 size={20} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user from AuthContext

  const [collapsed, setCollapsed] = useState(false);
  const [recentLeads, setRecentLeads] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [hotLead, setHotLead] = useState(null);
  const [showRecents, setShowRecents] = useState(true);
  const [recentsError, setRecentsError] = useState(null); // New state for recents error

  const handleLogout = async () => {
    await signOutUser();
    navigate('/login');
  };

  useEffect(() => {
    const stored = localStorage.getItem('recentLeads');
    if (stored) {
      const parsed = JSON.parse(stored);
      Promise.all(
        parsed.map(async (r) => {
          try {
            const res = await apiClient.get(`/properties/${r.id}`);
            return {
              id: r.id,
              name: res.data.owner_name || 'Unnamed',
            };
          } catch (err) {
            // console.error('Error fetching individual recent lead (localStorage):', err); // Optional: more specific logging
            return null;
          }
        })
      ).then((validated) => {
        const filtered = validated.filter(Boolean);
        setRecentLeads(filtered);
        // localStorage.setItem('recentLeads', JSON.stringify(filtered)); // Already set by other useEffect
      }).catch(err => {
        // console.error('Error processing recent leads from localStorage:', err); // Optional
        // Potentially set an error state here if this is critical
      });
    }
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/^\/lead\/(.+)$/);
    const id = match?.[1];
    if (id && user) { // Only update if user is logged in
      apiClient.get(`/properties/${id}`).then(res => {
        const name = res.data.owner_name || 'Unnamed';
        const entry = { id, name };
        setRecentLeads(prev => {
          const updated = [entry, ...prev.filter(r => r.id !== id)].slice(0, 5);
          localStorage.setItem('recentLeads', JSON.stringify(updated));
          return updated;
        });
      }).catch(err => {
        // console.error(`Error fetching lead details for recents (ID: ${id}):`, err); // Optional
        // Don't necessarily set recentsError here as it's for a specific lead update
        // and not the general "Recents" section loading.
        const entry = { id, name: 'Unnamed (Error)' }; // Indicate error in name if desired
        setRecentLeads(prev => {
          const updated = [entry, ...prev.filter(r => r.id !== id)].slice(0, 5);
          localStorage.setItem('recentLeads', JSON.stringify(updated));
          return updated;
        });
      });
    }
  }, [location.pathname, user]); // Add user dependency

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return; 
      setRecentsError(null); // Clear previous errors on new fetch attempt
      try {
        const [propsRes, messagesRes] = await Promise.all([
          apiClient.get('/properties'),
          apiClient.get('/messages')
        ]);

        const leads = propsRes.data;
        const messages = messagesRes.data;

        const inbound = messages
          .filter(m => m.direction === 'inbound') 
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); 
        setRecentMessages(inbound.slice(0, 5));

        const hotCandidates = leads.filter(l =>
          (l.status_history || '').includes('Hot Lead') 
        );

        const lastHot = hotCandidates
          .map(l => {
            const historyLines = (l.status_history || '').split('\n'); 
            const hotLine = historyLines.find(h => h.includes('Hot Lead'));
            const date = hotLine ? new Date(hotLine.split(':')[0]) : null;
            return { ...l, hotDate: date };
          })
          .filter(l => l.hotDate)
          .sort((a, b) => b.hotDate - a.hotDate)[0];

        setHotLead(lastHot);
      } catch (err) {
        console.error('Failed to load recents:', err.message); 
        setRecentsError('Failed to load recent activity. Please try again later.');
      }
    };

    if (user) { 
      fetchData();
    } else {
      // Clear recents data if user logs out
      setRecentLeads([]);
      setRecentMessages([]);
      setHotLead(null);
      setRecentsError(null);
    }
  }, [user]); 

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
        {!collapsed && user && ( 
          <div className="mt-6 border-t pt-4 px-4 text-sm text-gray-700">
            <button
              onClick={() => setShowRecents(!showRecents)}
              className="flex justify-between items-center w-full font-semibold text-gray-800"
            >
              <span>Recents</span>
              <span>{showRecents ? '▾' : '▸'}</span>
            </button>

            {showRecents && recentsError && (
              <div className="mt-2 px-2 py-2 text-sm text-red-600 bg-red-100 border border-red-300 rounded-md">
                {recentsError}
              </div>
            )}

            {showRecents && !recentsError && ( // Only show lists if no error
              <div className="mt-3 space-y-4">
                <div>
                  <p className="font-medium mb-1 text-indigo-700">🆕 Leads</p>
                  <ul className="space-y-1">
                    {recentLeads.length > 0 ? recentLeads.map((lead) => (
                      <li key={lead.id}>
                        <Link to={`/lead/${lead.id}`} className="block hover:underline truncate text-sm">
                          {lead.name}
                        </Link>
                      </li>
                    )) : <li className="text-xs text-gray-500">No recent leads.</li>}
                  </ul>
                </div>

                <div>
                  <p className="font-medium mt-3 mb-1 text-indigo-700">💬 Messages</p>
                  <ul className="space-y-1">
                    {recentMessages.length > 0 ? recentMessages.map((msg) => (
                      <li key={msg.id}>
                        <Link to={`/lead/${msg.property_id}`} className="block hover:underline truncate text-sm"> 
                          {msg.from || 'Lead'}: "{msg.body?.slice(0, 30)}" 
                        </Link>
                      </li>
                    )) : <li className="text-xs text-gray-500">No recent messages.</li>}
                  </ul>
                </div>

                {hotLead && (
                  <div>
                    <p className="font-medium mt-3 mb-1 text-indigo-700">🔥 Last Hot Lead</p>
                    <Link to={`/lead/${hotLead.id}`} className="block text-red-600 hover:underline truncate">
                      {hotLead.owner_name || 'Unnamed'} 
                    </Link>
                    <p className="text-xs text-gray-500">
                      {hotLead.hotDate?.toLocaleDateString()}
                    </p>
                  </div>
                )}
                 {!hotLead && recentLeads.length > 0 && recentMessages.length > 0 && ( // Show if no specific hot lead but other recents exist
                    <li className="text-xs text-gray-500 mt-1">No current hot lead.</li>
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
            <span className="text-gray-500">
              Welcome, <span className="font-semibold text-indigo-700">{user ? user.email : 'Guest'}</span>
            </span>
            {user && (
              <button 
                onClick={handleLogout} 
                className="flex items-center text-gray-700 hover:text-indigo-600 font-medium"
                title="Logout"
              >
                <LogOut size={18} className="mr-1" /> Logout
              </button>
            )}
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
