// src/components/ui/Skeleton.jsx
import React from 'react';

export default function Skeleton({ height = 'h-48' }) {
  return (
    <div
      className={`rounded-2xl shadow-md bg-gradient-to-br from-gray-100 to-white p-4 animate-pulse ${height}`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="w-32 h-4 bg-gray-300 rounded"></div>
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="w-full h-3 bg-gray-200 rounded"></div>
        <div className="w-5/6 h-3 bg-gray-200 rounded"></div>
        <div className="w-2/3 h-3 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}
