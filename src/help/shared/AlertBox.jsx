// 📁 AlertBox.jsx
import React from 'react';

const AlertBox = ({ type = 'info', icon, title, children }) => {
  const getAlertClasses = () => {
    switch (type) {
      case 'warning':
        return 'alert alert-warning';
      case 'success':
        return 'alert alert-success';
      case 'danger':
        return 'alert alert-danger';
      default:
        return 'alert alert-info';
    }
  };

  return (
    <div className={getAlertClasses()}>
      {icon && <span>{icon}</span>}
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
};

export default AlertBox;