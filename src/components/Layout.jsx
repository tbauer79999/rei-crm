import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2, Settings, Home, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../lib/authService';
import apiClient from '../lib/apiClient';

const navItems = [
  { path: '/control-room', label: 'Pipeline', icon: BarChart2 },
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isControlRoom = location.pathname === '/control-room';

  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = async () => {
    await signOutUser();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <aside className={`${collapsed ? 'w-16' : 'w-52'} bg-gradient-to-b from-indigo-50 to-white text-gray-800 border-r shadow-sm transition-all duration-200 ease-in-out`}>
        <div className="flex items-center justify-between px-4 py-3 h-16 border-b border-indigo-300">
          {!collapsed && <div className="font-bold text-lg tracking-tight text-indigo-800">REI-CRM</div>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500">
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="mt-2 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`group flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-2 text-sm rounded-md mx-2 transition font-medium 
                  ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-100 text-gray-800'}`}
              >
                <Icon className={`h-5 w-5 group-hover:text-indigo-500 ${isActive ? 'text-white' : 'text-indigo-800'}`} />
                {!collapsed && <span className="ml-3">{label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-col flex-1 min-h-screen">
        <header className="bg-gradient-to-b from-blue-200 to-white border-b border-blue-300 px-6 py-3 flex justify-between items-center h-16 shadow-sm">
          <div className="text-base font-semibold text-gray-700 tracking-tight">
            {isControlRoom ? 'AI Pipeline Control Room' : 'Welcome to REI-CRM'}
          </div>
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

        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
