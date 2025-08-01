const supabase = require('../supabaseClient');

export const isDemoTenant = async (tenantId) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('is_demo')
      .eq('id', tenantId)
      .single();
    
    if (error) {
      console.warn('Error checking demo status:', error);
      return false;
    }
    
    return data?.is_demo || false;
  } catch (error) {
    console.warn('Error checking demo status:', error);
    return false;
  }
};

// Re-export all demo data generators
export { generateDemoOverviewMetrics, generateDemoDetailedMetrics } from './overviewData';
export { generateDemoHotLeadData } from './hotLeadsData';
export { generateDemoJourneyData } from './journeyData';