import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2, Settings, Home, ChevronLeft, ChevronRight, LogOut, Menu, X, TrendingUp, Brain, Megaphone,
  Bell, Search, HelpCircle, ChevronDown, ChevronUp, User
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTopUserMenu, setShowTopUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'REI-CRM',
    industry: 'real estate',
    loading: true
  });

  // Fetch company information
// Fixed fetchCompanyInfo function for Layout.jsx
// Replace the existing fetchCompanyInfo function with this one:

useEffect(() => {
  const fetchCompanyInfo = async () => {
    if (!user?.tenant_id) {  // ✅ Check for tenant_id, not just id
      console.log('❌ No tenant ID available for company fetch');
      return;
    }

    console.log('🔍 Fetching company info for tenant:', user.tenant_id);  // ✅ Log tenant_id

    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user.tenant_id)  // ✅ Use tenant_id instead of user.id
        .single();

      console.log('🏢 Company data:', tenant);
      if (error) {
        console.error('❌ Company fetch error:', error);
      }

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
}, [user?.tenant_id]);  // ✅ Also update the dependency to watch tenant_id

  // Add click outside handler to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTopUserMenu || showUserMenu) {
        const isClickInside = event.target.closest('.user-menu-container');
        if (!isClickInside) {
          setShowTopUserMenu(false);
          setShowUserMenu(false);
        }
      }
      
      // Close search results when clicking outside
      if (showSearchResults) {
        const isClickInsideSearch = event.target.closest('.search-container');
        if (!isClickInsideSearch) {
          setShowSearchResults(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTopUserMenu, showUserMenu, showSearchResults]);

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
          title: 'Dashboard',
          subtitle: companyInfo.industry === 'staffing' ? 'Overview of your recruitment metrics and performance' :
                   companyInfo.industry === 'real estate' ? 'Overview of your real estate business performance' :
                   'Overview of your business performance and key metrics'
        };
      case '/business-analytics':
        return {
          title: 'AI Strategy Hub',
          subtitle: companyInfo.industry === 'staffing' ? 'Deep insights into your recruitment and staffing data' :
                   companyInfo.industry === 'real estate' ? 'Deep insights into your real estate business data' :
                   'Deep insights into your business data and trends'
        };
      case '/enterprise-analytics':
        return {
          title: 'Enterprise Analytics',
          subtitle: 'Enterprise-level analytics and cross-business insights'
        };
      case '/campaign-management':
        return {
          title: 'Campaign Management',
          subtitle: companyInfo.industry === 'staffing' ? 'Create and manage recruitment campaigns' :
                   companyInfo.industry === 'real estate' ? 'Create and manage lead generation campaigns' :
                   'Create and manage marketing campaigns'
        };
      case '/settings':
        return {
          title: 'Settings',
          subtitle: 'Configure your account, team, and system preferences'
        };
      default:
        return {
          title: location.pathname.slice(1).split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ') || 'Home',
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
      { path: '/control-room', label: 'Pipeline', icon: BarChart2, tourClass: 'tour-controlroom' },
      { path: '/dashboard', label: 'Dashboard', icon: Home, tourClass: 'tour-dashboard' },
    ];

    // Add analytics based on role
    const analyticsItems = [];
    
    // Enterprise Analytics - only for global_admin and enterprise_admin
    if (canAccessEnterprise) {
      analyticsItems.push({
        path: '/enterprise-analytics', 
        label: 'Enterprise Analytics', 
        icon: TrendingUp,
        tourClass: 'tour-enterprise'
      });
    }
    
    // AI Strategy Hub - only for admin roles
    if (['global_admin', 'enterprise_admin', 'business_admin'].includes(role)) {
      analyticsItems.push({
        path: '/business-analytics', 
        label: 'AI Strategy Hub', 
        icon: Brain,
        tourClass: 'tour-strategy'
      });
    }

    // Campaign Management - for all users now
    analyticsItems.push({
      path: '/campaign-management',
      label: 'Campaign Management',
      icon: Megaphone,
      tourClass: 'tour-campaigns'
    });

    const endItems = [
      { path: '/settings', label: 'Settings', icon: Settings, tourClass: 'tour-settings' },
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

  // Search functionality
  const performSearch = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    console.log('🔍 Searching for:', query);
    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // Search leads - updated to match your schema
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, email, phone, status, ai_status, ai_score')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5);

      console.log('📊 Leads results:', leads);
      console.log('❌ Leads error:', leadsError);

      // Search campaigns - updated to match your schema
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, description, is_active, ai_on, start_date, end_date')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('archived', false) // Don't show archived campaigns
        .limit(5);

      console.log('📊 Campaigns results:', campaigns);
      console.log('❌ Campaigns error:', campaignsError);

      if (leadsError) console.error('Error searching leads:', leadsError);
      if (campaignsError) console.error('Error searching campaigns:', campaignsError);

      setSearchResults({
        leads: leads || [],
        campaigns: campaigns || []
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchResultClick = (type, item) => {
    // Navigate to the appropriate page based on the result type
    if (type === 'lead') {
      navigate(`/lead/${item.id}`);  // Changed from /leads/ to /lead/
    } else if (type === 'campaign') {
      navigate(`/campaign/${item.id}`);  // Changed from /campaigns/ to /campaign/
    }
    
    // Clear search
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults(null);
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
        tour-sidebar
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
          {navItems.map(({ path, label, icon: Icon, tourClass }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`
                  ${tourClass || ''}
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
          <div className="p-3 border-t border-gray-100 user-menu-container">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-semibold">
                    {user?.email?.substring(0, 2).toUpperCase() || 'US'}
                  </span>
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    role === 'global_admin' ? 'bg-red-100 text-red-700' :
                    role === 'enterprise_admin' ? 'bg-purple-100 text-purple-700' :
                    role === 'business_admin' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="truncate">{companyInfo.name}</span>
                </p>
              </div>
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="mt-2 py-2 bg-white rounded-xl border border-gray-200 shadow-lg">
                <Link to="/profile" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="w-4 h-4 mr-3 text-gray-400" />
                  My Profile
                </Link>
                <Link to="/settings" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="w-4 h-4 mr-3 text-gray-400" />
                  Settings
                </Link>
                <hr className="my-2 border-gray-100" />
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-h-screen lg:ml-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 h-16">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                <Menu size={20} />
              </button>
              
              {/* Breadcrumb style navigation */}
              <div className="flex items-center space-x-2">
                <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
                  {companyInfo.name}
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <h1 className="text-sm font-semibold text-gray-900">
                  {messages.title}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Search Box */}
              <div className="tour-global-search hidden md:flex items-center relative search-container">
                <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  placeholder="Search leads, campaigns..."
                  className="pl-10 pr-4 py-2 w-64 lg:w-80 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                />
                
                {/* Search Results Dropdown */}
                {showSearchResults && (searchResults || isSearching) && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        <div className="inline-flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </div>
                      </div>
                    ) : searchResults && (searchResults.leads.length > 0 || searchResults.campaigns.length > 0) ? (
                      <div>
                        {/* Leads Section */}
                        {searchResults.leads.length > 0 && (
                          <div>
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                              LEADS
                            </div>
                            {searchResults.leads.map((lead) => (
                              <button
                                key={`lead-${lead.id}`}
                                onClick={() => handleSearchResultClick('lead', lead)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                              >
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {lead.name || 'Unnamed Lead'}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {lead.email || lead.phone || 'No contact info'}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {lead.ai_score && (
                                    <span className="text-xs font-medium text-gray-600">
                                      Score: {lead.ai_score}
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    lead.status === 'active' ? 'bg-green-100 text-green-700' :
                                    lead.status === 'qualified' ? 'bg-blue-100 text-blue-700' :
                                    lead.status === 'disqualified' ? 'bg-red-100 text-red-700' :
                                    lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {lead.status || 'Unknown'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Campaigns Section */}
                        {searchResults.campaigns.length > 0 && (
                          <div>
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-t border-gray-100">
                              CAMPAIGNS
                            </div>
                            {searchResults.campaigns.map((campaign) => (
                              <button
                                key={`campaign-${campaign.id}`}
                                onClick={() => handleSearchResultClick('campaign', campaign)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                              >
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {campaign.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {campaign.description ? 
                                      (campaign.description.length > 50 ? 
                                        campaign.description.substring(0, 50) + '...' : 
                                        campaign.description
                                      ) : 
                                      `${campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'No start date'}`
                                    }
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-2">
                                  {campaign.ai_on && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                      AI
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    campaign.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {campaign.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : searchQuery.length >= 2 ? (
                      <div className="p-8 text-center">
                        <div className="text-gray-400 mb-2">
                          <Search size={32} className="mx-auto" />
                        </div>
                        <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                        <p className="text-xs text-gray-400 mt-1">Try searching with different keywords</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* Mobile Search Button */}
              <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                <Search size={18} />
              </button>
              
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
{/* Help */}
<Link to="/help" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
  <HelpCircle size={18} />
</Link> 
              {/* User menu */}
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowTopUserMenu(!showTopUserMenu)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {user?.email?.substring(0, 2).toUpperCase() || 'US'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {/* Dropdown */}
                {showTopUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{companyInfo.name}</p>
                    </div>
                    <div className="py-1">
                      <Link to="/profile" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <User className="w-4 h-4 mr-3 text-gray-400" />
                        My Profile
                      </Link>
                      <Link to="/settings" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Settings className="w-4 h-4 mr-3 text-gray-400" />
                        Settings & Preferences
                      </Link>
                      <Link to="/help" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <HelpCircle className="w-4 h-4 mr-3 text-gray-400" />
                        Help & Support
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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