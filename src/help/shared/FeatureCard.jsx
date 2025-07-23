// 📁 FeatureCard.jsx
import React from 'react';

const FeatureCard = ({ icon, title, description, onClick }) => {
  return (
    <div 
      className="card"
      onClick={onClick}
    >
      <div className="card-icon">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

export default FeatureCard;