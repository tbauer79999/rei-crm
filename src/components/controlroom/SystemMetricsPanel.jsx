import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { callEdgeFunction } from '../../lib/edgeFunctionAuth';

// Edge Function URLs - Update these when you create the edge functions
const SYSTEM_METRICS_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/system-metrics';
const AUDIT_LOG_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/audit-log';

const SystemMetricsPanel = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.tenant_id) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Example: Fetch system metrics when backend is ready
      // const data = await callEdgeFunction(SYSTEM_METRICS_URL);
      // setMetrics(data);
      
      // For now, using static data
      setMetrics({
        usage: {
          messagesSent: 6200,
          messagesLimit: 10000,
          leadsProcessed: 1240,
          leadsLimit: 2000,
          storageUsedMB: 512,
          storageLimitMB: 1024
        },
        integrations: {
          crm: { status: 'connected', name: 'HubSpot' },
          messaging: { status: 'operational', name: 'Twilio' },
          calendar: { status: 'expired', name: 'Google Calendar' }
        },
        auditLog: [
          { action: '✅ User Sarah updated AI bundle', timestamp: new Date() },
          { action: '📤 Uploaded 318 leads', timestamp: new Date() },
          { action: '🛠️ Changed lead scoring threshold', timestamp: new Date() },
          { action: '🕵️‍♂️ Viewed 9 hot leads', timestamp: new Date() }
        ]
      });
      
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
      case 'operational':
        return '✅';
      case 'expired':
      case 'warning':
        return '⚠️';
      case 'error':
      case 'disconnected':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'operational':
        return 'text-green-600';
      case 'expired':
      case 'warning':
        return 'text-yellow-600';
      case 'error':
      case 'disconnected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatBytes = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb}MB`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 font-medium">Failed to load system metrics</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button 
          onClick={fetchMetrics} 
          className="mt-2 text-sm text-red-600 underline hover:text-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Usage Quotas */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Usage Quotas</div>
        <div className="text-sm text-gray-500 mb-4">Current usage against your subscription plan</div>
        <ul className="text-sm space-y-3">
          <li>
            <div className="flex justify-between items-center mb-1">
              <strong>Messages Sent:</strong>
              <span>{metrics?.usage?.messagesSent?.toLocaleString() || 0} / {metrics?.usage?.messagesLimit?.toLocaleString() || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(metrics?.usage?.messagesSent / metrics?.usage?.messagesLimit) * 100}%` }}
              />
            </div>
          </li>
          <li>
            <div className="flex justify-between items-center mb-1">
              <strong>Leads Processed:</strong>
              <span>{metrics?.usage?.leadsProcessed?.toLocaleString() || 0} / {metrics?.usage?.leadsLimit?.toLocaleString() || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(metrics?.usage?.leadsProcessed / metrics?.usage?.leadsLimit) * 100}%` }}
              />
            </div>
          </li>
          <li>
            <div className="flex justify-between items-center mb-1">
              <strong>Storage Used:</strong>
              <span>{formatBytes(metrics?.usage?.storageUsedMB || 0)} / {formatBytes(metrics?.usage?.storageLimitMB || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(metrics?.usage?.storageUsedMB / metrics?.usage?.storageLimitMB) * 100}%` }}
              />
            </div>
          </li>
        </ul>
      </div>

      {/* Card 2: API/Integration Status */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">API / Integration Status</div>
        <div className="text-sm text-gray-500 mb-4">Connectivity to external services</div>
        <ul className="text-sm space-y-2">
          {metrics?.integrations && Object.entries(metrics.integrations).map(([key, integration]) => (
            <li key={key} className="flex items-center justify-between">
              <strong className="capitalize">{integration.name || key}:</strong>
              <span className={`flex items-center ${getStatusColor(integration.status)}`}>
                <span className="mr-1">{getStatusIcon(integration.status)}</span>
                <span className="capitalize">{integration.status}</span>
              </span>
            </li>
          ))}
        </ul>
        <button className="mt-3 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
          Check All Connections
        </button>
      </div>

      {/* Card 3: Audit Log */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Audit Log</div>
        <div className="text-sm text-gray-500 mb-4">Most recent actions in the system</div>
        <ul className="text-sm space-y-2">
          {metrics?.auditLog?.slice(0, 4).map((log, idx) => (
            <li key={idx} className="text-gray-700">
              {log.action}
              <span className="text-xs text-gray-400 block">
                {new Date(log.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </li>
          ))}
        </ul>
        <button className="mt-3 text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors">
          View Full Log
        </button>
      </div>
    </div>
  );
};

export default SystemMetricsPanel;