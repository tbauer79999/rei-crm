import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2, Settings, Home, ChevronLeft, ChevronRight, LogOut, Menu, X, TrendingUp, Brain, Megaphone,
  Bell, Search, HelpCircle, ChevronDown, ChevronUp, User, Star, Clock, Filter, Keyboard, Moon, Sun,
  Volume2, VolumeX, Trash2, Archive, RefreshCw, Wifi, WifiOff, Lightbulb, Heart, History, MessageCircle
} from 'lucide-react';
import ProductTour from './ProductTour';
import { useAuth, useSessionTracking } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';

// Custom hooks for better state management
const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  }, [key]);

  return [value, setStoredValue];
};

const useNotifications = (user, role) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !user?.tenant_id) return;

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
          type,
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
        .order('created_at', { ascending: false })
        .limit(50);

      if (role !== 'business_admin' && role !== 'global_admin') {
        const { data: userCampaigns } = await supabase
          .from('campaigns')
          .select('id')
          .eq('assigned_to_sales_team_id', user.id)
          .eq('tenant_id', user.tenant_id);

        const campaignIds = userCampaigns?.map(c => c.id) || [];
        
        if (campaignIds.length > 0) {
          query = query.in('leads.campaign_id', campaignIds);
        } else {
          setNotifications([]);
          setUnreadCount(0);
          setNotificationsLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setRetryCount(prev => prev + 1);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user?.id, user?.tenant_id, role]);

  return {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    notificationsLoading,
    fetchNotifications,
    retryCount
  };
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Layout Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please refresh the page to continue</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Skeleton Components
const SkeletonLoader = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const NotificationSkeleton = () => (
  <div className="p-4 border-b border-gray-100">
    <div className="flex items-start space-x-3">
      <SkeletonLoader className="w-16 h-6 rounded-full" />
      <div className="flex-1">
        <SkeletonLoader className="w-3/4 h-4 mb-2" />
        <SkeletonLoader className="w-full h-3 mb-1" />
        <SkeletonLoader className="w-1/2 h-3" />
      </div>
    </div>
  </div>
);

// Virtualized Notification List Component
const VirtualizedNotificationList = ({ notifications, onNotificationClick, onDismiss, markAsRead }) => {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = 80;
      const containerHeight = container.clientHeight;
      
      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.min(start + Math.ceil(containerHeight / itemHeight) + 5, notifications.length);
      
      setVisibleRange({ start, end });
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [notifications.length]);

  const visibleNotifications = notifications.slice(visibleRange.start, visibleRange.end);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div style={{ height: `${notifications.length * 80}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${visibleRange.start * 80}px)` }}>
          {visibleNotifications.map((notification) => {
            const priorityColors = {
              critical: 'bg-red-100 text-red-800 border-red-200',
              high: 'bg-yellow-100 text-yellow-800 border-yellow-200',
              medium: 'bg-blue-100 text-blue-800 border-blue-200',
              low: 'bg-gray-100 text-gray-800 border-gray-200'
            };
            
            return (
              <button
                key={notification.id}
                onClick={() => onNotificationClick(notification)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-all duration-200 border-b border-gray-100 group ${
                  !notification.read ? 'bg-blue-50/30' : ''
                }`}
                style={{ height: '80px' }}
              >
                <div className="flex items-start space-x-3">
                  <div className={`mt-0.5 px-2 py-1 rounded-full text-xs font-medium transition-all group-hover:scale-105 ${
                    priorityColors[notification.priority] || priorityColors.low
                  }`}>
                    {notification.priority?.toUpperCase() || 'LOW'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                        {notification.title}
                      </p>
                      <div className="flex items-center space-x-2 ml-2">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" />
                        )}
                        <button
                          onClick={(e) => onDismiss(e, notification.id)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors group opacity-0 group-hover:opacity-100"
                          aria-label="Dismiss notification"
                        >
                          <X className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
                      {notification.message}
                    </p>
                    
                    {notification.leads && (
                      <div className="mt-1 flex items-center text-xs text-gray-500">
                        <span className="font-medium truncate">
                          {notification.leads.name || 'Unknown Lead'}
                        </span>
                        <span className="mx-1">•</span>
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
          })}
        </div>
      </div>
    </div>
  );
};

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, canAccessEnterprise, role } = useAuth();
  
  useSessionTracking();
  
  // Enhanced state management with localStorage
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);
  const [darkMode, setDarkMode] = useLocalStorage('dark-mode', false);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('sound-enabled', true);
  const [searchHistory, setSearchHistory] = useLocalStorage('search-history', []);
  const [recentPages, setRecentPages] = useLocalStorage('recent-pages', []);
  const [favorites, setFavorites] = useLocalStorage('favorite-pages', []);
  const [notificationPreferences, setNotificationPreferences] = useLocalStorage('notification-preferences', {
    email: true,
    inApp: true,
    sound: true,
    critical: true,
    high: true,
    medium: true,
    low: false
  });
  
  // Regular state
  const isControlRoom = location.pathname === '/control-room';
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTopUserMenu, setShowTopUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showHelp, setShowHelp] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [showNotificationPreferences, setShowNotificationPreferences] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Company info state
  const [companyInfo, setCompanyInfo] = useState({
    name: 'SurFox',
    industry: 'sales',
    loading: true
  });

  // Refs for keyboard navigation and click outside
  const searchInputRef = useRef(null);
  const sidebarRef = useRef(null);

  // Custom notification hook
  const {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    notificationsLoading,
    fetchNotifications,
    retryCount
  } = useNotifications(user, role);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-collapse sidebar on mobile after navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Track recent pages
  useEffect(() => {
    const currentPage = {
      path: location.pathname,
      title: getPageMessages().title,
      timestamp: Date.now()
    };

    setRecentPages(prev => {
      const filtered = prev.filter(page => page.path !== currentPage.path);
      return [currentPage, ...filtered].slice(0, 5);
    });
  }, [location.pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (window.innerWidth >= 768) {
          searchInputRef.current?.focus();
        } else {
          setShowMobileSearch(true);
        }
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setShowNotifications(false);
        setShowMobileSearch(false);
        setShowUserMenu(false);
        setShowTopUserMenu(false);
        setShowHelp(false);
        setShowKeyboardShortcuts(false);
      }

      // Navigation shortcuts
      if (e.altKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            navigate('/control-room');
            break;
          case '2':
            e.preventDefault();
            navigate('/dashboard');
            break;
          case '3':
            e.preventDefault();
            navigate('/business-analytics');
            break;
          case '4':
            e.preventDefault();
            navigate('/campaign-management');
            break;
          case '5':
            e.preventDefault();
            navigate('/settings');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Sound notification system
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !notificationPreferences.sound) return;
    
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykGJHfI8N2QQAoUXrTp66hVFApGn+LyxmwhBSKNyOrcjykG');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Sound play failed:', e));
    } catch (error) {
      console.log('Sound not available:', error);
    }
  }, [soundEnabled, notificationPreferences.sound]);

  // Enhanced notification fetching with retry and sound
  useEffect(() => {
    if (!user?.id || !user?.tenant_id) return;

    fetchNotifications();

    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [fetchNotifications]);

  // Play sound for new notifications
  useEffect(() => {
    const prevUnreadCount = useRef(unreadCount);
    
    if (unreadCount > prevUnreadCount.current && prevUnreadCount.current !== 0) {
      playNotificationSound();
    }
    
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, playNotificationSound]);

  // Fetch company information with retry logic
  useEffect(() => {
    const fetchCompanyInfo = async (retryCount = 0) => {
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

        if (error) {
          console.error('❌ Company fetch error:', error);
          if (retryCount < 3) {
            setTimeout(() => fetchCompanyInfo(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
        }

        if (error) {
          setCompanyInfo({
            name: 'REI-CRM',
            industry: 'real estate',
            loading: false
          });
          return;
        }

        if (tenant) {
          let companyName = tenant.name || 'REI-CRM';
          
          if (companyName.includes("'s Company")) {
            companyName = companyName.replace("'s Company", "");
          }

          let industry = 'business';
          if (tenant.industry) {
            industry = tenant.industry.toLowerCase();
          } else if (tenant.business_type) {
            industry = tenant.business_type.toLowerCase();
          } else if (user.email) {
            const domain = user.email.split('@')[1]?.toLowerCase();
            
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

          setCompanyInfo({
            name: companyName,
            industry: industry,
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
        if (retryCount < 3) {
          setTimeout(() => fetchCompanyInfo(retryCount + 1), 1000 * (retryCount + 1));
        } else {
          setCompanyInfo({
            name: 'REI-CRM',
            industry: 'real estate',
            loading: false
          });
        }
      }
    };

    fetchCompanyInfo();
  }, [user?.tenant_id]);

  // Enhanced Crisp Chat Widget Integration
  useEffect(() => {
    if (!user?.email) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "850ecb8b-77d9-492e-bfc2-265894dc2402";
    
    window.$crisp.push(["set", "user:email", user.email]);
    window.$crisp.push(["set", "user:nickname", user.email.split('@')[0]]);
    window.$crisp.push(["set", "session:data", {
      company: companyInfo.name,
      role: role,
      tenant_id: user.tenant_id,
      industry: companyInfo.industry,
      darkMode: darkMode,
      version: "2.0.0"
    }]);
    
    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);
    
    console.log('✅ Crisp chat widget initialized for:', user.email);
    
    return () => {
      const existingScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [user?.email, companyInfo.name, role, darkMode]);

  // Enhanced click outside handler with improved performance
  useEffect(() => {
    const handleClickOutside = (event) => {
      const checks = [
        { condition: showTopUserMenu || showUserMenu, selector: '.user-menu-container', setState: () => { setShowTopUserMenu(false); setShowUserMenu(false); }},
        { condition: showSearchResults, selector: '.search-container', setState: () => setShowSearchResults(false) },
        { condition: showNotifications, selector: '.notifications-container', setState: () => setShowNotifications(false) },
        { condition: showHelp, selector: '.help-container', setState: () => setShowHelp(false) }
      ];

      checks.forEach(({ condition, selector, setState }) => {
        if (condition && !event.target.closest(selector)) {
          setState();
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTopUserMenu, showUserMenu, showSearchResults, showNotifications, showHelp]);

  // Get page-specific messaging based on current route
  const getPageMessages = useCallback(() => {
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
  }, [location.pathname, companyInfo]);

  // Dynamic navigation items based on user role
  const getNavItems = useCallback(() => {
    const baseItems = [
      { path: '/control-room', label: 'Intelligence Center', icon: BarChart2, tourClass: 'tour-controlroom', shortcut: 'Alt+1' },
      { path: '/dashboard', label: 'Pipeline', icon: Home, tourClass: 'tour-dashboard', shortcut: 'Alt+2' },
    ];

    const analyticsItems = [];
    
    if (canAccessEnterprise) {
      analyticsItems.push({
        path: '/enterprise-analytics', 
        label: 'Enterprise Analytics', 
        icon: TrendingUp,
        tourClass: 'tour-enterprise'
      });
    }
    
    if (['global_admin', 'business_admin'].includes(role)) {
      analyticsItems.push({
        path: '/business-analytics', 
        label: 'AI Strategy Hub', 
        icon: Brain,
        tourClass: 'tour-strategy',
        shortcut: 'Alt+3'
      });
    }

    analyticsItems.push({
      path: '/campaign-management',
      label: 'Campaign Management',
      icon: Megaphone,
      tourClass: 'tour-campaigns',
      shortcut: 'Alt+4'
    });

    const endItems = [
      { path: '/settings', label: 'Settings', icon: Settings, tourClass: 'tour-settings', shortcut: 'Alt+5' },
    ];

    return [...baseItems, ...analyticsItems, ...endItems];
  }, [role, canAccessEnterprise]);

  // Memoized computations for performance
  const navItems = useMemo(() => getNavItems(), [getNavItems]);
  const companyInitials = useMemo(() => getCompanyInitials(), [companyInfo]);
  const pageMessages = useMemo(() => getPageMessages(), [getPageMessages]);
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'all') return notifications;
    if (notificationFilter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.priority === notificationFilter);
  }, [notifications, notificationFilter]);

  // Enhanced logout with proper cleanup
  const handleLogout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');
      
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error);
      }
      
      console.log('✅ Logout successful');
      navigate('/login');
    } catch (err) {
      console.error('❌ Logout exception:', err);
      navigate('/login');
    }
  }, [navigate]);

  // Get company initials for logo
  const getCompanyInitials = useCallback(() => {
    if (companyInfo.loading) return 'R';
    
    const name = companyInfo.name;
    if (name === 'REI-CRM') return 'R';
    
    const words = name.split(' ').filter(word => word.length > 0);
    if (words.length >= 2) {
      return words[0][0].toUpperCase() + words[1][0].toUpperCase();
    } else if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return 'BC';
  }, [companyInfo]);

  // Enhanced search functionality with history
  const performSearch = useCallback(async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    console.log('🔍 Searching for:', query);
    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const [leadsResult, campaignsResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id, name, email, phone, status, ai_status, ai_score')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(5),
        
        supabase
          .from('campaigns')
          .select('id, name, description, is_active, ai_on, start_date, end_date')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('archived', false)
          .limit(5)
      ]);

      const { data: leads, error: leadsError } = leadsResult;
      const { data: campaigns, error: campaignsError } = campaignsResult;

      if (leadsError) console.error('Error searching leads:', leadsError);
      if (campaignsError) console.error('Error searching campaigns:', campaignsError);

      setSearchResults({
        leads: leads || [],
        campaigns: campaigns || []
      });

      // Add to search history
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.query !== query);
        return [{ query, timestamp: Date.now() }, ...filtered].slice(0, 10);
      });

    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [setSearchHistory]);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, performSearch]);

  // Enhanced notification actions
  const markAsRead = useCallback(async (notificationId) => {
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
  }, [setNotifications, setUnreadCount]);

  const handleNotificationClick = useCallback((notification) => {
    markAsRead(notification.id);
    navigate(`/lead/${notification.lead_id}`);
    setShowNotifications(false);
  }, [markAsRead, navigate]);

  const dismissNotification = useCallback(async (e, notificationId) => {
    e.stopPropagation();
    
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, [notifications, setNotifications, setUnreadCount]);

  const markAllAsRead = useCallback(async () => {
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
  }, [notifications, setNotifications, setUnreadCount]);

  const handleSearchResultClick = useCallback((type, item) => {
    if (type === 'lead') {
      navigate(`/lead/${item.id}`);
    } else if (type === 'campaign') {
      navigate(`/campaign/${item.id}`);
    }
    
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults(null);
  }, [navigate]);

  // Toggle favorite page
  const toggleFavorite = useCallback((path, title) => {
    setFavorites(prev => {
      const exists = prev.find(fav => fav.path === path);
      if (exists) {
        return prev.filter(fav => fav.path !== path);
      } else {
        return [...prev, { path, title, timestamp: Date.now() }].slice(0, 10);
      }
    });
  }, [setFavorites]);

  const isFavorite = useCallback((path) => {
    return favorites.some(fav => fav.path === path);
  }, [favorites]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <ErrorBoundary>
      <div className={`flex min-h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900 overflow-x-hidden max-w-full transition-colors duration-300`}>
        {/* Offline indicator */}
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
            <div className="flex items-center justify-center space-x-2">
              <WifiOff size={16} />
              <span className="text-sm">You're offline. Some features may not work properly.</span>
            </div>
          </div>
        )}

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Enhanced Sidebar */}
        <aside 
          ref={sidebarRef}
          className={`
            tour-sidebar
            ${collapsed ? 'w-16' : 'w-64'} 
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            fixed lg:static inset-y-0 left-0 z-50
            bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
            transition-all duration-300 ease-out
            shadow-xl lg:shadow-none
            max-w-full
          `}
        >
          {/* Enhanced Header */}
          <div className="flex items-center justify-between px-4 py-4 h-16 border-b border-gray-100 dark:border-gray-700">
            {!collapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {companyInitials}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 dark:text-white tracking-tight text-sm leading-tight">
                    {companyInfo.loading ? (
                      <SkeletonLoader className="w-20 h-4" />
                    ) : (
                      companyInfo.name
                    )}
                  </span>
                  {!companyInfo.loading && companyInfo.name !== 'REI-CRM' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
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
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
              <button 
                onClick={() => setMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Enhanced Navigation */}
          <nav className="p-3 space-y-1">
            {/* Favorites section */}
            {!collapsed && favorites.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Favorites
                </div>
                {favorites.slice(0, 3).map(({ path, title }) => (
                  <Link
                    key={`fav-${path}`}
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Heart className="h-4 w-4 mr-3 text-red-400" />
                    <span className="truncate">{title}</span>
                  </Link>
                ))}
                <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
              </div>
            )}

            {/* Main navigation */}
            {navItems.map(({ path, label, icon: Icon, tourClass, shortcut }) => {
              const isActive = location.pathname === path;
              return (
                <div key={path} className="relative group">
                  <Link
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      ${tourClass || ''}
                      group flex items-center ${collapsed ? 'justify-center px-3' : 'px-3'} py-2.5 
                      text-sm font-medium rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`} />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{label}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavorite(path, label);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/20 transition-all"
                            title={isFavorite(path) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart className={`w-3 h-3 ${isFavorite(path) ? 'fill-red-400 text-red-400' : 'text-gray-400'}`} />
                          </button>
                          {isActive && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full opacity-75" />
                          )}
                        </div>
                      </>
                    )}
                  </Link>
                  
                  {/* Tooltip for collapsed sidebar */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {label}
                      {shortcut && (
                        <div className="text-gray-400 text-xs mt-1">{shortcut}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Recent pages */}
            {!collapsed && recentPages.length > 1 && (
              <div className="mt-4">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Recent
                </div>
                {recentPages.slice(1, 4).map(({ path, title }) => (
                  <Link
                    key={`recent-${path}`}
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Clock className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="truncate">{title}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-h-screen lg:ml-0 w-full max-w-full overflow-x-hidden">
          {/* Enhanced Top header */}
          <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-3 h-16 ${!isOnline ? 'mt-10' : ''}`}>
            <div className="flex justify-between items-center h-full w-full min-w-0">
              <div className="flex items-center space-x-4 min-w-0 flex-1">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                >
                  <Menu size={20} />
                </button>
                
                {/* Enhanced Breadcrumb */}
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <Link to="/dashboard" className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 truncate">
                    {companyInfo.loading ? (
                      <SkeletonLoader className="w-16 h-4" />
                    ) : (
                      companyInfo.name
                    )}
                  </Link>
                  <ChevronRight className="hidden sm:block w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center space-x-2">
                    <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {pageMessages.title}
                    </h1>
                    <button
                      onClick={() => toggleFavorite(location.pathname, pageMessages.title)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={isFavorite(location.pathname) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite(location.pathname) ? 'fill-red-400 text-red-400' : 'text-gray-400'}`} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0 ml-2">
                {/* Enhanced Search Box */}
                <div className="tour-global-search hidden md:flex items-center relative search-container">
                  <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.length >= 2) {
                        setShowSearchResults(true);
                      } else {
                        setShowSearchHistory(true);
                      }
                    }}
                    placeholder="Search leads, campaigns... (⌘K)"
                    className="pl-10 pr-4 py-2 w-64 lg:w-80 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                  />
                  
                  {/* Enhanced Search Results Dropdown */}
                  {(showSearchResults || showSearchHistory) && (
                    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 w-80 lg:w-96 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50 max-h-96 overflow-y-auto">
                      {showSearchHistory && searchHistory.length > 0 && !searchQuery && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                            <span>RECENT SEARCHES</span>
                            <button
                              onClick={() => setSearchHistory([])}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {searchHistory.slice(0, 5).map((item, index) => (
                            <button
                              key={index}
                              onClick={() => setSearchQuery(item.query)}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
                            >
                              <History className="w-4 h-4 mr-3 text-gray-400" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{item.query}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {isSearching ? (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
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
                          {/* Enhanced Leads Section */}
                          {searchResults.leads.length > 0 && (
                            <div>
                              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                LEADS ({searchResults.leads.length})
                              </div>
                              {searchResults.leads.map((lead) => (
                                <button
                                  key={`lead-${lead.id}`}
                                  onClick={() => handleSearchResultClick('lead', lead)}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group"
                                >
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {lead.name || 'Unnamed Lead'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {lead.email || lead.phone || 'No contact info'}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {lead.ai_score && (
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
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
                          
                          {/* Enhanced Campaigns Section */}
                          {searchResults.campaigns.length > 0 && (
                            <div>
                              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600">
                                CAMPAIGNS ({searchResults.campaigns.length})
                              </div>
                              {searchResults.campaigns.map((campaign) => (
                                <button
                                  key={`campaign-${campaign.id}`}
                                  onClick={() => handleSearchResultClick('campaign', campaign)}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {campaign.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
                          <p className="text-sm text-gray-500 dark:text-gray-400">No results found for "{searchQuery}"</p>
                          <p className="text-xs text-gray-400 mt-1">Try searching with different keywords</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                
                {/* Mobile Search Button */}
                <button 
                  onClick={() => setShowMobileSearch(true)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                  title="Search (⌘K)"
                >
                  <Search size={18} />
                </button>
                
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                  title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Sound Toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                  title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
                >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                
                {/* Enhanced Notifications */}
                <div className="relative notifications-container">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                    title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Enhanced Notifications Dropdown */}
                  {showNotifications && (
                    <div className="fixed top-16 right-4 w-80 sm:w-96 max-h-[600px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
                      {/* Enhanced Header */}
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                          {retryCount > 0 && (
                            <button
                              onClick={fetchNotifications}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Retry loading notifications"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Filter dropdown */}
                          <select
                            value={notificationFilter}
                            onChange={(e) => setNotificationFilter(e.target.value)}
                            className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            <option value="all">All</option>
                            <option value="unread">Unread</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Enhanced Notifications List */}
                      {notificationsLoading ? (
                        <div className="flex-1">
                          {[...Array(3)].map((_, i) => (
                            <NotificationSkeleton key={i} />
                          ))}
                        </div>
                      ) : filteredNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {notificationFilter === 'all' ? 'No notifications yet' : `No ${notificationFilter} notifications`}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {role === 'business_admin' || role === 'global_admin'
                              ? "You'll see all escalated leads here"
                              : "You'll see notifications for your assigned leads here"}
                          </p>
                        </div>
                      ) : (
                        <VirtualizedNotificationList
                          notifications={filteredNotifications}
                          onNotificationClick={handleNotificationClick}
                          onDismiss={dismissNotification}
                          markAsRead={markAsRead}
                        />
                      )}
                      
                      {/* Enhanced Footer */}
                      {filteredNotifications.length > 0 && (
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                          <Link
                            to="/notifications"
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                          >
                            View all notifications
                          </Link>
                          <button
                            onClick={() => setShowNotificationPreferences(!showNotificationPreferences)}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <Settings size={14} />
                          </button>
                        </div>
                      )}

                      {/* Notification Preferences Dropdown */}
                      {showNotificationPreferences && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-60 p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Notification Preferences</h4>
                          <div className="space-y-2">
                            {Object.entries(notificationPreferences).map(([key, value]) => (
                              <label key={key} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={value}
                                  onChange={(e) => setNotificationPreferences(prev => ({
                                    ...prev,
                                    [key]: e.target.checked
                                  }))}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Enhanced Help */}
                <div className="relative help-container">
                  <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                    title="Help & Support"
                  >
                    <HelpCircle size={18} />
                  </button>

                  {/* Help Dropdown */}
                  {showHelp && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Help & Support</h3>
                      </div>
                      <div className="py-1">
                        <Link to="/help" className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <HelpCircle className="w-4 h-4 mr-3 text-gray-400" />
                          Help Center
                        </Link>
                        <button 
                          onClick={() => setShowKeyboardShortcuts(true)}
                          className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Keyboard className="w-4 h-4 mr-3 text-gray-400" />
                          Keyboard Shortcuts
                        </button>
                        <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <Lightbulb className="w-4 h-4 mr-3 text-gray-400" />
                          Feature Tour
                        </button>
                        <button
                          onClick={() => {
                            if (window.$crisp) {
                              window.$crisp.push(['do', 'chat:open']);
                            }
                          }}
                          className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <MessageCircle className="w-4 h-4 mr-3 text-gray-400" />
                          Live Chat Support
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Enhanced User menu */}
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowTopUserMenu(!showTopUserMenu)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {user?.email?.substring(0, 2).toUpperCase() || 'US'}
                      </span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                        {user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {/* Enhanced Dropdown */}
                  {showTopUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50 max-w-[calc(100vw-2rem)] sm:max-w-none">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{companyInfo.name}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isOnline ? (
                              <>
                                <Wifi className="w-3 h-3 mr-1" />
                                Online
                              </>
                            ) : (
                              <>
                                <WifiOff className="w-3 h-3 mr-1" />
                                Offline
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="py-1">
                        <Link to="/profile" className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <User className="w-4 h-4 mr-3 text-gray-400" />
                          My Profile
                        </Link>
                        <Link to="/settings" className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <Settings className="w-4 h-4 mr-3 text-gray-400" />
                          Settings & Preferences
                        </Link>
                        <button 
                          onClick={() => setShowKeyboardShortcuts(true)}
                          className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Keyboard className="w-4 h-4 mr-3 text-gray-400" />
                          Keyboard Shortcuts
                        </button>
                        <Link to="/help" className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <HelpCircle className="w-4 h-4 mr-3 text-gray-400" />
                          Help & Support
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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

          {/* Enhanced Mobile Search Overlay */}
          {showMobileSearch && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="bg-white dark:bg-gray-900 h-full flex flex-col">
                {/* Search Header */}
                <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowMobileSearch(false)}
                    className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 mr-3"
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
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                      autoFocus
                    />
                  </div>
                </div>
              
                {/* Mobile Search Results */}
                <div className="flex-1 overflow-y-auto">
                  {/* Search History for Mobile */}
                  {!searchQuery && searchHistory.length > 0 && (
                    <div>
                      <div className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span>RECENT SEARCHES</span>
                        <button
                          onClick={() => setSearchHistory([])}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      {searchHistory.slice(0, 5).map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(item.query);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 flex items-center"
                        >
                          <History className="w-4 h-4 mr-3 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{item.query}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {isSearching ? (
                    <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
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
                          <div className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                            LEADS ({searchResults.leads.length})
                          </div>
                          {searchResults.leads.map((lead) => (
                            <button
                              key={`mobile-lead-${lead.id}`}
                              onClick={() => {
                                handleSearchResultClick('lead', lead);
                                setShowMobileSearch(false);
                              }}
                              className="w-full px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-medium text-gray-900 dark:text-white truncate">
                                    {lead.name || 'Unnamed Lead'}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                    {lead.email || lead.phone || 'No contact info'}
                                  </div>
                                  {lead.ai_score && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
                          <div className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                            CAMPAIGNS ({searchResults.campaigns.length})
                          </div>
                          {searchResults.campaigns.map((campaign) => (
                            <button
                              key={`mobile-campaign-${campaign.id}`}
                              onClick={() => {
                                handleSearchResultClick('campaign', campaign);
                                setShowMobileSearch(false);
                              }}
                              className="w-full px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-medium text-gray-900 dark:text-white truncate">
                                    {campaign.name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
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
                      <p className="text-base text-gray-500 dark:text-gray-400 mb-1">No results found for "{searchQuery}"</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Try searching with different keywords</p>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="text-gray-400 mb-3">
                        <Search size={48} className="mx-auto" />
                      </div>
                      <p className="text-base text-gray-500 dark:text-gray-400 mb-1">Search your leads and campaigns</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Type at least 2 characters to start searching</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Modal */}
          {showKeyboardShortcuts && (
            <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
                    <button
                      onClick={() => setShowKeyboardShortcuts(false)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { keys: ['⌘', 'K'], description: 'Open search' },
                      { keys: ['Alt', '1'], description: 'Go to Control Room' },
                      { keys: ['Alt', '2'], description: 'Go to Dashboard' },
                      { keys: ['Alt', '3'], description: 'Go to AI Strategy Hub' },
                      { keys: ['Alt', '4'], description: 'Go to Campaign Management' },
                      { keys: ['Alt', '5'], description: 'Go to Settings' },
                      { keys: ['Esc'], description: 'Close modal/dropdown' },
                    ].map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                        <div className="flex items-center space-x-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                                {key}
                              </kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="text-gray-400">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main content area */}
          <main className="flex-1 p-4 lg:p-6 bg-gray-50 dark:bg-gray-900 w-full max-w-full overflow-x-hidden transition-colors duration-300">
            {children}
          </main>
          
          {/* Enhanced ProductTour */}
          <ProductTour />
        </div>
      </div>
    </ErrorBoundary>
  );
};