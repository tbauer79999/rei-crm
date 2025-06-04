import supabase from './supabaseClient';

// Base URL for your API
const API_BASE = 'http://localhost:5000';

// Helper function to get auth token
const getAuthToken = async () => {
  // Get current session from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// Helper function to make authenticated fetch requests
const authFetch = async (url, options = {}) => {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log(`🔗 API Request: ${options.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    console.error(`❌ API Error: ${response.status} ${url}`);
    throw new Error(`Failed to fetch from ${url}`);
  }

  const data = await response.json();
  console.log(`✅ API Success: ${response.status} ${url}`, data);
  return data;
};

// ============= ORIGINAL FUNCTIONS =============
export async function fetchProperties() {
  return await authFetch(`${API_BASE}/api/leads`);
}

export async function fetchResponseTimeMetrics() {
  return await authFetch(`${API_BASE}/api/response-time`);
}

export async function fetchMessageQualityMetrics() {
  return await authFetch(`${API_BASE}/api/message-quality`);
}

export async function fetchWeeklyMomentumMetrics() {
  return await authFetch(`${API_BASE}/api/weekly-momentum`);
}

export async function fetchEscalationStats() {
  return await authFetch(`${API_BASE}/api/escalation-stats`);
}

export async function fetchReplyPacingStats() {
  return await authFetch(`${API_BASE}/api/reply-pacing`);
}

export async function fetchAIEfficiency() {
  return await authFetch(`${API_BASE}/api/ai-efficiency`);
}

export async function fetchAIvsHumanSplit() {
  return await authFetch(`${API_BASE}/api/ai-vs-human`);
}

export async function fetchFailureRate() {
  return await authFetch(`${API_BASE}/api/failure-rate`);
}

export async function fetchConversationFlow() {
  return await authFetch(`${API_BASE}/api/conversation-flow`);
}

export async function fetchLeadConversionSpeed() {
  return await authFetch(`${API_BASE}/api/lead-conversion-speed`);
}

// ============= NEW SECURED ENDPOINTS =============
export async function fetchOverview() {
  return await authFetch(`${API_BASE}/api/overview`);
}

export async function fetchFunnel() {
  return await authFetch(`${API_BASE}/api/funnel`);
}

export async function fetchLeadTrends() {
  const response = await authFetch(`${API_BASE}/api/lead-trends`);
  
  // Transform to match frontend expectations
  return {
    ...response,
    totalLeads: response.totalPeriod, // Map totalPeriod to totalLeads
    totalToday: response.trends?.[0]?.count || 0, // Get today's count
  };
}

export async function fetchHotLeads() {
  return await authFetch(`${API_BASE}/api/hot`);
}

export async function fetchHotSummary() {
  return await authFetch(`${API_BASE}/api/hot-summary`);
}

export async function fetchHealth() {
  return await authFetch(`${API_BASE}/api/health/health-check`);
}

export async function fetchSettings() {
  return await authFetch(`${API_BASE}/api/settings`);
}

export async function updateSettings(settings) {
  return await authFetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    body: JSON.stringify({ settings })
  });
}

// ============= HEALTH & MONITORING =============
export async function fetchHealthCheck() {
  return await authFetch(`${API_BASE}/api/health/health-check`);
}

export async function fetchFunnelHealth() {
  return await authFetch(`${API_BASE}/api/health/funnel-health`);
}

// ============= ENTERPRISE ANALYTICS =============
export async function fetchPortfolioPerformance(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}/api/enterprise-analytics/portfolio/performance${queryString ? `?${queryString}` : ''}`;
  return await authFetch(url);
}

export async function fetchCohortAnalysis(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}/api/enterprise-analytics/portfolio/cohort-analysis${queryString ? `?${queryString}` : ''}`;
  return await authFetch(url);
}

export async function fetchCompetitiveAnalysis() {
  return await authFetch(`${API_BASE}/api/enterprise-analytics/market/competitive-analysis`);
}

export async function fetchIndustryBenchmarks(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}/api/enterprise-analytics/market/industry-benchmarks${queryString ? `?${queryString}` : ''}`;
  return await authFetch(url);
}

export async function fetchARRWaterfall(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}/api/enterprise-analytics/revenue/arr-waterfall${queryString ? `?${queryString}` : ''}`;
  return await authFetch(url);
}

export async function fetchRevenueMetrics() {
  return await authFetch(`${API_BASE}/api/enterprise-analytics/revenue/metrics`);
}

export async function fetchChurnRisk() {
  return await authFetch(`${API_BASE}/api/enterprise-analytics/predictive/churn-risk`);
}

export async function fetchForecasting() {
  return await authFetch(`${API_BASE}/api/enterprise-analytics/predictive/forecasting`);
}

export async function fetchGlobalKPIs() {
  return await authFetch(`${API_BASE}/api/enterprise-analytics/kpis/global`);
}

export async function fetchKeywords() {
  return await authFetch(`${API_BASE}/api/keywords`);
}