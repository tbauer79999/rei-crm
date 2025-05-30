// /src/components/analytics/AnalyticsLayout.jsx
import React from 'react';
import GlobalFilterBar from './GlobalFilterBar';

const AnalyticsLayout = ({ children }) => {
  return (
    <div className="analytics-layout">
      <GlobalFilterBar />
      <div className="analytics-content">
        {children}
      </div>
    </div>
  );
};

export default AnalyticsLayout;
