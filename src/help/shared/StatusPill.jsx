// 📁 StatusPill.jsx
import React from 'react';

const StatusPill = ({ status, type = 'default' }) => {
  const getStatusClasses = () => {
    switch (type) {
      case 'hot':
        return 'status-pill status-hot';
      case 'engaging':
        return 'status-pill status-engaging';
      case 'responding':
        return 'status-pill status-responding';
      case 'cold':
        return 'status-pill status-cold';
      default:
        return 'status-pill';
    }
  };

  return (
    <span className={getStatusClasses()}>
      {status}
    </span>
  );
};

export default StatusPill;