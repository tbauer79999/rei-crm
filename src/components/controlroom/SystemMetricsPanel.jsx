import React from 'react';

const SystemMetricsPanel = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Usage Quotas */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Usage Quotas</div>
        <div className="text-sm text-gray-500 mb-4">Current usage against your subscription plan</div>
        <ul className="text-sm space-y-2">
          <li><strong>Messages Sent:</strong> 6,200 / 10,000</li>
          <li><strong>Leads Processed:</strong> 1,240 / 2,000</li>
          <li><strong>Storage Used:</strong> 512MB / 1GB</li>
        </ul>
      </div>

      {/* Card 2: API/Integration Status */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">API / Integration Status</div>
        <div className="text-sm text-gray-500 mb-4">Connectivity to external services</div>
        <ul className="text-sm space-y-2">
          <li><strong>CRM:</strong> ✅ Connected</li>
          <li><strong>Messaging Gateway:</strong> ✅ Operational</li>
          <li><strong>Calendar Sync:</strong> ⚠️ Token Expired</li>
        </ul>
      </div>

      {/* Card 3: Audit Log */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Audit Log</div>
        <div className="text-sm text-gray-500 mb-4">Most recent actions in the system</div>
        <ul className="text-sm space-y-2">
          <li>✅ User <strong>Sarah</strong> updated AI bundle</li>
          <li>📤 Uploaded <strong>318 leads</strong></li>
          <li>🛠️ Changed lead scoring threshold</li>
          <li>🕵️‍♂️ Viewed 9 hot leads</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemMetricsPanel;
