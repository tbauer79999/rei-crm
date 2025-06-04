import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import EnterpriseAnalyticsIntelligence from '../components/analytics/EnterpriseAnalyticsIntelligence';
import apiClient from '../lib/apiClient';

const EnterpriseAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    globalKPIs: null,
    portfolioData: null,
    marketData: null,
    revenueData: null,
    predictiveData: null,
    industryData: null
  });

  // Test API connectivity and load initial data
  useEffect(() => {
    if (user && user.role === 'global_admin') {
      testApiConnectivity();
    }
  }, [user]);

  const testApiConnectivity = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test API connectivity with a simple endpoint
      const response = await apiClient.get('/enterprise-analytics/kpis/global', {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setApiConnected(true);
        console.log('✅ Enterprise Analytics API connected successfully');
      }

    } catch (err) {
      console.warn('⚠️ Enterprise Analytics API not available:', err.message);
      setApiConnected(false);

      if (err.response?.status === 403) {
        console.warn('Insufficient permissions for enterprise analytics API');
      } else if (err.code === 'ECONNABORTED') {
        console.warn('API request timed out');
      } else {
        console.warn('API connection failed:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!apiConnected) {
      console.log('API not connected, skipping data load');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📊 Loading enterprise analytics data...');

      const requests = [
        apiClient.get('/enterprise-analytics/kpis/global').catch(e => ({ error: e, data: null })),
        apiClient.get('/enterprise-analytics/portfolio/performance').catch(e => ({ error: e, data: null })),
        apiClient.get('/enterprise-analytics/portfolio/cohort-analysis').catch(e => ({ error: e, data: null })),
        apiClient.get('/enterprise-analytics/market/competitive-analysis').catch(e => ({ error: e, data: null })),
        apiClient.get('/enterprise-analytics/market/industry-benchmarks').catch(e => ({ error: e, data: null })),
        apiClient.get('/enterprise-analytics/revenue/arr-waterfall').catch(e => ({ error: e, data: null })),
        apiClient.get('/enterprise-analytics/revenue/metrics').catch(e => ({ error: e, data: null })),
        apiClient.get('/enterprise-analytics/predictive/churn-risk').catch(e => ({ error: e, data: null })),
        apiClient.get('/enterprise-analytics/predictive/forecasting').catch(e => ({ error: e, data: null }))
      ];

      const [
        globalKPIs,
        portfolioPerformance,
        cohortAnalysis,
        competitiveAnalysis,
        industryBenchmarks,
        arrWaterfall,
        revenueMetrics,
        churnRisk,
        forecasting
      ] = await Promise.all(requests);

      const processResponse = (response) => {
        if (response.error) {
          console.warn('API endpoint failed:', response.error.message);
          return null;
        }
        return response.data?.data || null;
      };

      const structuredData = {
        globalKPIs: processResponse(globalKPIs),
        portfolioData: {
          performance: processResponse(portfolioPerformance),
          cohortAnalysis: processResponse(cohortAnalysis)
        },
        marketData: {
          competitive: processResponse(competitiveAnalysis),
          benchmarks: processResponse(industryBenchmarks)
        },
        revenueData: {
          arrWaterfall: processResponse(arrWaterfall),
          metrics: processResponse(revenueMetrics)
        },
        predictiveData: {
          churnRisk: processResponse(churnRisk),
          forecasting: processResponse(forecasting)
        },
        industryData: processResponse(industryBenchmarks)
      };

      setAnalyticsData(structuredData);
      console.log('✅ Enterprise analytics data loaded successfully');

    } catch (err) {
      console.error('❌ Failed to load enterprise analytics:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load analytics data';
      console.warn('Using fallback data due to API error:', errorMessage);

      if (err.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Refreshing enterprise analytics...');

      try {
        await apiClient.post('/enterprise-analytics/refresh-views');
        console.log('✅ Analytics views refreshed');
      } catch (refreshErr) {
        console.warn('⚠️ Could not refresh views (may not have permission):', refreshErr.message);
      }

      await loadAnalyticsData();
      console.log('✅ Analytics data refreshed successfully');

    } catch (err) {
      console.error('❌ Failed to refresh analytics:', err);
      const errorMessage = err.response?.data?.message || 'Failed to refresh analytics data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Enterprise Analytics</h2>
          <p className="text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'global_admin') {
    return <Navigate to="/business-analytics" replace />;
  }

  if (loading && !apiConnected && Object.values(analyticsData).every(v => v === null)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting to Enterprise Analytics</h2>
          <p className="text-gray-600">Testing API connectivity and loading strategic insights...</p>
        </div>
      </div>
    );
  }

  if (error && error.includes('Authentication')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h2 className="font-bold mb-2">Authentication Error</h2>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors mr-2"
          >
            Login Again
          </button>
          <button
            onClick={() => setError(null)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            Continue with Demo Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <EnterpriseAnalyticsIntelligence 
      data={analyticsData}
      onRefreshData={handleRefreshData}
      loading={loading}
      apiConnected={apiConnected}
      onLoadData={loadAnalyticsData}
    />
  );
};

export default EnterpriseAnalytics;
