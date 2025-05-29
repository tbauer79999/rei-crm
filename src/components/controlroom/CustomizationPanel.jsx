import React from 'react';

const CustomizationPanel = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Card 1: Campaign Personalization */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Campaign Personalization</div>
        <div className="text-sm text-gray-500 mb-4">Modify tone, persona, and industry context per campaign</div>
        <div className="text-sm text-gray-700">
          Tones: Friendly, Assertive, Aggressive<br />
          Personas: Consultant, Closer, Icebreaker<br />
          Industry: Real Estate, Staffing, B2B
        </div>
      </div>

      {/* Card 2: Feature Toggles */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Feature Toggles</div>
        <div className="text-sm text-gray-500 mb-4">Enable/disable AI features per tenant</div>
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li>AI After-Hours Override</li>
          <li>AI Cold Follow-up Campaign</li>
          <li>Escalation Notifications</li>
        </ul>
      </div>

      {/* Card 3: Instruction & Prompt Settings */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Instruction & Prompt Settings</div>
        <div className="text-sm text-gray-500 mb-4">Review or edit your AI instructions and tone/prompt bundle</div>
        <div className="text-sm text-gray-700 italic">
          “Speak with confidence. Focus on surfacing motivation...”
        </div>
      </div>

      {/* Card 4: Escalation Preview Settings */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Escalation Preview Settings</div>
        <div className="text-sm text-gray-500 mb-4">Visualize when and how AI escalates based on score & reply logic</div>
        <div className="text-sm text-gray-700">
          <strong>Trigger Rule:</strong><br />
          - Score ≥ <strong>7</strong><br />
          - After <strong>3 replies</strong> from lead<br />
          <br />
          <strong>Escalation Method:</strong><br />
          - SMS + Dashboard Flag
        </div>
      </div>
    </div>
  );
};

export default CustomizationPanel;
