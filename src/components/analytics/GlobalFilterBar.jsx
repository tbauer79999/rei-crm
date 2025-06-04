// /src/components/analytics/GlobalFilterBar.jsx
import React, { useEffect, useState } from 'react';
import { fetchCampaigns, fetchSalesReps, fetchLeadSegments } from '../../hooks/useSupabaseData';

const GlobalFilterBar = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [leadSegments, setLeadSegments] = useState([]);

  useEffect(() => {
    const loadFilterData = async () => {
      const campaignsData = await fetchCampaigns();
      const salesRepsData = await fetchSalesReps();
      const leadSegmentsData = await fetchLeadSegments();

      setCampaigns(campaignsData);
      setSalesReps(salesRepsData);
      setLeadSegments(leadSegmentsData);
    };

    loadFilterData();
  }, []);

  return (
    <div className="global-filter-bar">
      {/* Date Range Selector */}
      <div className="filter-item">
        <label>Date Range:</label>
        <select>
          <option>Last 30 Days</option>
          <option>Last 60 Days</option>
          <option>Last 90 Days</option>
          <option>This Quarter</option>
          <option>Last Quarter</option>
          <option>This Year</option>
          <option>Last Year</option>
          <option>Custom Range</option>
        </select>
      </div>

      {/* Campaign Selector */}
      <div className="filter-item">
        <label>Campaigns:</label>
        <select multiple>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sales Rep Selector */}
      <div className="filter-item">
        <label>Sales Reps:</label>
        <select multiple>
          {salesReps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lead Segment Filters */}
      <div className="filter-item">
        <label>Lead Segments:</label>
        <select multiple>
          {leadSegments.map((segment) => (
            <option key={segment} value={segment}>
              {segment}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default GlobalFilterBar;
