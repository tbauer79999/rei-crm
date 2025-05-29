// src/components/controlroom/AiOptimizationPanel.jsx
import React, { useEffect, useState } from 'react';
import apiClient from '../../lib/apiClient';
import { Card } from '../ui/card';
import { MessageSquareText, Zap } from 'lucide-react';

const AiOptimizationPanel = () => {
  const [keywords, setKeywords] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [messageMatches, setMessageMatches] = useState([]);

  useEffect(() => {
    apiClient.get('/api/keywords').then((res) => {
      setKeywords(res.data.keywords || []);
    });
  }, []);

  useEffect(() => {
    if (selectedKeyword) {
      apiClient
        .get(`/api/messages?keyword=${encodeURIComponent(selectedKeyword)}`)
        .then((res) => setMessageMatches(res.data.matches || []))
        .catch(() => setMessageMatches([]));
    }
  }, [selectedKeyword]);

  return (
    <div className="space-y-6">
      {/* Row 1: Keyword Triggers with Click */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center">
          <Zap className="w-4 h-4 mr-2 text-yellow-500" /> High-Intent Keyword Triggers
        </h3>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <button
              key={kw}
              onClick={() => setSelectedKeyword(kw)}
              className={`px-2 py-1 rounded-full border text-sm hover:bg-blue-50 hover:text-blue-700 transition ${
                selectedKeyword === kw ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      </Card>

      {/* Row 2: Message Matches for Selected Keyword */}
      {selectedKeyword && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center">
            <MessageSquareText className="w-4 h-4 mr-2 text-gray-500" />
            Messages containing: <span className="ml-1 text-blue-600">"{selectedKeyword}"</span>
          </h3>
          {messageMatches.length > 0 ? (
            <ul className="text-sm space-y-2 pl-2 list-disc">
              {messageMatches.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No matches found.</p>
          )}
        </Card>
      )}

      {/* Row 3: Sentiment Breakdown, Common Keywords, Time to Hot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-1">Sentiment Breakdown</h3>
          <p className="text-sm text-gray-500 mb-4">Percentage of all AI conversations by tone</p>
          <div className="flex justify-center items-center h-32 text-gray-400">[Pie Chart Placeholder]</div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-1">Common Keywords</h3>
          <p className="text-sm text-gray-500 mb-4">Top phrases and words extracted from replies</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">price</span>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">timeline</span>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">repairs</span>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">cash offer</span>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">as-is</span>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-1">Time & Messages to Hot</h3>
          <p className="text-sm text-gray-500 mb-4">Average effort required to surface a hot lead</p>
          <ul className="text-sm space-y-2">
            <li><strong>Avg. Messages:</strong> 6.2</li>
            <li><strong>Avg. Time (hrs):</strong> 14.7</li>
            <li><strong>Fastest Hot Lead:</strong> 2 messages, 11 minutes</li>
          </ul>
        </Card>
      </div>

      {/* Row 4: Trigger Phrases, Opt-Outs, Overrides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-1">Hot Trigger Phrases</h3>
          <p className="text-sm text-gray-500 mb-2">Most common phrases said just before becoming a hot lead</p>
          <ul className="text-sm list-disc list-inside">
            <li>“Let’s talk”</li>
            <li>“I’m open to an offer”</li>
            <li>“Can you come see it?”</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-1">Opt-Out Reasons</h3>
          <p className="text-sm text-gray-500 mb-2">Top reasons leads stop engaging</p>
          <ul className="text-sm list-disc list-inside">
            <li>Already sold</li>
            <li>Not selling</li>
            <li>Don’t trust AI</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-1">Manual Overrides</h3>
          <p className="text-sm text-gray-500 mb-2">Total times a human stepped in or adjusted AI conversation</p>
          <ul className="text-sm">
            <li><strong>Last 7 Days:</strong> 12</li>
            <li><strong>This Month:</strong> 43</li>
            <li><strong>All-Time:</strong> 184</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default AiOptimizationPanel;
