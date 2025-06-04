import React, { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

export default function FunnelChart() {
  const [funnelData, setFunnelData] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('All');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('Last 30 Days');

useEffect(() => {
  const fetchFunnel = async () => {
    try {
      const res = await apiClient.get('/funnel', {
        params: {
          campaign: selectedCampaign,
          timeframe: selectedTimeFrame
        }
      });


        const coldCount = res.data.cold || 0;

        const formatted = [
          { name: 'Cold', value: coldCount, color: 'bg-blue-500', percentage: 100 },
          { name: 'Warm', value: res.data.warm || 0, color: 'bg-green-500', percentage: coldCount > 0 ? (res.data.warm / coldCount) * 100 : 0 },
          { name: 'Engaged', value: res.data.engaged || 0, color: 'bg-yellow-500', percentage: coldCount > 0 ? (res.data.engaged / coldCount) * 100 : 0 },
          { name: 'Hot', value: res.data.hot || 0, color: 'bg-red-500', percentage: coldCount > 0 ? (res.data.hot / coldCount) * 100 : 0 }
        ];

        setFunnelData(formatted);
      } catch (err) {
        console.error('Error loading funnel data:', err);
      }
    };

    fetchFunnel();
  }, [selectedCampaign, selectedTimeFrame]);

  const colorMap = {
    'bg-blue-500': '#60a5fa',
    'bg-green-500': '#34d399',
    'bg-yellow-500': '#facc15',
    'bg-red-500': '#f87171'
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Lead Temperature Funnel</CardTitle>
        <div className="flex justify-between items-center mt-2 gap-2">
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
          >
            <option value="All">All Campaigns</option>
            <option value="Campaign A">Campaign A</option>
            <option value="Campaign B">Campaign B</option>
          </select>

          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={selectedTimeFrame}
            onChange={(e) => setSelectedTimeFrame(e.target.value)}
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Quarter">This Quarter</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        <svg width="100%" height="400" viewBox="0 0 400 400" className="mx-auto">
          {funnelData.map((stage, index) => {
            const topWidth = Math.max(60, (stage.percentage / 100) * 300);
            const bottomWidth = index === funnelData.length - 1
              ? topWidth
              : Math.max(60, (funnelData[index + 1].percentage / 100) * 300);

            const y = index * 80;
            const height = 80;

            const topLeft = (400 - topWidth) / 2;
            const topRight = (400 + topWidth) / 2;
            const bottomLeft = (400 - bottomWidth) / 2;
            const bottomRight = (400 + bottomWidth) / 2;

            return (
              <g key={stage.name}>
                <polygon
                  points={`${topLeft},${y} ${topRight},${y} ${bottomRight},${y + height} ${bottomLeft},${y + height}`}
                  fill={colorMap[stage.color]}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x="200"
                  y={y + 35}
                  textAnchor="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                >
                  {stage.name}
                </text>
                <text
                  x="200"
                  y={y + 55}
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                >
                  {stage.value.toLocaleString()}
                </text>
                {index > 0 && funnelData[index - 1].value > 0 && (
                  <g>
                    <circle
                      cx="350"
                      cy={y + 40}
                      r="25"
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <text
                      x="350"
                      y={y + 45}
                      textAnchor="middle"
                      fill="#374151"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {((stage.value / funnelData[index - 1].value) * 100).toFixed(1)}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
