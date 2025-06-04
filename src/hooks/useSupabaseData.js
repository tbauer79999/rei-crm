import { supabase } from '../services/supabaseClient';

// Mock campaigns — replace with real Supabase fetch when ready
export const fetchCampaigns = async () => {
  return [
    { id: 'mock-campaign-1', name: 'Campaign A' },
    { id: 'mock-campaign-2', name: 'Campaign B' },
    { id: 'mock-campaign-3', name: 'Campaign C' }
  ];
};

// Mock sales reps — replace with real Supabase fetch when ready
export const fetchSalesReps = async () => {
  return [
    { id: 'mock-rep-1', name: 'Alice Smith' },
    { id: 'mock-rep-2', name: 'Bob Johnson' }
  ];
};

// Live Supabase query for dynamic lead segments (lead_source)
export const fetchLeadSegments = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('lead_source')
    .neq('lead_source', null);

  if (error) {
    console.error('Error fetching lead segments:', error);
    return [];
  }

  const uniqueSegments = [...new Set(data.map((lead) => lead.lead_source))];
  return uniqueSegments.map((segment) => ({ value: segment, label: segment }));
};
