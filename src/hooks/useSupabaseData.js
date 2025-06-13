// src/hooks/useAnalytics.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../lib/analyticsDataService';

export const useAnalytics = (initialDateRange = 30) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState(initialDateRange);
  
  const [data, setData] = useState({
    campaigns: [],
    performanceMetrics: {},
    campaignPerformance: [],
    aiInsights: { topPerformingPersonas: [], followupTiming: [], confidenceData: [] },
    leadSourceROI: [],
    historicalTrends: [],
    salesRepPerformance: []
  });

  // Initialize analytics service when user changes
  useEffect(() => {
    if (user) {
      analyticsService.initialize(user);
    }
  }, [user]);

  // Load all analytics data
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      
      // Set date range on service
      analyticsService.setDateRange(dateRange);
      
      // Load all data in parallel
      const [
        campaigns,
        performanceMetrics,
        campaignPerformance,
        aiInsights,
        leadSourceROI,
        historicalTrends,
        salesRepPerformance
      ] = await Promise.all([
        analyticsService.getCampaignOverview(),
        analyticsService.getPerformanceMetrics(),
        analyticsService.getCampaignPerformanceData(),
        analyticsService.getAIPerformanceInsights(),
        analyticsService.getLeadSourceROI(),
        analyticsService.getHistoricalTrends(),
        analyticsService.getSalesRepPerformance()
      ]);

      setData({
        campaigns: campaigns || [],
        performanceMetrics: performanceMetrics || {},
        campaignPerformance: campaignPerformance || [],
        aiInsights: aiInsights || { topPerformingPersonas: [], followupTiming: [], confidenceData: [] },
        leadSourceROI: leadSourceROI || [],
        historicalTrends: historicalTrends || [],
        salesRepPerformance: salesRepPerformance || []
      });

    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  // Load data when user or dateRange changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update date range
  const updateDateRange = useCallback((newDateRange) => {
    setDateRange(newDateRange);
  }, []);

  // Refresh data manually
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    dateRange,
    updateDateRange,
    refresh
  };
};