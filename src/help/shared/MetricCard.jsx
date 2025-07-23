// 📁 MetricCard.jsx
import React from 'react';

const MetricCard = ({ value, label, sublabel }) => {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
    </div>
  );
};

export default MetricCard;