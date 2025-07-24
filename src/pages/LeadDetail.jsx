import React, { useEffect, useState, useMemo  } from 'react';
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
  Bot,
  AlertCircle,
  Eye,
  MoreHorizontal,
  Sparkles,
  Activity,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lock
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

// Reusable StatusPill component
const StatusPill = ({ type, label, tooltip }) => (
  <span 
    className={`text-xs px-2 py-1 rounded-full font-medium ${
      type === 'error' ? 'bg-red-100 text-red-600' :
      type === 'success' ? 'bg-green-100 text-green-600' :
      type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
      'bg-blue-100 text-blue-600'
    }`}
    title={tooltip}
  >
    {label}
  </span>
);

// Alert component for retry banner
const Alert = ({ variant, children }) => (
  <div className={`p-3 rounded-lg border ${
    variant === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
    variant === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
    'bg-blue-50 border-blue-200 text-blue-800'
  }`}>
    {children}
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

  const { user, hasPermission } = useAuth();
  const [twilioDevice, setTwilioDevice] = useState(null);
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [callStatus, setCallStatus] = useState('');

  // RBAC Permission Checks
  const canViewLeads = hasPermission(PERMISSIONS.VIEW_LEADS);
  const canViewMessages = hasPermission(PERMISSIONS.VIEW_ALL_MESSAGES);
  const canSendMessages = hasPermission(PERMISSIONS.TRIGGER_MANUAL_AI_REPLY);
  const canEditLeads = hasPermission(PERMISSIONS.ADD_EDIT_LEAD_MANUALLY);
  const canAddNotes = hasPermission(PERMISSIONS.ADD_MANUAL_NOTES_OR_COMMENTS);
  const canOverrideStatus = hasPermission(PERMISSIONS.OVERRIDE_LEAD_STATUS);
  const canTagAsHot = hasPermission(PERMISSIONS.TAG_LEAD_AS_HOT_ESCALATED);

  useEffect(() => {
    // Check permissions before loading data
    if (!canViewLeads) {
      setLoading(false);
      return;
    }

    const fetchLeadAndMessages = async () => {
      try {
        // First, load the basic lead data
        let leadQuery = supabase
          .from('leads')
          .select('*')
          .eq('id', id);

        // Apply tenant filtering for non-global admins
        const isGlobalAdmin = user?.role === 'global_admin' || user?.user_metadata?.role === 'global_admin';
        if (!isGlobalAdmin && user?.tenant_id) {
          leadQuery = leadQuery.eq('tenant_id', user.tenant_id);
        }

        const { data: leadData, error: leadError } = await leadQuery.single();

        if (leadError) {
          console.error('Error loading lead:', leadError);
          throw leadError;
        }
        
        // Try to fetch lead scores using LEFT JOIN to avoid CORS issues
        try {
          let scoresQuery = supabase
            .from('leads')
            .select(`
              id,
              lead_scores (
                hot_score,
                requires_immediate_attention,
                alert_priority,
                alert_triggers,
                attention_reasons,
                funnel_stage,
                stage_override_reason,
                alert_details
              )
            `)
            .eq('id', id);

          // Apply same tenant filtering
          if (!isGlobalAdmin && user?.tenant_id) {
            scoresQuery = scoresQuery.eq('tenant_id', user.tenant_id);
          }

          const { data: scoreData, error: scoreError } = await scoresQuery.single();

          if (!scoreError && scoreData?.lead_scores) {
            // Merge lead data with scores
            setLead({ ...leadData, ...scoreData.lead_scores });
          } else {
            console.log('Lead scores not available, using basic lead data');
            setLead(leadData);
          }
        } catch (scoreError) {
          console.log('Lead scores table not accessible, using basic lead data');
          setLead(leadData);
        }

        // Load messages if user has permission
        if (canViewMessages) {
          try {
            let messageQuery = supabase
              .from('messages')
              .select(`
                *,
                sentiment_score,
                sentiment_magnitude,
                openai_qualification_score,
                hesitation_score,
                urgency_score,
                weighted_score,
                response_score,
                status,
                error_code,
                retry_eligible,
                retry_count,
                original_message_id
              `)
              .eq('lead_id', id)
              .order('timestamp', { ascending: true });

            // Apply tenant filtering for messages if needed
            if (!isGlobalAdmin && user?.tenant_id) {
              messageQuery = messageQuery.eq('tenant_id', user.tenant_id);
            }

            const { data: msgData, error: msgError } = await messageQuery;

            if (msgError) {
              console.error('Error loading messages:', msgError);
              setMessages([]); // Don't fail completely, just show no messages
            } else {
              setMessages(msgData || []);
            }
          } catch (msgError) {
            console.log('Messages not accessible:', msgError);
            setMessages([]);
          }
        } else {
          setMessages([]);
        }

      } catch (err) {
        console.error('Error loading lead:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadAndMessages();
  }, [id, user, canViewLeads, canViewMessages]);

  useEffect(() => {
    // Smart refresh - only when user is actively viewing this page and has permissions
    if (!canViewLeads) return;

    const interval = setInterval(() => {
      // Only refresh if tab is visible (user isn't on another tab/app)
      if (!document.hidden) {
        console.log('🔄 Auto-refreshing conversation data...');
        
        // Re-fetch the data (same function as initial load, but without loading state)
        const refreshData = async () => {
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

            if (leadError) throw leadError;
            
            // Try to fetch lead scores
            try {
              let scoresQuery = supabase
                .from('leads')
                .select(`
                  id,
                  lead_scores (
                    hot_score,
                    requires_immediate_attention,
                    alert_priority,
                    alert_triggers,
                    attention_reasons,
                    funnel_stage,
                    stage_override_reason,
                    alert_details
                  )
                `)
                .eq('id', id);

              if (!isGlobalAdmin && user?.tenant_id) {
                scoresQuery = scoresQuery.eq('tenant_id', user.tenant_id);
              }

              const { data: scoreData, error: scoreError } = await scoresQuery.single();

              if (!scoreError && scoreData?.lead_scores) {
                setLead({ ...leadData, ...scoreData.lead_scores });
              } else {
                setLead(leadData);
              }
            } catch (scoreError) {
              setLead(leadData);
            }

            // Refresh messages if user has permission
            if (canViewMessages) {
              try {
                let messageQuery = supabase
                  .from('messages')
                  .select(`
                    *,
                    sentiment_score,
                    sentiment_magnitude,
                    openai_qualification_score,
                    hesitation_score,
                    urgency_score,
                    weighted_score,
                    response_score,
                    status,
                    error_code,
                    retry_eligible,
                    retry_count,
                    original_message_id
                  `)
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
                console.log('Messages refresh failed:', msgError);
              }
            }
            
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
  }, [id, user, canViewLeads, canViewMessages]); // Restart interval if permissions change

  // Twilio initialization with permission check
  useEffect(() => {
    const initializeTwilio = async () => {
      try {
        console.log('🔄 Initializing Twilio for user:', user?.id);
        
        // Get Twilio access token from edge function
        const { data, error } = await supabase.functions.invoke('twilio-token', {
          body: {
            user_id: user?.id || 'unknown',
            tenant_id: user?.tenant_id || 'unknown'
          }
        });

        console.log('📞 Twilio token response:', data);

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        if (data && data.success) {
          // Mock device is ready
          setTwilioDevice({ ready: true, mock: true });
          setCallStatus('Ready to call');
          console.log('✅ Mock Twilio device ready');
        } else {
          throw new Error('Invalid response from edge function');
        }
        
      } catch (err) {
        console.error('❌ Failed to initialize Twilio:', err);
        setCallStatus('Failed to initialize calling');
        setTwilioDevice(null);
      }
    };

    // Initialize when user is available
    if (user?.id) {
      initializeTwilio();
    }
  }, [user]);

  const handleCall = async (phoneNumber) => {
    if (!twilioDevice) {
      alert('Calling not available. Please refresh the page.');
      return;
    }

    try {
      console.log('📞 Initiating call to:', phoneNumber);
      setCallStatus('Opening phone dialer...');
      
      // For now, use system dialer
      window.open(`tel:${phoneNumber}`, '_self');
      
      setTimeout(() => {
        setCallStatus('Ready to call');
      }, 2000);
      
    } catch (err) {
      console.error('Call failed:', err);
      setCallStatus('Call failed: ' + err.message);
    }
  };

  // Helper function to group messages with their retries
  const groupMessagesWithRetries = (messages) => {
    const grouped = [];
    const retryMap = new Map(); // Maps original_message_id to retry messages
    
    // First, build the retry map
    messages.forEach(msg => {
      if (msg.original_message_id) {
        if (!retryMap.has(msg.original_message_id)) {
          retryMap.set(msg.original_message_id, []);
        }
        retryMap.get(msg.original_message_id).push(msg);
      }
    });
    
    // Now group messages
    messages.forEach(msg => {
      if (!msg.original_message_id) { // This is an original message
        const messageGroup = {
          original: msg,
          retries: retryMap.get(msg.id) || []
        };
        grouped.push(messageGroup);
      }
    });
    
    return grouped;
  };

  // Helper function to check if first outbound message failed
  const hasFirstMessageFailure = () => {
    const outboundMessages = messages.filter(msg => msg.direction === 'outbound');
    if (outboundMessages.length === 0) return false;
    
    // Sort by timestamp to get the first message
    const sortedOutbound = outboundMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstMessage = sortedOutbound[0];
    
    return firstMessage.status === 'failed';
  };

  // Calculate retry statistics
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
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥',
      },
      'Hot': {
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥',
      },
      'Engaged': {
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: '💬',
      },
      'Warm': {
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
        icon: '☀️',
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
      'Cold': {
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
  if (!canSendMessages) {
    alert("You don't have permission to send messages.");
    return;
  }

  if (!newMessage.trim()) return;

  // 🚫 PRIMARY GUARD RAIL: Check if AI is still managing this lead
  if (lead.ai_conversation_enabled) {
    const proceed = confirm(
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

  // Calculate AI insights and retry stats
    const aiInsights = useMemo(() => calculateAIInsights(), [messages]);
    const retryStats = useMemo(() => calculateRetryStats(), [messages]);
    const groupedMessages = useMemo(() => groupMessagesWithRetries(messages), [messages]);

  // Permission check - show access denied if user can't view leads
  if (!canViewLeads) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 mb-4">You don't have permission to view lead details.</p>
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
          <p className="text-gray-600 mb-4">The conversation you're looking for doesn't exist or you don't have access to it.</p>
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

  // Use funnel_stage if available, otherwise fall back to status
  const displayStatus = lead.funnel_stage || lead.status;
  const statusConfig = getStatusConfig(displayStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              {displayStatus}
              {lead.stage_override_reason && (
                <span className="text-xs opacity-75">
                  (auto)
                </span>
              )}
            </span>
            {lead.phone && (
              <button
                onClick={() => handleCall(lead.phone)}
                disabled={!twilioDevice || isCallInProgress}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  isCallInProgress 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } ${!twilioDevice ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Phone size={16} />
                {isCallInProgress ? 'End Call' : 'Call'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {lead.requires_immediate_attention && (
        <div className="bg-red-50 border-y border-red-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {lead.alert_priority === 'critical' ? (
                  <AlertCircle className="h-5 w-5 text-red-600 animate-pulse" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-900">
                  Immediate Attention Required - {lead.alert_priority?.toUpperCase()} Priority
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  {lead.attention_reasons?.map((reason, idx) => (
                    <span key={reason}>
                      {idx > 0 && ' • '}
                      {reason === 'agreed_to_meeting' && '✅ Lead agreed to schedule a call'}
                      {reason === 'requested_callback' && '📞 Lead requested phone contact'}
                      {reason === 'buying_signal' && '💰 Strong buying signal detected'}
                      {reason === 'timeline_urgent' && '⏰ Urgent timeline mentioned'}
                      {reason === 'high_interest_question' && '❓ Multiple questions showing high interest'}
                      {reason === 'explicit_timeline' && '📅 Specific timeline mentioned'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Triggered {lead.alert_details?.triggered_at && new Date(lead.alert_details.triggered_at).toLocaleTimeString()}
              </span>
              {canTagAsHot && (
                <button className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                  Take Action
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

          {/* First Message Failure Banner */}
          {canViewMessages && hasFirstMessageFailure() && (
            <div className="px-6 pt-4">
              <Alert variant="warning">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>⚠️ First message failed to send. SurFox automatically retried with a new message.</span>
                </div>
              </Alert>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!canViewMessages ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} className="text-red-600" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">Messages Restricted</p>
                <p className="text-gray-500 mb-6">You don't have permission to view conversation messages</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot size={24} className="text-blue-600" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">No conversation yet</p>
                <p className="text-gray-500 mb-6">This lead hasn't engaged with your AI assistant</p>
                {canSendMessages && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Send First Message
                  </button>
                )}
              </div>
            ) : (
              groupedMessages.map((messageGroup, groupIndex) => {
                const { original, retries } = messageGroup;
                const isInbound = original.direction?.toLowerCase() === 'inbound';
                const isAI = !isInbound;
                const showTimestamp =
                  groupIndex === 0 ||
                  new Date(original.timestamp) - new Date(groupedMessages[groupIndex - 1].original.timestamp) >
                    5 * 60 * 1000;

                return (
                  <div key={original.id}>
                    {showTimestamp && (
                      <div className="text-center my-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                          {formatDate(original.timestamp)}
                        </span>
                      </div>
                    )}

                    {/* Original Message */}
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
                          <p className="text-sm leading-relaxed">{original.message_body || '—'}</p>
                        </div>

                        <div
                          className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                            isInbound ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <span>{formatTime(original.timestamp)}</span>
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
                          {original.direction === 'inbound' && original.weighted_score && (
                            <>
                              <span>•</span>
                              <span className="text-xs text-gray-400">
                                Score: {original.weighted_score}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Status Pill for Outbound Messages */}
                        {original.direction === 'outbound' && (
                          <div className={`mt-2 ${isInbound ? 'text-left' : 'text-right'}`}>
                            {original.status === 'failed' && (
                              <StatusPill 
                                type="error" 
                                label="Failed" 
                                tooltip={`Error Code: ${original.error_code || 'Unknown'}`} 
                              />
                            )}
                            {original.status === 'sent' && (
                              <StatusPill type="warning" label="Sent" tooltip="Delivered to carrier" />
                            )}
                            {original.status === 'queued' && (
                              <StatusPill type="warning" label="Queued" />
                            )}
                            {original.status === 'delivered' && (
                              <StatusPill type="success" label="Delivered" tooltip="Delivered to recipient" />
                            )}
                          </div>
                        )}
                        
                        {/* Show if this message triggered an alert */}
                        {lead.alert_details?.last_message && 
                         original.message_body?.toLowerCase().includes(lead.alert_details.last_message.toLowerCase()) && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                            <AlertCircle size={12} />
                            <span>This message triggered an alert</span>
                          </div>
                        )}

                        {/* Retry Messages Section */}
                        {retries.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <button
                              onClick={() => toggleRetryExpansion(original.id)}
                              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              {expandedRetries.has(original.id) ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronRight size={14} />
                              )}
                              <span>{retries.length} retry attempt{retries.length > 1 ? 's' : ''}</span>
                              <span className="text-gray-400">
                                (Last: {formatTime(retries[retries.length - 1].timestamp)})
                              </span>
                            </button>

                            {/* Expanded Retry Messages */}
                            {expandedRetries.has(original.id) && (
                              <div className="ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
                                {retries.map((retry, retryIndex) => (
                                  <div key={retry.id} className="space-y-1">
                                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                      <p className="text-gray-900">{retry.message_body}</p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                      <div className="flex items-center gap-2">
                                        <span>Retry #{retryIndex + 1}</span>
                                        <span>•</span>
                                        <span>{formatTime(retry.timestamp)}</span>
                                      </div>
                                      
                                      <div>
                                        {retry.status === 'failed' && (
                                          <StatusPill 
                                            type="error" 
                                            label="Failed" 
                                            tooltip={`Error Code: ${retry.error_code || 'Unknown'}`} 
                                          />
                                        )}
                                        {retry.status === 'sent' && (
                                          <StatusPill type="warning" label="Sent" tooltip="Delivered to carrier" />
                                        )}
                                        {retry.status === 'queued' && (
                                          <StatusPill type="warning" label="Queued" />
                                        )}
                                        {retry.status === 'delivered' && (
                                          <StatusPill type="success" label="Delivered" tooltip="Delivered to recipient" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
          {canSendMessages && (
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
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Quick Actions for Alerts */}
            {lead.requires_immediate_attention && canTagAsHot && (
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={18} className="text-yellow-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Recommended Actions</h3>
                </div>
                
                <div className="space-y-2">
                  {lead.attention_reasons?.includes('agreed_to_meeting') && (
                    <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Call Now</span>
                      </div>
                      <span className="text-xs text-gray-500">Lead is expecting your call</span>
                    </button>
                  )}
                  
                  {lead.attention_reasons?.includes('requested_callback') && (
                    <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Schedule Call</span>
                      </div>
                      <span className="text-xs text-gray-500">Set up callback time</span>
                    </button>
                  )}
                  
                  {lead.attention_reasons?.includes('timeline_urgent') && (
                    <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">Send Proposal</span>
                      </div>
                      <span className="text-xs text-gray-500">Urgent timeline detected</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Updated AI Insights Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-900">AI Insights</h3>
                {lead.requires_immediate_attention && (
                  <span className="ml-auto">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Hot Score if available */}
                {lead.hot_score !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Hot Score</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {lead.hot_score}
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            lead.hot_score >= 80 ? 'bg-red-500' :
                            lead.hot_score >= 60 ? 'bg-orange-500' :
                            lead.hot_score >= 40 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${lead.hot_score || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

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

                {/* Show Alert Triggers if any */}
                {lead.alert_triggers && Object.entries(lead.alert_triggers).some(([_, v]) => v) && (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-700 mb-2">Active Triggers:</div>
                    <div className="space-y-1">
                      {Object.entries(lead.alert_triggers)
                        .filter(([_, triggered]) => triggered)
                        .map(([trigger, _]) => (
                          <div key={trigger} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-gray-600">
                              {trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Statistics */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Conversation Stats</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{inboundMessages.length}</div>
                  <div className="text-xs text-gray-500">Inbound</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{outboundMessages.length}</div>
                  <div className="text-xs text-gray-500">Outbound</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{retryStats.failedMessages}</div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{retryStats.retryMessages}</div>
                  <div className="text-xs text-gray-500">Retries</div>
                </div>
              </div>

              {retryStats.retryMessages > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Retry Success Rate</span>
                    <span className="font-semibold text-gray-900">{retryStats.retrySuccessRate}%</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${retryStats.retrySuccessRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Lead Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <User size={18} className="text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Lead Information</h3>
              </div>

              <div className="space-y-3">
                {lead.name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name</span>
                    <span className="text-sm font-medium text-gray-900">{lead.name}</span>
                  </div>
                )}
                
                {lead.phone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone</span>
                    <span className="text-sm font-medium text-gray-900">{lead.phone}</span>
                  </div>
                )}
                
                {lead.email && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email</span>
                    <span className="text-sm font-medium text-gray-900">{lead.email}</span>
                  </div>
                )}
                
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
            </div>

            {/* Call Status */}
            {callStatus && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone size={18} className="text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Call Status</h3>
                </div>
                <p className="text-sm text-gray-600">{callStatus}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}