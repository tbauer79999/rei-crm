import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EnterpriseAnalyticsIntelligence from '../components/analytics/EnterpriseAnalyticsIntelligence';

const EnterpriseAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    globalKPIs: null,
    portfolioData: null,
    marketData: null,
    revenueData: null,
    predictiveData: null,
    industryData: null
  });

  // Load all enterprise analytics data
  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all enterprise analytics data in parallel
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
        ] = await Promise.all([
          axios.get('/api/enterprise-analytics/kpis/global'),
          axios.get('/api/enterprise-analytics/portfolio/performance'),
          axios.get('/api/enterprise-analytics/portfolio/cohort-analysis'),
          axios.get('/api/enterprise-analytics/market/competitive-analysis'),
          axios.get('/api/enterprise-analytics/market/industry-benchmarks'),
          axios.get('/api/enterprise-analytics/revenue/arr-waterfall'),
          axios.get('/api/enterprise-analytics/revenue/metrics'),
          axios.get('/api/enterprise-analytics/predictive/churn-risk'),
          axios.get('/api/enterprise-analytics/predictive/forecasting')
        ]);

        // Structure the data for the component
        setAnalyticsData({
          globalKPIs: globalKPIs.data.data,
          portfolioData: {
            performance: portfolioPerformance.data.data,
            cohortAnalysis: cohortAnalysis.data.data
          },
          marketData: {
            competitive: competitiveAnalysis.data.data,
            benchmarks: industryBenchmarks.data.data
          },
          revenueData: {
            arrWaterfall: arrWaterfall.data.data,
            metrics: revenueMetrics.data.data
          },
          predictiveData: {
            churnRisk: churnRisk.data.data,
            forecasting: forecasting.data.data
          },
          industryData: industryBenchmarks.data.data
        });

      } catch (err) {
        console.error('Failed to load enterprise analytics:', err);
        setError(err.response?.data?.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, []);

  // Refresh analytics data
  const handleRefreshData = async () => {
    try {
      setLoading(true);
      
      // First refresh the materialized views
      await axios.post('/api/enterprise-analytics/refresh-views');
      
      // Then reload the data
      window.location.reload();
      
    } catch (err) {
      console.error('Failed to refresh analytics:', err);
      setError('Failed to refresh analytics data');
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Enterprise Analytics</h2>
          <p className="text-gray-600">Processing strategic insights and market intelligence...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h2 className="font-bold mb-2">Error Loading Analytics</h2>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render the enterprise analytics component with data
  return (
    <EnterpriseAnalyticsIntelligence 
      data={analyticsData}
      onRefreshData={handleRefreshData}
      loading={loading}
    />
  );
};

export default EnterpriseAnalytics;