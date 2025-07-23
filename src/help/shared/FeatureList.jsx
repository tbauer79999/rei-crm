// 📁 FeatureList.jsx
import React from 'react';

const FeatureList = ({ features }) => {
  return (
    <ul className="feature-list">
      {features.map((feature, index) => (
        <li key={index}>
          <span className="feature-icon">✅</span>
          <div className="feature-content">
            <h4>{feature.title}</h4>
            <p>{feature.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default FeatureList;