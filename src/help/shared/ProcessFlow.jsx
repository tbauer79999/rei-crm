// 📁 ProcessFlow.jsx
import React from 'react';

const ProcessFlow = ({ steps }) => {
  return (
    <div className="process-flow">
      {steps.map((step, index) => (
        <div key={index} className="process-step">
          <div className="process-icon">{step.icon}</div>
          <div className="process-label">{step.label}</div>
          {step.sublabel && (
            <div className="text-xs text-gray-500 mt-1">{step.sublabel}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProcessFlow;