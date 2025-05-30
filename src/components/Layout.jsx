import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2, Settings, Home, ChevronLeft, ChevronRight, LogOut, Menu, X, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../lib/authService';
import apiClient from '../lib/apiClient';

const navItems = [
  { path: '/control-room', label: 'Pipeline', icon: BarChart2 },
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/enterprise-analytics', label: 'Enterprise Analytics', icon: TrendingUp },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isControlRoom = location.pathname === '/control-room';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOutUser();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${collapsed ? 'w-16' : 'w-64'} 
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:static inset-y-0 left-0 z-50
        bg-white border-r border-gray-200/80 
        transition-all duration-300 ease-out
        shadow-xl lg:shadow-none
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 h-16 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="font-semibold text-gray-900 tracking-tight">REI-CRM</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`
                  group flex items-center ${collapsed ? 'justify-center px-3' : 'px-3'} py-2.5 
                  text-sm font-medium rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                {!collapsed && <span>{label}</span>}
                {!collapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-75" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom spacing */}
        <div className="flex-1" />

        {/* User section at bottom */}
        {!collapsed && user && (
          <div className="p-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-white shadow-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-h-screen lg:ml-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200/80 px-4 lg:px-6 py-3 flex justify-between items-center h-16 shadow-sm">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
                {isControlRoom ? 'AI Pipeline Control Room' : 'Welcome to REI-CRM'}
              </h1>
              <p className="text-sm text-gray-500 hidden sm:block">
                {isControlRoom ? 'Monitor and optimize your lead pipeline' : 'Manage your real estate business'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <span>Welcome,</span>
              <span className="font-medium text-gray-900">
                {user ? user.email.split('@')[0] : 'Guest'}
              </span>
            </div>
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:block">Logout</span>
              </button>
            )}
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 lg:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}