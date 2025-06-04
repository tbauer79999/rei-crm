import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../ui/card';
import { Zap, MessageSquareText, User, ArrowRight, X, Phone, Calendar } from 'lucide-react';
import apiClient from '../../lib/apiClient';

const AiOptimizationPanel = () => {
  const [keywords, setKeywords] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [messageMatches, setMessageMatches] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [hotLeadMetrics, setHotLeadMetrics] = useState({
    avgMessages: 0,
    avgTimeHours: 0,
    fastestMessages: 0,
    fastestTimeMinutes: 0
  });
  const [hotTriggerPhrases, setHotTriggerPhrases] = useState([]);
  const [optOutReasons, setOptOutReasons] = useState([]);
  const keywordSectionRef = useRef(null);

  useEffect(() => {
    apiClient.get('/keywords').then((res) => {
      setKeywords(res.data.keywords || []);
    });

    // Fetch hot lead metrics
    apiClient.get('/hot-summary/metrics', {
      params: { tenant_id: '46f58bba-b709-4460-8df1-ee61f0d42c57' }
    }).then((res) => {
      setHotLeadMetrics(res.data);
    }).catch(err => {
      console.error('Error fetching hot lead metrics:', err);
    });

    // Fetch hot trigger phrases
    apiClient.get('/hot-summary/trigger-phrases', {
      params: { tenant_id: '46f58bba-b709-4460-8df1-ee61f0d42c57' }
    }).then((res) => {
      setHotTriggerPhrases(res.data.phrases || []);
    }).catch(err => {
      console.error('Error fetching trigger phrases:', err);
    });

    // Fetch opt-out reasons
    apiClient.get('/hot-summary/opt-out-reasons', {
      params: { tenant_id: '46f58bba-b709-4460-8df1-ee61f0d42c57' }
    }).then((res) => {
      setOptOutReasons(res.data.reasons || []);
    }).catch(err => {
      console.error('Error fetching opt-out reasons:', err);
    });
  }, []);

  useEffect(() => {
    if (selectedKeyword) {
      apiClient
        .get(`/messages/search?keyword=${encodeURIComponent(selectedKeyword)}`)
        .then((res) => setMessageMatches(res.data.matches || []))
        .catch(() => setMessageMatches([]));
    }
  }, [selectedKeyword]);

  // Click outside to collapse keyword selection
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (keywordSectionRef.current && !keywordSectionRef.current.contains(event.target)) {
        setSelectedKeyword(null);
        setMessageMatches([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
  };

  const handleKeywordClick = (keyword) => {
    if (selectedKeyword === keyword) {
      // Clicking the same keyword again collapses it
      setSelectedKeyword(null);
      setMessageMatches([]);
    } else {
      setSelectedKeyword(keyword);
    }
  };

  return (
    <div className="space-y-6" ref={keywordSectionRef}>
      {/* Row 1: Combined Sentiment, Time to Hot, and Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-1">Sentiment Breakdown</h3>
          <p className="text-sm text-gray-500 mb-4">Percentage of all AI conversations by tone</p>
          <div className="flex justify-center items-center h-32 text-gray-400">[Pie Chart Placeholder]</div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-1">Time & Messages to Hot</h3>
          <p className="text-sm text-gray-500 mb-4">Average effort required to surface a hot lead</p>
          <ul className="text-sm space-y-2">
            <li><strong>Avg. Messages:</strong> {hotLeadMetrics.avgMessages}</li>
            <li><strong>Avg. Time:</strong> {
              hotLeadMetrics.avgTimeHours >= 24 
                ? `${Math.floor(hotLeadMetrics.avgTimeHours / 24)} days ${hotLeadMetrics.avgTimeHours % 24} hrs`
                : `${hotLeadMetrics.avgTimeHours} hrs`
            }</li>
            <li><strong>Fastest Hot Lead:</strong> {hotLeadMetrics.fastestMessages} messages, {
              hotLeadMetrics.fastestTimeMinutes >= 1440 
                ? `${Math.floor(hotLeadMetrics.fastestTimeMinutes / 1440)} days`
                : hotLeadMetrics.fastestTimeMinutes >= 60 
                  ? `${Math.floor(hotLeadMetrics.fastestTimeMinutes / 60)} hrs ${hotLeadMetrics.fastestTimeMinutes % 60} min`
                  : `${hotLeadMetrics.fastestTimeMinutes} min`
            }</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Zap className="w-4 h-4 mr-2 text-yellow-500" /> High-Intent Keywords
          </h3>
          <p className="text-sm text-gray-500 mb-3">From inbound lead messages</p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <button
                key={kw}
                onClick={() => handleKeywordClick(kw)}
                className={`px-2 py-1 rounded-full border text-sm hover:bg-blue-50 hover:text-blue-700 transition ${
                  selectedKeyword === kw ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {kw}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Enhanced Message Matches for Selected Keyword */}
      {selectedKeyword && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MessageSquareText className="w-5 h-5 mr-2 text-blue-600" />
            Messages containing: "{selectedKeyword}" 
            <span className="ml-2 text-sm text-gray-500">({messageMatches.length} found)</span>
          </h3>
          
          {messageMatches.length === 0 ? (
            <p className="text-gray-500 italic">No matches found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {messageMatches.map((match) => (
                <div 
                  key={match.id} 
                  onClick={() => handleMessageClick(match)}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      match.direction === 'inbound' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {match.direction === 'inbound' ? 'From Lead' : 'To Lead'}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {new Date(match.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                    {match.message_body}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium">Click to view conversation</span>
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Row 3: Trigger Phrases, Opt-Outs, Overrides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Hot Trigger Phrases</h3>
          <p className="text-sm text-gray-500 mb-3">Most common phrases said just before becoming a hot lead</p>
          <ul className="text-sm space-y-1">
            {hotTriggerPhrases.map((phrase, idx) => (
              <li key={idx} className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                "{phrase}"
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Opt-Out Reasons</h3>
          <p className="text-sm text-gray-500 mb-3">Top reasons leads stop engaging</p>
          <ul className="text-sm space-y-2">
            {optOutReasons.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  {item.reason}
                </span>
                <span className="text-gray-400 font-medium">{item.count}</span>
              </li>
            ))}
            {optOutReasons.length === 0 && (
              <li className="text-gray-400 italic">No opt-out data yet</li>
            )}
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Manual Overrides</h3>
          <p className="text-sm text-gray-500 mb-3">Total times a human stepped in or adjusted AI conversation</p>
          <ul className="text-sm space-y-2">
            <li><strong>Last 7 Days:</strong> 12</li>
            <li><strong>This Month:</strong> 43</li>
            <li><strong>All-Time:</strong> 184</li>
          </ul>
        </Card>
      </div>

      {/* Enhanced Modal */}
      {selectedMessage && (
        <MessageModal 
          message={selectedMessage} 
          onClose={() => setSelectedMessage(null)} 
        />
      )}
    </div>
  );
};

const MessageModal = ({ message, onClose }) => {
  const [leadDetails, setLeadDetails] = useState(null);
  const [leadMessages, setLeadMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (message?.lead_id) {
      Promise.all([
        apiClient.get(`/api/leads/${message.lead_id}`),
        apiClient.get(`/api/messages/lead/${message.lead_id}`)
      ]).then(([leadRes, messagesRes]) => {
        setLeadDetails(leadRes.data);
        setLeadMessages(messagesRes.data.messages || []);
        setLoading(false);
      }).catch(err => {
        console.error('Error fetching lead details:', err);
        setLoading(false);
      });
    }
  }, [message?.lead_id]);

  if (!message) return null;

  const getStatusBadge = (status) => {
    const styles = {
      'Hot Lead': 'bg-gradient-to-r from-red-500 to-red-600 text-white',
      'Warm Lead': 'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
      'Cold Lead': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      'Engaging': 'bg-gradient-to-r from-green-500 to-green-600 text-white',
      'Responding': 'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
      'Opted Out': 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
      'Disqualified': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageSquareText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Message Analysis</h2>
                <p className="text-blue-100 text-sm">Lead conversation details</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-5rem)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '2s'}}></div>
              </div>
              <p className="text-gray-500 font-medium">Loading conversation details...</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Enhanced Lead Information */}
              {leadDetails && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center text-gray-800">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      Lead Profile
                    </h3>
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusBadge(leadDetails.status)}`}>
                      {leadDetails.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</p>
                      <p className="text-gray-900 font-medium">
                        {leadDetails.name || `${leadDetails.first_name} ${leadDetails.last_name}`.trim() || 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</p>
                      <p className="text-gray-900 font-medium flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {leadDetails.phone || 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Since</p>
                      <p className="text-gray-900 font-medium flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(leadDetails.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Original Message */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="font-semibold flex items-center text-gray-800">
                    <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-2">
                      <MessageSquareText className="w-3 h-3 text-blue-600" />
                    </div>
                    Triggered Message
                  </h3>
                </div>
                <div className="p-6">
                  <div className={`rounded-xl p-4 ${
                    message.direction === 'inbound' 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200' 
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${
                        message.direction === 'inbound' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          message.direction === 'inbound' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                        {message.direction === 'inbound' ? 'Received from Lead' : 'Sent to Lead'}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">
                        {new Date(message.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium leading-relaxed">{message.message_body}</p>
                  </div>
                </div>
              </div>

              {/* Enhanced Conversation Thread */}
              {leadMessages.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h3 className="font-semibold flex items-center justify-between text-gray-800">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center mr-2">
                          <ArrowRight className="w-3 h-3 text-purple-600" />
                        </div>
                        Complete Conversation Thread
                      </div>
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg text-xs font-medium">
                        {leadMessages.length} messages
                      </span>
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {leadMessages.map((msg, idx) => (
                        <div 
                          key={msg.id} 
                          className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[75%] ${
                            msg.direction === 'inbound' 
                              ? 'bg-gradient-to-br from-gray-100 to-gray-200' 
                              : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                          } rounded-2xl p-4 shadow-sm ${
                            msg.id === message.id ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-medium ${
                                msg.direction === 'inbound' ? 'text-gray-600' : 'text-blue-100'
                              }`}>
                                {msg.direction === 'inbound' ? 'Lead' : 'You'}
                              </span>
                              <span className={`text-xs ${
                                msg.direction === 'inbound' ? 'text-gray-500' : 'text-blue-200'
                              }`}>
                                {new Date(msg.timestamp).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className={`leading-relaxed ${
                              msg.direction === 'inbound' ? 'text-gray-800' : 'text-white'
                            }`}>
                              {msg.message_body}
                            </p>
                            {msg.id === message.id && (
                              <div className="mt-2 flex items-center">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                                <span className="text-xs font-medium text-yellow-600">
                                  Keyword Match
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiOptimizationPanel;