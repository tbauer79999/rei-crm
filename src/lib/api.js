import supabase from './supabaseClient';

// Helper function to invoke Edge Functions with proper auth
const invokeEdgeFunction = async (functionName, options = {}) => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      console.error('❌ No valid session found, attempting refresh...');
      
      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession?.access_token) {
        console.error('❌ Unable to obtain access token for edge function');
        throw new Error('No valid session or access token');
      }

      console.log('🔄 Session refreshed for Edge Function call');
    }

    console.log(`🔗 Edge Function Request: ${functionName}`);

    // IMPORTANT: Don't pass Authorization header manually with supabase.functions.invoke
    // The client already handles auth internally
    const { data, error } = await supabase.functions.invoke(functionName, {
      method: options.method || 'GET',
      body: options.body || undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (error) {
      console.error(`❌ Edge Function Error: ${functionName}`, error);
      throw error;
    }

    console.log(`✅ Edge Function Success: ${functionName}`, data);
    return data;
  } catch (error) {
    console.error(`❌ Failed to invoke ${functionName}:`, error);
    throw error;
  }
};

// ============= OVERVIEW & HEALTH =============
export async function fetchHealth() {
  return await invokeEdgeFunction('overview-analytics');
}

export async function fetchOverview() {
  return await invokeEdgeFunction('overview-analytics');
}

export async function fetchOverviewMetrics() {
  return await invokeEdgeFunction('overview-analytics');
}

export async function fetchOverviewTrendAndCost() {
  return await invokeEdgeFunction('overview-analytics', {
    body: { path: '/analytics-trend-cost' }
  });
}

// ============= HOT LEADS & HANDOFF =============
export async function fetchHotSummary() {
  return await invokeEdgeFunction('HotLeadHandoffPanel');
}

export async function fetchHotLeads() {
  return await invokeEdgeFunction('get-hot-leads');
}

// ============= LEAD JOURNEY & FUNNEL =============
export async function fetchFunnel() {
  return await invokeEdgeFunction('LeadJourneyFunnel');
}

export async function fetchLeadJourneyFunnel() {
  return await invokeEdgeFunction('LeadJourneyFunnel');
}

export async function fetchFunnelHealth() {
  return await invokeEdgeFunction('LeadJourneyFunnel');
}

// ============= AI OPTIMIZATION =============
export async function fetchAiOptimizationPanel() {
  return await invokeEdgeFunction('AiOptimizationPanel');
}

export async function fetchKeywords() {
  return await invokeEdgeFunction('AiOptimizationPanel');
}

export async function fetchAIEfficiency() {
  return await invokeEdgeFunction('ai-efficiency-card');
}

export async function fetchAIvsHumanSplit() {
  return await invokeEdgeFunction('ai-efficiency-card');
}

// ============= LEAD METRICS =============
export async function fetchProperties() {
  return await invokeEdgeFunction('get-lead-analytics');
}

export async function fetchLeadTrends() {
  return await invokeEdgeFunction('overview-analytics');
}

export async function fetchLeadConversionSpeed() {
  return await invokeEdgeFunction('get-lead-analytics');
}

// ============= PERFORMANCE METRICS =============
export async function fetchResponseTimeMetrics() {
  return await invokeEdgeFunction('response-time');
}

export async function fetchMessageQualityMetrics() {
  return await invokeEdgeFunction('message-quality');
}

export async function fetchWeeklyMomentumMetrics() {
  return await invokeEdgeFunction('weekly-momentum');
}

export async function fetchEscalationStats() {
  return await invokeEdgeFunction('escalation-stats');
}

export async function fetchReplyPacingStats() {
  return await invokeEdgeFunction('reply-pacing');
}

export async function fetchFailureRate() {
  return await invokeEdgeFunction('failure-rate');
}

export async function fetchConversationFlow() {
  return await invokeEdgeFunction('conversation-flow');
}

// ============= SETTINGS =============
export async function fetchSettings() {
  return await invokeEdgeFunction('settings');
}

export async function updateSettings(settings) {
  return await invokeEdgeFunction('settings', {
    body: { settings },
    method: 'POST',
  });
}

// ============= CAMPAIGNS =============
export async function fetchCampaigns() {
  return await invokeEdgeFunction('campaigns');
}

export async function createCampaign(campaign) {
  return await invokeEdgeFunction('campaigns', {
    body: campaign,
    method: 'POST',
  });
}

export async function updateCampaign(id, updates) {
  return await invokeEdgeFunction('campaigns', {
    body: { id, ...updates },
    method: 'PUT',
  });
}

export async function deleteCampaign(id) {
  return await invokeEdgeFunction('campaigns', {
    body: { id },
    method: 'DELETE',
  });
}

// ============= ENTERPRISE ANALYTICS =============
export async function fetchPortfolioPerformance(params = {}) {
  return await invokeEdgeFunction('enterprise-analytics-portfolio-performance', {
    body: params,
  });
}

export async function fetchCohortAnalysis(params = {}) {
  return await invokeEdgeFunction('enterprise-analytics-portfolio-cohort-analysis', {
    body: params,
  });
}

export async function fetchCompetitiveAnalysis() {
  return await invokeEdgeFunction('enterprise-analytics-market-competitive-analysis');
}

export async function fetchIndustryBenchmarks(params = {}) {
  return await invokeEdgeFunction('enterprise-analytics-market-industry-benchmarks', {
    body: params,
  });
}

export async function fetchARRWaterfall(params = {}) {
  return await invokeEdgeFunction('enterprise-analytics-revenue-arr-waterfall', {
    body: params,
  });
}

export async function fetchRevenueMetrics() {
  return await invokeEdgeFunction('enterprise-analytics-revenue-metrics');
}

export async function fetchChurnRisk() {
  return await invokeEdgeFunction('enterprise-analytics-predictive-churn-risk');
}

export async function fetchForecasting() {
  return await invokeEdgeFunction('enterprise-analytics-predictive-forecasting');
}

export async function fetchGlobalKPIs() {
  return await invokeEdgeFunction('enterprise-analytics-kpis-global');
}