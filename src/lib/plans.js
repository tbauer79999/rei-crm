// Phase 3: Plan-Based Feature Gating
// Based on surfox_pricing_plan_matrix.xlsx

export const PLAN_FEATURES = {
  starter: {
    // Limits
    monthlyLeads: 500,
    teamSeats: 1,
    knowledgeBaseFiles: 0,
    conversationMemory: 0,
    
    // Core AI Features (all plans get these)
    aiGeneratedInitialSms: true,
    aiAutoReplies: true,
    coldFollowUpAutomations: true,
    aiTonePersonaSelector: true,
    csvExports: true,
    
    // Limited Features
    aiControlRoomAccess: 'basic', // 'basic' | 'full' | 'team_metrics'
    systemToolsAccess: 'view_only', // 'view_only' | 'full'
    roleBasedPermissions: 'admin_only', // 'admin_only' | 'basic' | 'full'
    systemUsageAlerts: 'soft_cap', // 'soft_cap' | 'alerts' | 'sla'
    
    // Disabled Features
    funnelModule: false,
    escalationScoreThresholdControl: false,
    afterHoursAiOverrideToggle: false,
    aiReplyPacingModeConfig: false,
    chromeExtension: false,
    zapierApiIntegration: false,
    messageAbTesting: false,
    whiteGloveOnboardingCsm: false
  },
  
  growth: {
    // Limits
    monthlyLeads: 2500,
    teamSeats: 5,
    knowledgeBaseFiles: 1,
    conversationMemory: 100,
    
    // Core AI Features (all plans get these)
    aiGeneratedInitialSms: true,
    aiAutoReplies: true,
    coldFollowUpAutomations: true,
    aiTonePersonaSelector: true,
    csvExports: true,
    
    // Enhanced Features
    aiControlRoomAccess: 'full',
    systemToolsAccess: 'full',
    roleBasedPermissions: 'basic', // Admin + Users
    systemUsageAlerts: 'alerts',
    
    // Growth+ Features
    funnelModule: true,
    escalationScoreThresholdControl: true,
    afterHoursAiOverrideToggle: true,
    aiReplyPacingModeConfig: true,
    chromeExtension: true,
    zapierApiIntegration: true,
    
    // Still Disabled
    messageAbTesting: false,
    whiteGloveOnboardingCsm: false
  },
  
  scale: {
    // Limits (unlimited/high limits)
    monthlyLeads: 10000, // 10,000+ in spreadsheet
    teamSeats: 15, // 15+ in spreadsheet  
    knowledgeBaseFiles: -1, // unlimited
    conversationMemory: 1000,
    
    // Core AI Features (all plans get these)
    aiGeneratedInitialSms: true,
    aiAutoReplies: true,
    coldFollowUpAutomations: true,
    aiTonePersonaSelector: true,
    csvExports: true,
    
    // Premium Features
    aiControlRoomAccess: 'team_metrics',
    systemToolsAccess: 'full',
    roleBasedPermissions: 'full', // Full RBAC
    systemUsageAlerts: 'sla',
    
    // All Growth Features
    funnelModule: true,
    escalationScoreThresholdControl: true,
    afterHoursAiOverrideToggle: true,
    aiReplyPacingModeConfig: true,
    chromeExtension: true,
    zapierApiIntegration: true,
    
    // Scale-Only Features
    messageAbTesting: true,
    whiteGloveOnboardingCsm: true
  },
  
  enterprise: {
    // Custom/Unlimited
    monthlyLeads: -1, // unlimited
    teamSeats: -1, // unlimited
    knowledgeBaseFiles: -1, // unlimited
    conversationMemory: -1, // unlimited
    
    // All features enabled
    aiGeneratedInitialSms: true,
    aiAutoReplies: true,
    coldFollowUpAutomations: true,
    aiTonePersonaSelector: true,
    csvExports: true,
    aiControlRoomAccess: 'team_metrics',
    systemToolsAccess: 'full',
    roleBasedPermissions: 'full',
    systemUsageAlerts: 'sla',
    funnelModule: true,
    escalationScoreThresholdControl: true,
    afterHoursAiOverrideToggle: true,
    aiReplyPacingModeConfig: true,
    chromeExtension: true,
    zapierApiIntegration: true,
    messageAbTesting: true,
    whiteGloveOnboardingCsm: true,
    
    // Enterprise-Only Features
    whiteLabel: true,
    customBranding: true,
    ssoIntegration: true,
    dedicatedSupport: true,
    customIntegrations: true
  }
};

// Plan metadata for display and billing
export const PLAN_METADATA = {
  starter: {
    name: 'Starter',
    price: 197,
    currency: 'USD',
    interval: 'month',
    description: 'Perfect for getting started with AI messaging',
    popular: false
  },
  growth: {
    name: 'Growth',
    price: 397,
    currency: 'USD',
    interval: 'month',
    description: 'Advanced features for growing businesses',
    popular: true
  },
  scale: {
    name: 'Scale',
    price: 997,
    currency: 'USD',
    interval: 'month',
    description: 'Full-featured plan for scaling operations',
    popular: false
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom pricing
    currency: 'USD',
    interval: 'month',
    description: 'Custom solution with white-label options',
    popular: false
  }
};

// Helper functions for plan checking
export const hasFeature = (plan, feature) => {
  return PLAN_FEATURES[plan]?.[feature] || false;
};

export const getFeatureValue = (plan, feature) => {
  return PLAN_FEATURES[plan]?.[feature];
};

export const isUnlimited = (plan, feature) => {
  const value = getFeatureValue(plan, feature);
  return value === -1 || value === 'unlimited';
};

export const checkLimit = (plan, feature, currentUsage) => {
  const limit = getFeatureValue(plan, feature);
  
  if (limit === -1) return { allowed: true, unlimited: true };
  if (typeof limit !== 'number') return { allowed: true, unlimited: false };
  
  return {
    allowed: currentUsage < limit,
    unlimited: false,
    remaining: Math.max(0, limit - currentUsage),
    limit
  };
};

// Feature gating for UI components
export const FeatureGate = ({ plan, feature, children, fallback = null, showUpgrade = false }) => {
  if (hasFeature(plan, feature)) {
    return children;
  }
  
  if (showUpgrade) {
    return <UpgradePrompt feature={feature} currentPlan={plan} />;
  }
  
  return fallback;
};

// Usage examples:
// if (!hasFeature(currentPlan, 'funnelModule')) {
//   return <UpgradePrompt />
// }
//
// const teamSeatsCheck = checkLimit(currentPlan, 'teamSeats', currentTeamSize);
// if (!teamSeatsCheck.allowed) {
//   return <TeamLimitReached />
// }
//
// <FeatureGate plan={currentPlan} feature="chromeExtension" showUpgrade>
//   <ChromeExtensionDownload />
// </FeatureGate>

export default PLAN_FEATURES;