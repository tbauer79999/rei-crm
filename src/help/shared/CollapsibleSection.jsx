import React, { useState } from 'react';

const CollapsibleSection = ({ title, children, isInitiallyOpen = false }) => {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);

  return (
    <div className={`collapsible ${isOpen ? 'active' : ''}`}>
      <div 
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3>{title}</h3>
        <span className={`collapsible-icon ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      <div className={`collapsible-content ${isOpen ? 'max-h-full pb-5' : 'max-h-0 overflow-hidden'}`}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleSection;