import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../lib/permissions';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  User,
  Send,
  Play,
  Pause,
  Bot,
  AlertCircle,
  Eye,
  MoreHorizontal,
  Sparkles,
  Activity,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  AlertTriangle,
  Lock,
  BarChart3,
  Info,
  Menu,
  Clock,
  Zap,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Wifi,
  WifiOff,
  Headphones,
  Target,
  ThermometerSun,
  Timer,
  MessageSquare,
  ArrowRight,
  Flame,
  Snowflake,
  Sun,
  Users
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import supabase from '../lib/supabaseClient';

// Enhanced StatusPill component
const StatusPill = ({ type, label, tooltip, animated = false }) => (
  <span 
    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-300 ${
      type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
      type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
      type === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
      type === 'processing' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
      'bg-gray-100 text-gray-700 border border-gray-200'
    } ${animated ? 'animate-pulse' : ''}`}
    title={tooltip}
  >
    {type === 'error' && <XCircle size={12} />}
    {type === 'success' && <CheckCircle size={12} />}
    {type === 'warning' && <AlertCircle size={12} />}
    {type === 'processing' && <Timer size={12} className="animate-spin" />}
    {label}
  </span>
);

// Enhanced Alert component
const Alert = ({ variant, priority = 'medium', children, animated = false }) => (
  <div className={`p-4 rounded-xl border-l-4 shadow-sm ${
    variant === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 text-yellow-900' :
    variant === 'error' ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-400 text-red-900' :
    variant === 'success' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 text-green-900' :
    'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 text-blue-900'
  } ${animated && priority === 'critical' ? 'animate-pulse' : ''} ${
    priority === 'critical' ? 'ring-2 ring-red-200 ring-offset-2' : ''
  }`}>
    {children}
  </div>
);

// Mobile Tab Component
const MobileTab = ({ active, onClick, icon: Icon, label, badge, progress }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs font-medium transition-all duration-300 relative ${
      active 
        ? 'text-blue-600 bg-blue-50 shadow-inner' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-100 transition-transform duration-300" />
    )}
    
    <div className="relative">
      <Icon size={18} className={active ? 'animate-pulse' : ''} />
      {badge && (
        <span className={`absolute -top-1 -right-1 ${
          typeof badge === 'number' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
        } text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold`}>
          {badge}
        </span>
      )}
      {progress && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
    <span className="mt-1">{label}</span>
  </button>
);

// Collapsible Section
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false, badge, priority }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            priority === 'high' ? 'bg-red-100 text-red-600' :
            priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            <Icon size={16} />
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
          {badge && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              priority === 'high' ? 'bg-red-100 text-red-800' :
              priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <div className="transition-transform duration-300">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      } overflow-hidden`}>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Connection Status Indicator
const ConnectionStatus = ({ isOnline = true, lastSync }) => (
  <div className="flex items-center gap-2 text-xs text-gray-500">
    {isOnline ? (
      <Wifi size={12} className="text-green-500" />
    ) : (
      <WifiOff size={12} className="text-red-500 animate-pulse" />
    )}
    <span>{isOnline ? 'Online' : 'Offline'}</span>
    {lastSync && (
      <span className="hidden lg:inline">• Last sync: {lastSync}</span>
    )}
  </div>
);

// Message Status Indicators
const MessageStatusIndicator = ({ status, timestamp, isAI = false }) => (
  <div className="flex items-center gap-1 text-xs text-gray-400">
    <span>{new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
    {status === 'delivered' && <span className="text-green-500">✓✓</span>}
    {status === 'sent' && <span className="text-gray-500">✓</span>}
    {status === 'failed' && <span className="text-red-500">❌</span>}
    {status === 'queued' && <Timer size={10} className="animate-spin text-blue-500" />}
    {isAI && (
      <div className="flex items-center gap-1 ml-1">
        <Sparkles size={10} className="text-purple-500" />
        <span className="text-purple-500">AI</span>
      </div>
    )}
  </div>
);

// Lead Avatar Component
const LeadAvatar = ({ name, temperature, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl'
  };

  const tempColor = 
    temperature >= 80 ? 'from-red-500 to-red-600' :
    temperature >= 60 ? 'from-orange-500 to-orange-600' :
    temperature >= 40 ? 'from-yellow-500 to-yellow-600' :
    'from-blue-500 to-blue-600';

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br ${tempColor} rounded-full flex items-center justify-center shadow-lg relative`}>
      <span className="text-white font-bold">
        {name ? name.charAt(0).toUpperCase() : '?'}
      </span>
      {temperature && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
          {temperature >= 80 && <Flame size={10} className="text-red-500" />}
          {temperature >= 60 && temperature < 80 && <Sun size={10} className="text-orange-500" />}
          {temperature >= 40 && temperature < 60 && <Sun size={10} className="text-yellow-500" />}
          {temperature < 40 && <Snowflake size={10} className="text-blue-500" />}
        </div>
      )}
    </div>
  );
};

// Progress Ring Component
const ProgressRing = ({ progress, size = 60, strokeWidth = 6, color = '#3b82f6', label, showValue = true }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className="text-sm font-bold" style={{ color }}>
            {Math.round(progress)}
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-500">{label}</span>
        )}
      </div>
    </div>
  );
};

// Sentiment Indicator Component
const SentimentIndicator = ({ score, magnitude, trend }) => {
  const getEmoji = (score) => {
    if (score >= 0.6) return '😍';
    if (score >= 0.2) return '😊';
    if (score >= -0.2) return '😐';
    if (score >= -0.6) return '😕';
    return '😠';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0.1) return <TrendingUp size={12} className="text-green-500" />;
    if (trend < -0.1) return <TrendingDown size={12} className="text-red-500" />;
    return <Minus size={12} className="text-gray-500" />;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{getEmoji(score)}</span>
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">
            {score >= 0 ? '+' : ''}{(score * 100).toFixed(0)}%
          </span>
          {trend !== undefined && getTrendIcon(trend)}
        </div>
        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              score >= 0 ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.abs(score) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Timeline Event Marker
const TimelineMarker = ({ type, time, description, importance = 'normal' }) => (
  <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
    importance === 'high' ? 'bg-red-50 border border-red-200' :
    importance === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
    'bg-gray-50 border border-gray-200'
  }`}>
    <div className={`p-1 rounded-full ${
      type === 'call' ? 'bg-green-100 text-green-600' :
      type === 'email' ? 'bg-blue-100 text-blue-600' :
      type === 'meeting' ? 'bg-purple-100 text-purple-600' :
      'bg-gray-100 text-gray-600'
    }`}>
      {type === 'call' && <Phone size={12} />}
      {type === 'email' && <Mail size={12} />}
      {type === 'meeting' && <Users size={12} />}
      {type === 'message' && <MessageCircle size={12} />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-900 truncate">{description}</p>
      <p className="text-xs text-gray-500">{time}</p>
    </div>
    {importance === 'high' && <Star size={12} className="text-yellow-500" />}
  </div>
);

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [expandedRetries, setExpandedRetries] = useState(new Set());
  const [togglingAI, setTogglingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('conversation');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
  const [aiProcessing, setAiProcessing] = useState(false);
  const { user, hasPermission } = useAuth();
  const [twilioDevice, setTwilioDevice] = useState(null);
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [callStatus, setCallStatus] = useState('');

  // Permission checks
  const canViewLeads = hasPermission(PERMISSIONS.VIEW_LEADS);
  const canViewMessages = hasPermission(PERMISSIONS.VIEW_ALL_MESSAGES);
  const canSendMessages = hasPermission(PERMISSIONS.TRIGGER_MANUAL_AI_REPLY);
  const canTagAsHot = hasPermission(PERMISSIONS.TAG_LEAD_AS_HOT_ESCALATED);

  // AI toggle handler
  const handleToggleAI = async () => {
    if (togglingAI) return;
    
    setTogglingAI(true);
    const newStatus = !lead.ai_conversation_enabled;
    
    setLead(prev => ({ ...prev, ai_conversation_enabled: newStatus }));
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_conversation_enabled: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error toggling AI:', error);
      setLead(prev => ({ ...prev, ai_conversation_enabled: !newStatus }));
      alert('Failed to toggle AI conversation');
    } finally {
      setTogglingAI(false);
    }
  };

  // Monitor online status
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

  // Data fetching
  useEffect(() => {
    if (!canViewLeads) {
      setLoading(false);
      return;
    }

    const fetchLeadAndMessages = async () => {
      try {
        let leadQuery = supabase
          .from('leads')
          .select('*')
          .eq('id', id);

        const isGlobalAdmin = user?.role === 'global_admin' || user?.user_metadata?.role === 'global_admin';
        if (!isGlobalAdmin && user?.tenant_id) {
          leadQuery = leadQuery.eq('tenant_id', user.tenant_id);
        }

        const { data: leadData, error: leadError } = await leadQuery.single();

        if (leadError) {
          console.error('Lead query failed:', leadError);
          throw leadError;
        }
        
        setLead(leadData);

        if (canViewMessages) {
          try {
            let messageQuery = supabase
              .from('messages')
              .select('*')
              .eq('lead_id', id)
              .order('timestamp', { ascending: true });

            if (!isGlobalAdmin && user?.tenant_id) {
              messageQuery = messageQuery.eq('tenant_id', user.tenant_id);
            }

            const { data: msgData, error: msgError } = await messageQuery;

            if (!msgError) {
              setMessages(msgData || []);
            }
          } catch (msgError) {
            console.log('Messages not accessible:', msgError);
            setMessages([]);
          }
        } else {
          setMessages([]);
        }

        setLastSync(new Date().toLocaleTimeString());

      } catch (err) {
        console.error('Error loading lead:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadAndMessages();
  }, [id, user?.id, user?.tenant_id, user?.role, canViewLeads, canViewMessages]);

  // Call handler
  const handleCall = async (phoneNumber) => {
    try {
      console.log('Initiating call to:', phoneNumber);
      window.open(`tel:${phoneNumber}`, '_self');
    } catch (err) {
      console.error('Call failed:', err);
    }
  };

  // Helper functions
  const groupMessagesWithRetries = (messages) => {
    return messages.map(msg => ({
      original: msg,
      retries: []
    }));
  };

  const hasFirstMessageFailure = () => {
    const outboundMessages = messages.filter(msg => msg.direction === 'outbound');
    if (outboundMessages.length === 0) return false;
    
    const sortedOutbound = outboundMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstMessage = sortedOutbound[0];
    
    return firstMessage.status === 'failed';
  };

  const calculateRetryStats = () => {
    const failedMessages = messages.filter(msg => msg.status === 'failed').length;
    const retryMessages = messages.filter(msg => msg.original_message_id).length;
    const successfulRetries = messages.filter(msg => 
      msg.original_message_id && (msg.status === 'sent' || msg.status === 'delivered')
    ).length;
    
    const retrySuccessRate = retryMessages > 0 ? Math.round((successfulRetries / retryMessages) * 100) : 0;
    
    return {
      failedMessages,
      retryMessages,
      retrySuccessRate
    };
  };

  const toggleRetryExpansion = (messageId) => {
    const newExpanded = new Set(expandedRetries);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedRetries(newExpanded);
  };

  const getStatusConfig = (status) => {
    const configs = {
      'Hot Lead': {
        bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥',
        temp: 90
      },
      'Hot': {
        bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥',
        temp: 85
      },
      'Engaged': {
        bgColor: 'bg-gradient-to-r from-orange-50 to-yellow-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: '💬',
        temp: 70
      },
      'Cold': {
        bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: '❄️',
        temp: 25
      }
    };
    return configs[status] || configs['Cold'];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreZone = (score) => {
    if (score >= 76) return { label: 'On Fire', color: '#ef4444', emoji: '🔥' };
    if (score >= 51) return { label: 'Hot', color: '#f97316', emoji: '🌶️' };
    if (score >= 26) return { label: 'Warm', color: '#eab308', emoji: '☀️' };
    return { label: 'Cold', color: '#3b82f6', emoji: '❄️' };
  };

  // Enhanced message calculations
  const messageItems = messages.filter(item => item.type === 'message' || !item.type);
  const inboundMessages = messageItems.filter(msg => msg.direction === 'inbound');
  const outboundMessages = messageItems.filter(msg => msg.direction === 'outbound');

  // AI insights calculation
  const calculateAIInsights = () => {
    if (!messageItems.length) {
      return {
        leadScore: '—',
        sentiment: 'No Data',
        engagement: 'No Activity',
        engagementColor: 'bg-gray-500',
        lastActivity: '—',
        responseTime: '—',
        conversationHealth: 0
      };
    }

    const scoredMessages = inboundMessages.filter(msg => msg.weighted_score !== null);
    const latestScore = scoredMessages.length > 0 
      ? scoredMessages[scoredMessages.length - 1].weighted_score 
      : null;

    const now = new Date();
    const lastMessage = messageItems[messageItems.length - 1];
    const lastMessageTime = new Date(lastMessage.timestamp);
    const hoursAgo = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
    
    let engagementLevel = 'Inactive';
    let engagementColor = 'bg-gray-500';
    
    if (hoursAgo <= 1) {
      engagementLevel = 'Very Active';
      engagementColor = 'bg-green-500';
    } else if (hoursAgo <= 6) {
      engagementLevel = 'Active';
      engagementColor = 'bg-green-500';
    } else if (hoursAgo <= 24) {
      engagementLevel = 'Moderate';
      engagementColor = 'bg-yellow-500';
    }

    const getTimeAgo = (timestamp) => {
      const now = new Date();
      const past = new Date(timestamp);
      const diffMs = now.getTime() - past.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return past.toLocaleDateString();
    };

    return {
      leadScore: latestScore || '—',
      sentiment: 'Neutral',
      engagement: engagementLevel,
      engagementColor: engagementColor,
      lastActivity: getTimeAgo(lastMessage.timestamp),
      responseTime: '—',
      conversationHealth: 75
    };
  };

  // Chart data
  const motivationChartData = inboundMessages
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((msg, i) => ({
      name: `Msg ${i + 1}`,
      leadScore: msg.weighted_score || 0,
      sentimentScore: 50,
      timestamp: new Date(msg.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      }),
      hasScore: msg.weighted_score !== null
    }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-semibold text-gray-900">{label}</span>
            <span className="text-sm text-gray-500">• {data.timestamp}</span>
          </div>
          
          {data.hasScore ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lead Score</span>
                <span className="text-sm font-bold text-blue-600">{data.leadScore}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Timer size={20} className="animate-spin text-blue-500 mx-auto mb-2" />
              <span className="text-sm text-gray-500">Processing...</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Message sending
  const handleSendMessage = async () => {
  if (!canSendMessages) {
    alert("You don't have permission to send messages.");
    return;
  }

  if (!newMessage.trim()) return;

  // 🚫 PRIMARY GUARD RAIL: Check if AI is still managing this lead
  if (lead.ai_conversation_enabled) {
    const proceed = window.confirm(
      "This lead is currently being managed by AI. Sending a manual message will take over the conversation. " +
      "Continue?"
    );
    if (!proceed) return;
  }

  // 🚫 BASIC SAFETY: Don't message unsubscribed leads
  if (lead.status === 'Unsubscribed' || lead.status === 'Do Not Contact') {
    alert("Cannot send messages to unsubscribed leads.");
    return;
  }

  setSendingMessage(true);
  try {
    console.log('Sending manual message:', newMessage);
    
    // Get the lead's campaign to find the correct phone number
    const { data: campaignData, error: campaignError } = await supabase
      .from("campaigns")
      .select(`
        phone_number_id,
        phone_numbers (
          phone_number,
          twilio_sid
        )
      `)
      .eq("id", lead.campaign_id)
      .eq("tenant_id", user.tenant_id)
      .single();

    if (campaignError || !campaignData?.phone_numbers) {
      throw new Error('Campaign phone number not found');
    }

    const phoneNumber = campaignData.phone_numbers;

    // Insert the message into the database first
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        direction: 'outbound',
        message_body: newMessage.trim(),
        timestamp: new Date().toISOString(),
        phone: lead.phone,
        tenant_id: user.tenant_id,
        lead_id: lead.id,
        sender: 'Manual', // Mark as manual send
        channel: 'sms',
        message_id: `manual-${Date.now()}`,
        status: 'queued'
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error('Failed to save message: ' + insertError.message);
    }

    // Send via Twilio using your edge function
    const { data: twilioResult, error: twilioError } = await supabase.functions.invoke('send-manual-sms', {
      body: {
        to: lead.phone,
        from: phoneNumber.phone_number,
        body: newMessage.trim(),
        message_id: insertedMessage.id,
        tenant_id: user.tenant_id
      }
    });

    if (twilioError) {
      throw new Error('Failed to send SMS: ' + twilioError.message);
    }

    if (twilioResult.success) {
      console.log('✅ Manual message sent successfully');
      
      // Update the message with Twilio SID
      await supabase
        .from('messages')
        .update({ 
          message_id: twilioResult.twilio_sid,
          status: 'sent'
        })
        .eq('id', insertedMessage.id);

      // 🆕 KEY: Disable AI conversation since human took over
      if (lead.ai_conversation_enabled) {
        await supabase
          .from('leads')
          .update({ 
            ai_conversation_enabled: false,
            last_manual_contact: new Date().toISOString()
          })
          .eq('id', lead.id);
        
        console.log('✅ AI conversation disabled - human took over');
        
        // Update local state so UI reflects the change
        setLead(prev => ({ 
          ...prev, 
          ai_conversation_enabled: false,
          last_manual_contact: new Date().toISOString()
        }));
      }

      // Clear the input
      setNewMessage('');
      
    } else {
      throw new Error(twilioResult.error || 'Failed to send message');
    }

  } catch (error) {
    console.error('Error sending manual message:', error);
    alert('Failed to send message: ' + error.message);
  } finally {
    setSendingMessage(false);
  }
};

  // Calculate insights and stats
  const aiInsights = useMemo(() => calculateAIInsights(), [messageItems]);
  const retryStats = useMemo(() => calculateRetryStats(), [messages]);
  const groupedMessages = useMemo(() => {
    return groupMessagesWithRetries(messageItems).map(group => ({
      type: 'message_group',
      data: group
    }));
  }, [messages]);

  // Permission check
  if (!canViewLeads) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Access Restricted</h3>
          <p className="text-gray-600 mb-6">You don't have permission to view lead details.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Lead not found</h2>
          <p className="text-gray-600 mb-6">The conversation you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const displayStatus = lead.funnel_stage || lead.status;
  const statusConfig = getStatusConfig(displayStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Desktop Header */}
      <div className="hidden lg:block bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-all duration-300 group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="font-semibold">Conversations</span>
              </button>
              <div className="w-px h-8 bg-gray-300"></div>
              
              <div className="flex items-center gap-4">
                <LeadAvatar 
                  name={lead.name} 
                  temperature={statusConfig.temp}
                  size="lg"
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {lead.name || 'Anonymous Lead'}
                    </h1>
                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 shadow-sm ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}
                      >
                        <span className="text-lg">{statusConfig.icon}</span>
                        {displayStatus}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && lead.phone && <span>•</span>}
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} />
                        <span>{lead.email}</span>
                      </div>
                    )}
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Last activity: {aiInsights.lastActivity}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ConnectionStatus isOnline={isOnline} lastSync={lastSync} />
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleAI}
                  disabled={togglingAI}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg
                    ${lead.ai_conversation_enabled 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                    }
                    ${togglingAI ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
                  `}
                >
                  {togglingAI ? (
                    <Timer size={18} className="animate-spin" />
                  ) : (
                    lead.ai_conversation_enabled ? <Pause size={18} /> : <Play size={18} />
                  )}
                  <span>{lead.ai_conversation_enabled ? 'Disable AI' : 'Enable AI'}</span>
                </button>
                
                {lead.phone && (
                  <button
                    onClick={() => handleCall(lead.phone)}
                    className="flex items-center gap-3 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-300 shadow-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-xl"
                  >
                    <Phone size={18} />
                    <span>Call Lead</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <LeadAvatar 
                    name={lead.name} 
                    temperature={statusConfig.temp}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-bold text-gray-900 truncate">
                      {lead.name || 'Anonymous Lead'}
                    </h1>
                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}
                      >
                        <span>{statusConfig.icon}</span>
                        {displayStatus}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
              {lead.phone && (
                <button
                  onClick={() => handleCall(lead.phone)}
                  className="p-3 text-green-600 hover:bg-green-50 rounded-xl transition-all duration-300"
                >
                  <Phone size={18} />
                </button>
              )}
              
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-300"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-40">
              <div className="p-4 space-y-4">
                <button
                  onClick={handleToggleAI}
                  disabled={togglingAI}
                  className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    lead.ai_conversation_enabled 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  }`}
                >
                  {togglingAI ? (
                    <Timer size={16} className="animate-spin" />
                  ) : (
                    lead.ai_conversation_enabled ? <Pause size={16} /> : <Play size={16} />
                  )}
                  <span>{lead.ai_conversation_enabled ? 'Disable AI' : 'Enable AI'}</span>
                </button>
                
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>{aiInsights.lastActivity}</span>
                  </div>
                  <ConnectionStatus isOnline={isOnline} lastSync={lastSync} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-20 z-40">
        <div className="flex">
          <MobileTab
            active={activeTab === 'conversation'}
            onClick={() => setActiveTab('conversation')}
            icon={MessageCircle}
            label="Chat"
            badge={messageItems.length > 0 ? messageItems.length : null}
          />
          <MobileTab
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            icon={BarChart3}
            label="Analytics"
          />
          <MobileTab
            active={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            icon={Info}
            label="Details"
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-[calc(100vh-120px)]">
        <div className="flex-1 flex flex-col bg-white shadow-lg">
          {/* Chart Section */}
          <div className="p-8 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <BarChart3 size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Lead Scoring Trends</h3>
                    <p className="text-sm text-gray-500">
                      {inboundMessages.length} messages
                    </p>
                  </div>
                </div>
              </div>
              
              {motivationChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={motivationChartData}>
                      <defs>
                        <linearGradient id="leadScoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        stroke="#64748b"
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        stroke="#64748b"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      
                      <Area
                        type="monotone"
                        dataKey="leadScore"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fill="url(#leadScoreGradient)"
                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity size={32} className="text-blue-600" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium mb-2">No scored messages yet</p>
                  <p className="text-gray-400 text-sm">Chart will appear once messages are analyzed by AI</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gradient-to-b from-white to-gray-50">
            {!canViewMessages ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock size={32} className="text-red-600" />
                </div>
                <p className="text-xl font-semibold text-gray-900 mb-3">Messages Restricted</p>
                <p className="text-gray-500 mb-6">You don't have permission to view conversation messages</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bot size={32} className="text-blue-600" />
                </div>
                <p className="text-xl font-semibold text-gray-900 mb-3">No conversation yet</p>
                <p className="text-gray-500 mb-6">This lead hasn't engaged with your AI assistant</p>
                {canSendMessages && (
                  <button 
                    onClick={() => document.getElementById('message-input')?.focus()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg"
                  >
                    Send First Message
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {groupedMessages.map((timelineItem, itemIndex) => {
                  const messageGroup = timelineItem.data;
                  const { original } = messageGroup;
                  const isInbound = original.direction?.toLowerCase() === 'inbound';
                  const isAI = !isInbound && original.sender !== 'Manual';

                  return (
                    <div key={original.id}>
                      <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} items-start gap-4`}>
                        {isInbound && (
                          <div className="flex-shrink-0">
                            <LeadAvatar 
                              name={lead.name} 
                              temperature={statusConfig.temp}
                              size="sm"
                            />
                          </div>
                        )}

                        <div className={`max-w-2xl ${isInbound ? 'mr-16' : 'ml-16'}`}>
                          <div className="relative">
                            <div
                              className={`px-6 py-4 rounded-2xl shadow-lg border ${
                                isInbound
                                  ? 'bg-white border-gray-200 text-gray-900'
                                  : isAI 
                                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white border-blue-500'
                                    : 'bg-gradient-to-br from-green-600 to-emerald-600 text-white border-green-500'
                              }`}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {original.message_body || '—'}
                              </p>
                            </div>
                            
                            <div className={`flex items-center gap-3 mt-2 text-xs ${
                              isInbound ? 'justify-start' : 'justify-end'
                            }`}>
                              <MessageStatusIndicator 
                                status={original.status}
                                timestamp={original.timestamp}
                                isAI={isAI}
                              />
                            </div>
                          </div>
                        </div>

                        {!isInbound && (
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                              isAI 
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                                : 'bg-gradient-to-br from-green-500 to-emerald-600'
                            }`}>
                              {isAI ? (
                                <Bot size={20} className="text-white" />
                              ) : (
                                <User size={20} className="text-white" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message Input */}
          {canSendMessages && (
            <div className="p-8 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    id="message-input"
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Send a message to this lead..."
                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 shadow-lg transition-all duration-300"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={sendingMessage}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                >
                  {sendingMessage ? (
                    <Timer size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                  <span>{sendingMessage ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar */}
        <div className="w-96 bg-gradient-to-b from-white to-gray-50 border-l border-gray-200 overflow-y-auto shadow-xl">
          <div className="p-8 space-y-8">
            {/* AI Insights Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-lg">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">AI Insights</h3>
                  <p className="text-sm text-gray-500">Real-time conversation analysis</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <ProgressRing 
                      progress={aiInsights.conversationHealth} 
                      size={80} 
                      strokeWidth={6}
                      color={aiInsights.conversationHealth > 70 ? '#10b981' : aiInsights.conversationHealth > 40 ? '#f59e0b' : '#ef4444'}
                      label="Health"
                    />
                  </div>
                  <h4 className="text-sm font-medium text-gray-600">Conversation Health</h4>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Lead Score</span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">
                      {aiInsights.leadScore}
                    </span>
                    {typeof aiInsights.leadScore === 'number' && (
                      <span className="text-lg">{getScoreZone(aiInsights.leadScore).emoji}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Engagement</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${aiInsights.engagementColor} rounded-full animate-pulse`}></div>
                    <span className="text-sm font-bold text-gray-900">{aiInsights.engagement}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Last Activity</span>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-900">
                      {aiInsights.lastActivity}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Information */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl shadow-lg">
                  <User size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Lead Information</h3>
                  <p className="text-sm text-gray-500">Contact details & history</p>
                </div>
              </div>

              <div className="space-y-4">
                {lead.name && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Name</span>
                    <span className="text-sm font-bold text-gray-900">{lead.name}</span>
                  </div>
                )}
                
                {lead.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Phone</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{lead.phone}</span>
                      <button 
                        onClick={() => handleCall(lead.phone)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Phone size={14} />
                      </button>
                    </div>
                  </div>
                )}
                
                {lead.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Email</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{lead.email}</span>
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Mail size={14} />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Status</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${statusConfig.textColor}`}>
                      {statusConfig.icon} {displayStatus}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Created</span>
                  <span className="text-sm font-bold text-gray-900">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden flex-1 overflow-hidden">
        {activeTab === 'conversation' && (
          <div className="h-[calc(100vh-200px)] flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
              {!canViewMessages ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock size={24} className="text-red-600" />
                  </div>
                  <p className="text-gray-600">Messages restricted</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot size={24} className="text-blue-600" />
                  </div>
                  <p className="text-gray-600 mb-4">No conversation yet</p>
                  {canSendMessages && (
                    <button 
                      onClick={() => document.getElementById('mobile-message-input')?.focus()}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium shadow-lg"
                    >
                      Send First Message
                    </button>
                  )}
                </div>
              ) : (
                groupedMessages.map((timelineItem, itemIndex) => {
                  const messageGroup = timelineItem.data;
                  const { original } = messageGroup;
                  const isInbound = original.direction?.toLowerCase() === 'inbound';
                  const isAI = !isInbound && original.sender !== 'Manual';

                  return (
                    <div key={original.id}>
                      <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} items-start gap-2`}>
                        {isInbound && (
                          <div className="flex-shrink-0 mt-1">
                            <LeadAvatar 
                              name={lead.name} 
                              temperature={statusConfig.temp}
                              size="sm"
                            />
                          </div>
                        )}

                        <div className={`max-w-[85%] ${isInbound ? '' : 'ml-8'}`}>
                          <div className="relative">
                            <div
                              className={`px-4 py-3 rounded-2xl shadow-lg ${
                                isInbound
                                  ? 'bg-white border border-gray-200 text-gray-900'
                                  : isAI
                                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                                    : 'bg-gradient-to-br from-green-600 to-emerald-600 text-white'
                              }`}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{original.message_body || '—'}</p>
                            </div>
                          </div>

                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                            isInbound ? 'justify-start' : 'justify-end'
                          }`}>
                            <MessageStatusIndicator 
                              status={original.status}
                              timestamp={original.timestamp}
                              isAI={isAI}
                            />
                            {original.direction === 'inbound' && original.weighted_score && (
                              <>
                                <span>•</span>
                                <span className="text-xs text-gray-400">
                                  Score: {original.weighted_score}
                                </span>
                              </>
                            )}
                          </div>

                          {original.direction === 'outbound' && (
                            <div className={`mt-1 ${isInbound ? 'text-left' : 'text-right'}`}>
                              {original.status === 'failed' && <StatusPill type="error" label="Failed" />}
                              {original.status === 'sent' && <StatusPill type="warning" label="Sent" />}
                              {original.status === 'queued' && <StatusPill type="processing" label="Queued" animated={true} />}
                              {original.status === 'delivered' && <StatusPill type="success" label="Delivered" />}
                            </div>
                          )}
                        </div>

                        {!isInbound && (
                          <div className="flex-shrink-0 mt-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                              isAI 
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                                : 'bg-gradient-to-br from-green-500 to-emerald-600'
                            }`}>
                              {isAI ? (
                                <Bot size={16} className="text-white" />
                              ) : (
                                <User size={16} className="text-white" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {canSendMessages && (
              <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-2xl">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      id="mobile-message-input"
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Send a message..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-300"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={sendingMessage}
                    />
                    {aiProcessing && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                  >
                    {sendingMessage ? (
                      <Timer size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
                {lead.ai_conversation_enabled && (
                  <p className="text-xs text-orange-600 mt-2 text-center font-medium">
                    Sending will disable AI mode
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-4 space-y-4 pb-20 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Lead Trends</h3>
                <div className="text-xs text-gray-500">
                  {inboundMessages.length} messages
                </div>
              </div>
              
              {motivationChartData.length > 0 ? (
                <div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={motivationChartData}>
                        <defs>
                          <linearGradient id="mobileLeadGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }}
                          stroke="#64748b"
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tick={{ fontSize: 10 }}
                          stroke="#64748b"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        <Area
                          type="monotone"
                          dataKey="leadScore"
                          stroke="#6366f1"
                          strokeWidth={2}
                          fill="url(#mobileLeadGradient)"
                          dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                      <span className="text-gray-600">Lead Score</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Activity size={20} className="text-blue-600" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">No scored messages yet</p>
                  <p className="text-gray-400 text-xs mt-1">Chart will appear once analyzed</p>
                </div>
              )}
            </div>

            <CollapsibleSection title="AI Insights" icon={Sparkles} defaultOpen={true}>
              <div className="space-y-4">
                <div className="text-center">
                  <ProgressRing 
                    progress={aiInsights.conversationHealth} 
                    size={60} 
                    strokeWidth={4}
                    color={aiInsights.conversationHealth > 70 ? '#10b981' : aiInsights.conversationHealth > 40 ? '#f59e0b' : '#ef4444'}
                    label="Health"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Lead Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {aiInsights.leadScore}
                    </span>
                    {typeof aiInsights.leadScore === 'number' && (
                      <span className="text-xs">{getScoreZone(aiInsights.leadScore).emoji}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Engagement</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 ${aiInsights.engagementColor} rounded-full animate-pulse`}></div>
                    <span className="text-sm font-semibold text-gray-900">{aiInsights.engagement}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Activity</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {aiInsights.lastActivity}
                  </span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Conversation Stats" icon={Activity}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{inboundMessages.length}</div>
                  <div className="text-xs text-gray-500">Inbound</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{outboundMessages.length}</div>
                  <div className="text-xs text-gray-500">Outbound</div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="p-4 space-y-4 pb-20 max-h-[calc(100vh-200px)] overflow-y-auto">
            <CollapsibleSection title="Contact Information" icon={User} defaultOpen={true}>
              <div className="space-y-3">
                {lead.name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name</span>
                    <span className="text-sm font-medium text-gray-900">{lead.name}</span>
                  </div>
                )}
                
                {lead.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Phone</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{lead.phone}</span>
                      <button 
                        onClick={() => handleCall(lead.phone)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        <Phone size={14} />
                      </button>
                    </div>
                  </div>
                )}
                
                {lead.email && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email</span>
                    <span className="text-sm font-medium text-gray-900 truncate ml-2">{lead.email}</span>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Lead Status" icon={Activity}>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`text-sm font-medium ${statusConfig.textColor}`}>
                    {statusConfig.icon} {displayStatus}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {lead.last_message_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Message</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(lead.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="AI Management" icon={Bot}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">AI Conversation</span>
                  <span className={`text-sm font-medium ${
                    lead.ai_conversation_enabled ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {lead.ai_conversation_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <button
                  onClick={handleToggleAI}
                  disabled={togglingAI}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    lead.ai_conversation_enabled 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } ${togglingAI ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {togglingAI ? (
                    <div className="flex items-center justify-center gap-2">
                      <Timer size={16} className="animate-spin" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      {lead.ai_conversation_enabled ? <Pause size={16} /> : <Play size={16} />}
                      <span>{lead.ai_conversation_enabled ? 'Disable AI' : 'Enable AI'}</span>
                    </div>
                  )}
                </button>
                
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot size={12} />
                    <span className="font-medium">AI Status Info</span>
                  </div>
                  {lead.ai_conversation_enabled ? (
                    <p>AI is actively managing this conversation and will respond to new messages automatically.</p>
                  ) : (
                    <p>AI conversation is disabled. You'll need to respond to messages manually or re-enable AI.</p>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {lead.campaign_id && (
              <CollapsibleSection title="Campaign Details" icon={Activity}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Campaign ID</span>
                    <span className="text-sm font-medium text-gray-900">{lead.campaign_id}</span>
                  </div>
                  
                  {lead.source && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Source</span>
                      <span className="text-sm font-medium text-gray-900">{lead.source}</span>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection title="Technical Details" icon={Info}>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Lead ID</span>
                  <span className="font-mono text-gray-900">{lead.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages Count</span>
                  <span className="text-gray-900">{messages.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-gray-900">
                    {new Date(lead.updated_at || lead.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>
    </div>
  );
}