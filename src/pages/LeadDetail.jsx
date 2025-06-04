import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar, 
  MessageCircle, 
  User, 
  Send,
  Bot,
  Zap,
  TrendingUp,
  AlertCircle,
  Clock,
  Eye,
  Activity,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Sparkles
} from 'lucide-react';
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
        // Fetch the lead record by ID
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();

        if (leadError) throw leadError;
        setLead(leadData);

        // Fetch all related messages
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('property_id', id)
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

  const getStatusConfig = (status) => {
    const configs = {
      'Hot Lead': { 
        color: 'bg-red-500', 
        bgColor: 'bg-red-50', 
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥'
      },
      'Engaging': { 
        color: 'bg-orange-500', 
        bgColor: 'bg-orange-50', 
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: '💬'
      },
      'Responding': { 
        color: 'bg-green-500', 
        bgColor: 'bg-green-50', 
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: '↩️'
      },
      'Cold Lead': { 
        color: 'bg-blue-500', 
        bgColor: 'bg-blue-50', 
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: '❄️'
      },
      'Unsubscribed': { 
        color: 'bg-gray-500', 
        bgColor: 'bg-gray-50', 
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        icon: '🚫'
      }
    };
    return configs[status] || configs['Cold Lead'];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      // This would integrate with your messaging API
      console.log('Sending message:', newMessage);
      // await sendMessage(id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

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
              {/* Lead Avatar */}
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
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
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
        {/* Main Conversation Area */}
        <div className="flex-1 flex flex-col bg-white">
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
                    {messages.length} message{messages.length !== 1 ? 's' : ''} • 
                    Started {formatDate(lead.created_at)}
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
                const isAI = !isInbound; // Outbound messages are from AI
                const showTimestamp = index === 0 || 
                  (new Date(msg.timestamp) - new Date(messages[index - 1].timestamp)) > 5 * 60 * 1000; // 5 minutes

                return (
                  <div key={msg.id}>
                    {showTimestamp && (
                      <div className="text-center my-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    
                    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} items-start gap-3`}>
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
                        
                        <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                          isInbound ? 'justify-start' : 'justify-end'
                        }`}>
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
            {/* AI Insights */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-900">AI Insights</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Lead Score</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {lead.ai_score || '—'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sentiment</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {lead.sentiment_trend || 'Neutral'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Engagement</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-900">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation Stats */}
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
                  <span className="text-sm text-gray-600">Response Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {messages.length > 0 ? '100%' : '0%'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Response Time</span>
                  <span className="text-sm font-semibold text-gray-900">2m</span>
                </div>
              </div>
            </div>

            {/* Lead Details */}
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