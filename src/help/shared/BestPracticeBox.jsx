// 📁 BestPracticeBox.jsx
import React from 'react';

const BestPracticeBox = ({ title, children }) => {
  return (
    <div className="best-practice">
      <h4>✅ {title}</h4>
      {children}
    </div>
  );
};

export default BestPracticeBox;