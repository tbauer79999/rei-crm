import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  User,
  Send,
  Bot,
  AlertCircle,
  Eye,
  MoreHorizontal,
  Sparkles,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import supabase from '../lib/supabaseClient';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchLeadAndMessages = async () => {
      try {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();

        if (leadError) throw leadError;
        setLead(leadData);

        // Updated query to fetch messages for this specific lead
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select(`
            *,
            sentiment_score,
            sentiment_magnitude,
            openai_qualification_score,
            hesitation_score,
            urgency_score,
            weighted_score,
            response_score
          `)
          .eq('lead_id', id)
          .order('timestamp', { ascending: true });

        if (msgError) throw msgError;
        setMessages(msgData);
      } catch (err) {
        console.error('Error loading lead or messages:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadAndMessages();
  }, [id]);

useEffect(() => {
  // Smart refresh - only when user is actively viewing this page
  const interval = setInterval(() => {
    // Only refresh if tab is visible (user isn't on another tab/app)
    if (!document.hidden) {
      console.log('🔄 Auto-refreshing conversation data...');
      
      // Re-fetch the data (same function as initial load, but without loading state)
      const refreshData = async () => {
        try {
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .single();

          if (leadError) throw leadError;
          setLead(leadData);

          const { data: msgData, error: msgError } = await supabase
            .from('messages')
            .select(`
              *,
              sentiment_score,
              sentiment_magnitude,
              openai_qualification_score,
              hesitation_score,
              urgency_score,
              weighted_score,
              response_score
            `)
            .eq('lead_id', id)
            .order('timestamp', { ascending: true });

          if (msgError) throw msgError;
          setMessages(msgData);
          
          console.log('✅ Auto-refresh complete');
        } catch (err) {
          console.error('❌ Auto-refresh failed:', err.message);
        }
      };

      refreshData();
    }
  }, 30000); // 30 seconds

  // Cleanup interval when component unmounts or id changes
  return () => {
    console.log('🛑 Stopping auto-refresh');
    clearInterval(interval);
  };
}, [id]); // Restart interval if lead ID changes

  const getStatusConfig = (status) => {
    const configs = {
      'Hot Lead': {
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥',
      },
      Engaging: {
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: '💬',
      },
      Responding: {
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: '↩️',
      },
      'Cold Lead': {
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: '❄️',
      },
      Unsubscribed: {
        color: 'bg-gray-500',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        icon: '🚫',
      },
    };
    return configs[status] || configs['Cold Lead'];
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

  // Helper function to get lead score zone info
  const getScoreZone = (score) => {
    if (score >= 76) return { label: 'On Fire', color: '#ef4444', emoji: '🔥', bg: '#fef2f2' };
    if (score >= 51) return { label: 'Hot', color: '#f97316', emoji: '🌶️', bg: '#fff7ed' };
    if (score >= 26) return { label: 'Warm', color: '#eab308', emoji: '☀️', bg: '#fefce8' };
    return { label: 'Cold', color: '#3b82f6', emoji: '❄️', bg: '#eff6ff' };
  };

  // Helper function to get sentiment zone info
  const getSentimentZone = (score) => {
    if (score >= 76) return { label: 'Very Positive', color: '#10b981', emoji: '😍', bg: '#f0fdf4' };
    if (score >= 51) return { label: 'Positive', color: '#059669', emoji: '😊', bg: '#f0fdf4' };
    if (score >= 26) return { label: 'Neutral', color: '#6b7280', emoji: '😐', bg: '#f9fafb' };
    return { label: 'Negative', color: '#dc2626', emoji: '😠', bg: '#fef2f2' };
  };

  // Calculate message stats - messages are already filtered by lead_id from Supabase
  const inboundMessages = messages.filter(msg => msg.direction === 'inbound');
  const outboundMessages = messages.filter(msg => msg.direction === 'outbound');

  // Calculate AI Insights from message data
  const calculateAIInsights = () => {
    if (!messages.length) {
      return {
        leadScore: '—',
        sentiment: 'No Data',
        engagement: 'No Activity',
        engagementColor: 'bg-gray-500',
        lastActivity: '—'
      };
    }

    // 1. Lead Score - Latest weighted_score from inbound messages
    const scoredMessages = inboundMessages.filter(msg => msg.weighted_score !== null);
    const latestScore = scoredMessages.length > 0 
      ? scoredMessages[scoredMessages.length - 1].weighted_score 
      : null;

    // 2. Sentiment Analysis - Latest sentiment with trend
    const sentimentMessages = inboundMessages.filter(msg => msg.sentiment_score !== null);
    let sentimentLabel = 'Neutral';
    let sentimentTrend = '';
    
    if (sentimentMessages.length > 0) {
      const latestSentiment = sentimentMessages[sentimentMessages.length - 1].sentiment_score;
      
      // Convert to readable labels
      if (latestSentiment >= 0.5) sentimentLabel = 'Very Positive';
      else if (latestSentiment >= 0.1) sentimentLabel = 'Positive';
      else if (latestSentiment >= -0.1) sentimentLabel = 'Neutral';
      else if (latestSentiment >= -0.5) sentimentLabel = 'Negative';
      else sentimentLabel = 'Very Negative';

      // Calculate trend if we have multiple sentiment readings
      if (sentimentMessages.length >= 2) {
        const previousSentiment = sentimentMessages[sentimentMessages.length - 2].sentiment_score;
        const diff = latestSentiment - previousSentiment;
        
        if (diff > 0.1) sentimentTrend = ' ↗️';
        else if (diff < -0.1) sentimentTrend = ' ↘️';
        else sentimentTrend = ' →';
      }
    }

    // 3. Engagement Level - Based on recent activity and response patterns
    const now = new Date();
    const lastMessage = messages[messages.length - 1];
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
    } else if (hoursAgo <= 72) {
      engagementLevel = 'Low';
      engagementColor = 'bg-orange-500';
    } else {
      engagementLevel = 'Inactive';
      engagementColor = 'bg-gray-500';
    }

    // 4. Last Activity - Human readable time
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
      sentiment: sentimentLabel + sentimentTrend,
      engagement: engagementLevel,
      engagementColor: engagementColor,
      lastActivity: getTimeAgo(lastMessage.timestamp)
    };
  };

  // Updated chart data mapping with normalized scores
  const motivationChartData = inboundMessages
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((msg, i) => {
      // Convert sentiment from -1,1 to 0,100 scale
      const normalizedSentiment = msg.sentiment_score 
        ? Math.round(((msg.sentiment_score + 1) / 2) * 100) 
        : 50; // Default to neutral (50) if no sentiment
      
      return {
        name: `Msg ${i + 1}`,
        leadScore: msg.weighted_score || 0,
        sentimentScore: normalizedSentiment,
        timestamp: new Date(msg.timestamp).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        hasScore: msg.weighted_score !== null,
        rawSentiment: msg.sentiment_score || 0, // Keep original for tooltip
        hesitation: msg.hesitation_score,
        urgency: msg.urgency_score,
      };
    });

  // Enhanced tooltip with user-friendly information
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const leadZone = getScoreZone(data.leadScore);
      const sentimentZone = getSentimentZone(data.sentimentScore);
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900">{label}</span>
            <span className="text-sm text-gray-500">• {data.timestamp}</span>
          </div>
          
          {data.hasScore ? (
            <div className="space-y-2">
              {/* Lead Score */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lead Score</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg" style={{ color: leadZone.color }}>
                    {data.leadScore}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full" 
                        style={{ backgroundColor: leadZone.bg, color: leadZone.color }}>
                    {leadZone.emoji} {leadZone.label}
                  </span>
                </div>
              </div>
              
              {/* Sentiment */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sentiment</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: sentimentZone.color }}>
                    {data.sentimentScore}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full" 
                        style={{ backgroundColor: sentimentZone.bg, color: sentimentZone.color }}>
                    {sentimentZone.emoji} {sentimentZone.label}
                  </span>
                </div>
              </div>
              
              {/* Raw sentiment for reference */}
              <div className="text-xs text-gray-400 border-t pt-2 mt-2">
                Raw sentiment: {data.rawSentiment.toFixed(2)} 
                {data.hesitation && ` • Hesitation: ${data.hesitation}`}
                {data.urgency && ` • Urgency: ${data.urgency}`}
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <span className="text-sm text-gray-500">Processing...</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      console.log('Sending message:', newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Calculate AI insights
  const aiInsights = calculateAIInsights();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead not found</h2>
          <p className="text-gray-600 mb-4">The conversation you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(lead.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Conversations</span>
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {lead.name || 'Anonymous Lead'}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {lead.phone && (
                    <>
                      <Phone size={14} />
                      <span>{lead.phone}</span>
                    </>
                  )}
                  {lead.email && lead.phone && <span>•</span>}
                  {lead.email && (
                    <>
                      <Mail size={14} />
                      <span>{lead.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}
            >
              <span>{statusConfig.icon}</span>
              {lead.status}
            </span>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Phone size={16} />
                Call
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-1 flex flex-col bg-white">
          {/* Updated Chart Block */}
          <div className="px-6 mt-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Lead Scoring Trends</h3>
                <div className="text-xs text-gray-500">
                  {inboundMessages.length} messages • {inboundMessages.filter(msg => msg.weighted_score !== null).length} scored
                </div>
              </div>
              
              {motivationChartData.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={motivationChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        stroke="#64748b"
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fontSize: 12 }}
                        stroke="#64748b"
                        label={{ value: 'Score (0-100)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      
                      {/* Lead Score Line */}
                      <Line 
                        type="monotone" 
                        dataKey="leadScore" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                        name="Lead Score"
                      />
                      
                      {/* Sentiment Line */}
                      <Line 
                        type="monotone" 
                        dataKey="sentimentScore" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                        name="Sentiment"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Score Zone Legend */}
                  <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                      <span className="text-xs text-gray-600 font-medium">Lead Score</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-green-600 rounded-full bg-white" 
                           style={{ borderStyle: 'dashed' }}></div>
                      <span className="text-xs text-gray-600">Sentiment</span>
                    </div>
                    <div className="h-4 w-px bg-gray-300"></div>
                    
                    {/* Lead Score Legend */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 font-medium">Lead:</span>
                      <span className="text-red-500">🔥 Hot</span>
                      <span className="text-orange-500">🌶️ Warm</span>
                      <span className="text-yellow-500">☀️ Cool</span>
                      <span className="text-blue-500">❄️ Cold</span>
                    </div>
                    
                    <div className="h-4 w-px bg-gray-300"></div>
                    
                    {/* Sentiment Legend */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 font-medium">Sentiment:</span>
                      <span className="text-green-500">😍 V.Pos</span>
                      <span className="text-green-600">😊 Pos</span>
                      <span className="text-gray-500">😐 Neutral</span>
                      <span className="text-red-500">😠 Neg</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Activity size={20} className="text-blue-600" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">No scored messages yet</p>
                  <p className="text-gray-400 text-xs mt-1">Chart will appear once messages are analyzed</p>
                </div>
              )}
            </div>
          </div>

          {/* Conversation Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <MessageCircle size={20} className="text-blue-600" />
                </div>
                <div>
                  
                  <h2 className="text-lg font-semibold text-gray-900">AI Conversation</h2>
                  <p className="text-sm text-gray-500">
                    {messages.length} message{messages.length !== 1 ? 's' : ''} • Started{' '}
                    {formatDate(lead.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <Eye size={16} />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot size={24} className="text-blue-600" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">No conversation yet</p>
                <p className="text-gray-500 mb-6">This lead hasn't engaged with your AI assistant</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Send First Message
                </button>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isInbound = msg.direction?.toLowerCase() === 'inbound';
                const isAI = !isInbound;
                const showTimestamp =
                  index === 0 ||
                  new Date(msg.timestamp) - new Date(messages[index - 1].timestamp) >
                    5 * 60 * 1000;

                return (
                  <div key={msg.id}>
                    {showTimestamp && (
                      <div className="text-center my-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex ${isInbound ? 'justify-start' : 'justify-end'} items-start gap-3`}
                    >
                      {isInbound && (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={16} className="text-gray-600" />
                        </div>
                      )}

                      <div className={`max-w-md ${isInbound ? 'mr-12' : 'ml-12'}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl ${
                            isInbound
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.message_body || '—'}</p>
                        </div>

                        <div
                          className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                            isInbound ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <span>{formatTime(msg.timestamp)}</span>
                          {isAI && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Sparkles size={12} />
                                <span>AI</span>
                              </div>
                            </>
                          )}
                          {/* Show scoring info for inbound messages with scores */}
                          {msg.direction === 'inbound' && msg.weighted_score && (
                            <>
                              <span>•</span>
                              <span className="text-xs text-gray-400">
                                Score: {msg.weighted_score}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {!isInbound && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot size={16} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message to this lead..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <Bot size={12} className="inline mr-1" />
              Messages will be sent through your AI assistant
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Updated AI Insights Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-900">AI Insights</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Lead Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {aiInsights.leadScore}
                    </span>
                    {typeof aiInsights.leadScore === 'number' && (
                      <span className={`text-xs px-2 py-1 rounded-full ${getScoreZone(aiInsights.leadScore).bg}`} 
                            style={{ color: getScoreZone(aiInsights.leadScore).color }}>
                        {getScoreZone(aiInsights.leadScore).emoji}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sentiment</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {aiInsights.sentiment}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Engagement</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 ${aiInsights.engagementColor} rounded-full`}></div>
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
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Conversation Stats</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Messages</span>
                  <span className="text-sm font-semibold text-gray-900">{messages.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Inbound Messages</span>
                  <span className="text-sm font-semibold text-gray-900">{inboundMessages.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Outbound Messages</span>
                  <span className="text-sm font-semibold text-gray-900">{outboundMessages.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Scored Inbound</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {inboundMessages.filter(msg => msg.weighted_score !== null).length}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {inboundMessages.length > 0 ? Math.round((outboundMessages.length / inboundMessages.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <User size={18} className="text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Lead Details</h3>
              </div>

              <div className="space-y-3 text-sm">
                {lead.campaign && (
                  <div>
                    <span className="text-gray-600">Campaign:</span>
                    <div className="mt-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {lead.campaign}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-gray-600">Created:</span>
                  <p className="text-gray-900 mt-1">{formatDate(lead.created_at)}</p>
                </div>

                {lead.last_interaction && (
                  <div>
                    <span className="text-gray-600">Last Active:</span>
                    <p className="text-gray-900 mt-1">{formatDate(lead.last_interaction)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}