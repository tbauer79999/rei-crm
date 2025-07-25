import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Add this import at the top with the other lucide-react imports
import {
  BarChart2, Settings, Home, ChevronLeft, ChevronRight, LogOut, Menu, X, TrendingUp, Brain, Megaphone,
  Bell, Search, HelpCircle, ChevronDown, ChevronUp, User
} from 'lucide-react';
import ProductTour from './ProductTour';
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
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'REI-CRM',
    industry: 'real estate',
    loading: true
  });

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Fetch company information
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!user?.tenant_id) {
        console.log('❌ No tenant ID available for company fetch');
        return;
      }

      console.log('🔍 Fetching company info for tenant:', user.tenant_id);

      try {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', user.tenant_id)
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
  }, [user?.tenant_id]);

  // Fetch notifications based on user role - FIXED: No WebSocket connections
  useEffect(() => {
    if (!user?.id || !user?.tenant_id) return;

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        
        let query = supabase
          .from('notifications')
          .select(`
            id,
            lead_id,
            title,
            message,
            priority,
            read,
            created_at,
            data,
            leads (
              id,
              name,
              phone,
              campaign_id,
              campaigns (
                id,
                name,
                assigned_to_sales_team_id
              )
            )
          `)
          .eq('tenant_id', user.tenant_id)
          .eq('type', 'lead_escalation')
          .order('created_at', { ascending: false })
          .limit(20);

        // If user is not business_admin or global_admin, filter by assigned campaigns
        if (role !== 'business_admin' && role !== 'global_admin') {
          // Get campaigns assigned to this user
          const { data: userCampaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('assigned_to_sales_team_id', user.id)
            .eq('tenant_id', user.tenant_id);

          const campaignIds = userCampaigns?.map(c => c.id) || [];
          
          if (campaignIds.length > 0) {
            query = query.in('leads.campaign_id', campaignIds);
          } else {
            // User has no assigned campaigns, show no notifications
            setNotifications([]);
            setUnreadCount(0);
            setNotificationsLoading(false);
            return;
          }
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }

        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.read).length || 0);
      } catch (error) {
        console.error('Error in notification fetch:', error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    // Initial fetch
    fetchNotifications();

    // 🔥 FIXED: Use polling instead of real-time WebSocket subscriptions
    // Poll for new notifications every 30 seconds
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 seconds

    // Cleanup function
    return () => {
      clearInterval(pollInterval);
    };
  }, [user?.id, user?.tenant_id, role]);

  // Crisp Chat Widget Integration
  useEffect(() => {
    // Don't initialize if no user
    if (!user?.email) return;

    // Initialize Crisp
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "850ecb8b-77d9-492e-bfc2-265894dc2402";
    
    // Set user context for better support
    window.$crisp.push(["set", "user:email", user.email]);
    window.$crisp.push(["set", "user:nickname", user.email.split('@')[0]]);
    window.$crisp.push(["set", "session:data", {
      company: companyInfo.name,
      role: role,
      tenant_id: user.tenant_id,
      industry: companyInfo.industry
    }]);
    
    // Load Crisp script
    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);
    
    console.log('✅ Crisp chat widget initialized for:', user.email);
    
    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [user?.email, companyInfo.name, role]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    navigate(`/lead/${notification.lead_id}`);
    setShowNotifications(false);
  };

  // Delete/dismiss notification
  const dismissNotification = async (e, notificationId) => {
    e.stopPropagation(); // Prevent navigation when clicking X
    
    try {
      // Delete from database
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if it was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unreadIds);

        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

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

      // Close notifications when clicking outside
      if (showNotifications) {
        const isClickInsideNotifications = event.target.closest('.notifications-container');
        if (!isClickInsideNotifications) {
          setShowNotifications(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTopUserMenu, showUserMenu, showSearchResults, showNotifications]);

  // Get page-specific messaging based on current route
  const getPageMessages = () => {
    const companyName = companyInfo.name;
    
    switch (location.pathname) {
      case '/control-room':
        return {
          title: companyInfo.industry === 'staffing' ? 'Candidate Pipeline Control Room' :
                 companyInfo.industry === 'real estate' ? 'Lead Pipeline Control Room' :
                 'SurFox Control Room',
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
      { path: '/control-room', label: 'Intelligence Center', icon: BarChart2, tourClass: 'tour-controlroom' },
      { path: '/dashboard', label: 'Pipeline', icon: Home, tourClass: 'tour-dashboard' },
    ];

    // Add analytics based on role
    const analyticsItems = [];
    
    // Enterprise Analytics - only for global_admin
    if (canAccessEnterprise) {
      analyticsItems.push({
        path: '/enterprise-analytics', 
        label: 'Enterprise Analytics', 
        icon: TrendingUp,
        tourClass: 'tour-enterprise'
      });
    }
    
    // AI Strategy Hub - only for admin roles
    if (['global_admin', 'business_admin'].includes(role)) {
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
    setShowMobileSearch(false); // Close mobile search overlay
  };

  const companyInitials = getCompanyInitials();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {(mobileOpen || showMobileSearch) && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => {
            setMobileOpen(false);
            setShowMobileSearch(false);
          }}
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
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">
                  {companyInitials}
                </span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-gray-900 tracking-tight text-sm leading-tight truncate">
                  {companyInfo.loading ? 'Loading...' : companyInfo.name}
                </span>
                {!companyInfo.loading && companyInfo.name !== 'REI-CRM' && (
                  <span className="text-xs text-gray-500 capitalize truncate">
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
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
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
                <Icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'} flex-shrink-0`} />
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-75 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-h-screen lg:ml-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 h-16">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 flex-shrink-0"
              >
                <Menu size={20} />
              </button>
              
              {/* Breadcrumb style navigation */}
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 truncate">
                  {companyInfo.name}
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <h1 className="text-sm font-semibold text-gray-900 truncate">
                  {messages.title}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
              {/* Desktop Search Box */}
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
                
                {/* Desktop Search Results Dropdown */}
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
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {lead.name || 'Unnamed Lead'}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {lead.email || lead.phone || 'No contact info'}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
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
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {campaign.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {campaign.description ? 
                                      (campaign.description.length > 50 ? 
                                        campaign.description.substring(0, 50) + '...' : 
                                        campaign.description
                                      ) : 
                                      `${campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'No start date'}`
                                    }
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
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
              <button 
                onClick={() => setShowMobileSearch(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                <Search size={18} />
              </button>
              
              {/* Notifications */}
              <div className="relative notifications-container">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[600px] bg-white rounded-lg border border-gray-200 shadow-xl z-50 flex flex-col max-w-[calc(100vw-2rem)] sm:max-w-none">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    
                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-8 text-center">
                          <div className="inline-flex items-center text-sm text-gray-500">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading notifications...
                          </div>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">No notifications yet</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {role === 'business_admin' || role === 'global_admin'
                              ? "You'll see all escalated leads here"
                              : "You'll see notifications for your assigned leads here"}
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const priorityColors = {
                            critical: 'bg-red-100 text-red-800 border-red-200',
                            high: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                            medium: 'bg-blue-100 text-blue-800 border-blue-200',
                            low: 'bg-gray-100 text-gray-800 border-gray-200'
                          };
                          
                          return (
                            <button
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                                !notification.read ? 'bg-blue-50/30' : ''
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                {/* Priority indicator */}
                                <div className={`mt-0.5 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                  priorityColors[notification.priority] || priorityColors.low
                                }`}>
                                  {notification.priority?.toUpperCase() || 'LOW'}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                                      {notification.title}
                                    </p>
                                    <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                      {!notification.read && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                      )}
                                      <button
                                        onClick={(e) => dismissNotification(e, notification.id)}
                                        className="p-1 rounded hover:bg-gray-200 transition-colors group"
                                        aria-label="Dismiss notification"
                                      >
                                        <X className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  
                                  {notification.leads && (
                                    <div className="mt-2 flex items-center text-xs text-gray-500 truncate">
                                      <span className="font-medium truncate">
                                        {notification.leads.name || 'Unknown Lead'}
                                      </span>
                                      <span className="mx-1 flex-shrink-0">•</span>
                                      <span className="truncate">{notification.leads.campaigns?.name || 'No Campaign'}</span>
                                    </div>
                                  )}
                                  
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-100">
                        <Link
                          to="/notifications"
                          className="block text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          View all notifications
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Help */}
              <Link to="/help" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                <HelpCircle size={18} />
              </Link> 
              
              {/* User menu */}
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowTopUserMenu(!showTopUserMenu)}
                  className="flex items-center space-x-2 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-semibold">
                      {user?.email?.substring(0, 2).toUpperCase() || 'US'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 leading-tight truncate">
                      {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                
                {/* Dropdown */}
                {showTopUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{companyInfo.name}</p>
                    </div>
                    <div className="py-1">
                      <Link to="/profile" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <User className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                        My Profile
                      </Link>
                      <Link to="/settings" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Settings className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                        Settings & Preferences
                      </Link>
                      <Link to="/help" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <HelpCircle className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                        Help & Support
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Search Overlay */}
        {showMobileSearch && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="bg-white h-full flex flex-col">
              {/* Search Header */}
              <div className="flex items-center p-4 border-b border-gray-200">
                <button
                  onClick={() => setShowMobileSearch(false)}
                  className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 mr-3"
                >
                  <X size={20} />
                </button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leads, campaigns..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Mobile Search Results */}
              <div className="flex-1 overflow-y-auto">
                {isSearching ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    <div className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </div>
                  </div>
                ) : searchResults && (searchResults.leads.length > 0 || searchResults.campaigns.length > 0) ? (
                  <div>
                    {/* Mobile Leads Section */}
                    {searchResults.leads.length > 0 && (
                      <div>
                        <div className="px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                          LEADS
                        </div>
                        {searchResults.leads.map((lead) => (
                          <button
                            key={`mobile-lead-${lead.id}`}
                            onClick={() => handleSearchResultClick('lead', lead)}
                            className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="text-base font-medium text-gray-900 truncate">
                                  {lead.name || 'Unnamed Lead'}
                                </div>
                                <div className="text-sm text-gray-500 mt-1 truncate">
                                  {lead.email || lead.phone || 'No contact info'}
                                </div>
                                {lead.ai_score && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    Score: {lead.ai_score}
                                  </div>
                                )}
                              </div>
                              <div className="ml-3 flex-shrink-0">
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
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Mobile Campaigns Section */}
                    {searchResults.campaigns.length > 0 && (
                      <div>
                        <div className="px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                          CAMPAIGNS
                        </div>
                        {searchResults.campaigns.map((campaign) => (
                          <button
                            key={`mobile-campaign-${campaign.id}`}
                            onClick={() => handleSearchResultClick('campaign', campaign)}
                            className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="text-base font-medium text-gray-900 truncate">
                                  {campaign.name}
                                </div>
                                <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                                  {campaign.description || `Started: ${campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'No start date'}`}
                                </div>
                              </div>
                              <div className="ml-3 flex-shrink-0 flex flex-col items-end space-y-1">
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
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 mb-3">
                      <Search size={48} className="mx-auto" />
                    </div>
                    <p className="text-base text-gray-500 mb-1">No results found for "{searchQuery}"</p>
                    <p className="text-sm text-gray-400">Try searching with different keywords</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 mb-3">
                      <Search size={48} className="mx-auto" />
                    </div>
                    <p className="text-base text-gray-500 mb-1">Search your leads and campaigns</p>
                    <p className="text-sm text-gray-400">Type at least 2 characters to start searching</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 p-4 lg:p-6 bg-gray-50">
          {children}
        </main>
        
        {/* Add ProductTour here */}
        <ProductTour />
      </div>
    </div>
  );
};