// 📁 WarningBox.jsx
import React from 'react';

const WarningBox = ({ title, children }) => {
  return (
    <div className="warning-box">
      <h4>⚠️ {title}</h4>
      {children}
    </div>
  );
};

export default WarningBox;
