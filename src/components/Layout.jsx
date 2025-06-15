import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2, Settings, Home, ChevronLeft, ChevronRight, LogOut, Menu, X, TrendingUp, Brain, Megaphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, canAccessEnterprise, role } = useAuth();
  const isControlRoom = location.pathname === '/control-room';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'REI-CRM',
    industry: 'real estate',
    loading: true
  });

  // Fetch company information
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!user?.id) {
        console.log('❌ No user ID available for company fetch');
        return;
      }

      console.log('🔍 Fetching company info for user:', user.id);

      try {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log('🏢 Company data:', tenant);
        console.log('❌ Company fetch error:', error);

        if (error) {
          console.error('Error fetching company info:', error);
          setCompanyInfo({
            name: 'REI-CRM',
            industry: 'real estate',
            loading: false
          });
          return;
        }

        if (tenant) {
          // Extract company name and determine industry
          let companyName = tenant.name || 'REI-CRM';
          
          console.log('🏷️ Original company name:', companyName);
          
          // Clean up the company name if it has the default format
          if (companyName.includes("'s Company")) {
            companyName = companyName.replace("'s Company", "");
          }

          // Determine industry/business type
          let industry = 'business';
          if (tenant.industry) {
            industry = tenant.industry.toLowerCase();
          } else if (tenant.business_type) {
            industry = tenant.business_type.toLowerCase();
          } else if (user.email) {
            // Try to guess from email domain or company name
            const domain = user.email.split('@')[1]?.toLowerCase();
            console.log('🌐 Email domain:', domain);
            console.log('🏢 Company name lower:', companyName.toLowerCase());
            
            if (domain?.includes('real') || companyName.toLowerCase().includes('real') || 
                companyName.toLowerCase().includes('rei') || companyName.toLowerCase().includes('property') ||
                companyName.toLowerCase().includes('dream') || companyName.toLowerCase().includes('homes') ||
                companyName.toLowerCase().includes('estate')) {
              industry = 'real estate';
            } else if (domain?.includes('staff') || companyName.toLowerCase().includes('staff') || 
                       companyName.toLowerCase().includes('recruit') || companyName.toLowerCase().includes('hire') ||
                       companyName.toLowerCase().includes('talent') || companyName.toLowerCase().includes('employment')) {
              industry = 'staffing';
            } else if (domain?.includes('tech') || companyName.toLowerCase().includes('tech') || 
                       companyName.toLowerCase().includes('software') || companyName.toLowerCase().includes('app') ||
                       companyName.toLowerCase().includes('digital') || companyName.toLowerCase().includes('dev')) {
              industry = 'technology';
            } else if (companyName.toLowerCase().includes('consult') || companyName.toLowerCase().includes('service') ||
                       companyName.toLowerCase().includes('solution') || companyName.toLowerCase().includes('group')) {
              industry = 'consulting';
            }
          }

          console.log('✅ Final company info:', { name: companyName, industry });

          setCompanyInfo({
            name: companyName,
            industry: industry,
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
        setCompanyInfo({
          name: 'REI-CRM',
          industry: 'real estate',
          loading: false
        });
      }
    };

    fetchCompanyInfo();
  }, [user?.id]);

  // Get page-specific messaging based on current route
  const getPageMessages = () => {
    const companyName = companyInfo.name;
    
    switch (location.pathname) {
      case '/control-room':
        return {
          title: companyInfo.industry === 'staffing' ? 'Candidate Pipeline Control Room' :
                 companyInfo.industry === 'real estate' ? 'Lead Pipeline Control Room' :
                 'Business Pipeline Control Room',
          subtitle: companyInfo.industry === 'staffing' ? 'Monitor and optimize your candidate pipeline' :
                   companyInfo.industry === 'real estate' ? 'Monitor and optimize your lead pipeline' :
                   'Monitor and optimize your business pipeline'
        };
      case '/dashboard':
        return {
          title: companyName,
          subtitle: companyInfo.industry === 'staffing' ? 'Overview of your recruitment metrics and performance' :
                   companyInfo.industry === 'real estate' ? 'Overview of your real estate business performance' :
                   'Overview of your business performance and key metrics'
        };
      case '/business-analytics':
        return {
          title: companyName,
          subtitle: companyInfo.industry === 'staffing' ? 'Deep insights into your recruitment and staffing data' :
                   companyInfo.industry === 'real estate' ? 'Deep insights into your real estate business data' :
                   'Deep insights into your business data and trends'
        };
      case '/enterprise-analytics':
        return {
          title: companyName,
          subtitle: 'Enterprise-level analytics and cross-business insights'
        };
      case '/campaign-management':
        return {
          title: companyName,
          subtitle: companyInfo.industry === 'staffing' ? 'Create and manage recruitment campaigns' :
                   companyInfo.industry === 'real estate' ? 'Create and manage lead generation campaigns' :
                   'Create and manage marketing campaigns'
        };
      case '/settings':
        return {
          title: companyName,
          subtitle: 'Configure your account, team, and system preferences'
        };
      default:
        return {
          title: companyName,
          subtitle: companyInfo.industry === 'staffing' ? 'Manage your staffing and recruitment operations' :
                   companyInfo.industry === 'real estate' ? 'Manage your real estate business' :
                   'Manage your business operations'
        };
    }
  };

  const messages = getPageMessages();

  // Dynamic navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { path: '/control-room', label: 'Pipeline', icon: BarChart2 },
      { path: '/dashboard', label: 'Dashboard', icon: Home },
    ];

    // Add analytics based on role
    const analyticsItems = [];
    
    // Enterprise Analytics - only for global_admin and enterprise_admin
    if (canAccessEnterprise) {
      analyticsItems.push({
        path: '/enterprise-analytics', 
        label: 'Enterprise Analytics', 
        icon: TrendingUp 
      });
    }
    
    // AI Strategy Hub - only for admin roles
    if (['global_admin', 'enterprise_admin', 'business_admin'].includes(role)) {
      analyticsItems.push({
        path: '/business-analytics', 
        label: 'AI Strategy Hub', 
        icon: Brain 
      });
    }

    // Campaign Management - for all users now
    analyticsItems.push({
      path: '/campaign-management',
      label: 'Campaign Management',
      icon: Megaphone
    });

    const endItems = [
      { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return [...baseItems, ...analyticsItems, ...endItems];
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Clear local storage first
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error);
        // Even if there's an error, still navigate to login
      }
      
      console.log('✅ Logout successful');
      
      // Navigate to login page
      navigate('/login');
    } catch (err) {
      console.error('❌ Logout exception:', err);
      // Force navigation to login even on error
      navigate('/login');
    }
  };

  // Get company initials for logo
  const getCompanyInitials = () => {
    if (companyInfo.loading) return 'R';
    
    const name = companyInfo.name;
    if (name === 'REI-CRM') return 'R';
    
    // Get initials from company name
    const words = name.split(' ').filter(word => word.length > 0);
    if (words.length >= 2) {
      return words[0][0].toUpperCase() + words[1][0].toUpperCase();
    } else if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return 'BC'; // Business CRM fallback
  };

  const companyInitials = getCompanyInitials();

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
                <span className="text-white font-bold text-xs">
                  {companyInitials}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 tracking-tight text-sm leading-tight">
                  {companyInfo.loading ? 'Loading...' : companyInfo.name}
                </span>
                {!companyInfo.loading && companyInfo.name !== 'REI-CRM' && (
                  <span className="text-xs text-gray-500 capitalize">
                    {companyInfo.industry} CRM
                  </span>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {companyInitials}
              </span>
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
                  {role && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 mr-1">
                      {role.replace('_', ' ')}
                    </span>
                  )}
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
                {messages.title}
              </h1>
              <p className="text-sm text-gray-500 hidden sm:block">
                {messages.subtitle}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <span>Welcome,</span>
              <span className="font-medium text-gray-900">
                {user ? user.email.split('@')[0] : 'Guest'}
              </span>
              {role && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  {role.replace('_', ' ')}
                </span>
              )}
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