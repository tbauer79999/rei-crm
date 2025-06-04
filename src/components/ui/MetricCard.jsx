import React from 'react';

const MetricCard = ({ title, value, subtext, trend }) => (
  <div className="bg-white p-4 rounded-xl shadow border text-center">
    <h3 className="text-sm text-gray-500 mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
    {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    {trend && (
      <p
        className={`text-xs mt-1 font-medium ${
          trend.startsWith('+') ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {trend.startsWith('+') ? '▲' : '▼'} {trend.replace(/^[+-]/, '')}
      </p>
    )}
  </div>
);

export default MetricCard;
