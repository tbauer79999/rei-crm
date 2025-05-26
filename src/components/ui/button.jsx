import React from 'react';

const Button = ({ children, className = '', disabled, ...props }) => {
  const baseClasses = "px-4 py-2 rounded-2xl bg-black text-white font-medium shadow hover:bg-gray-800 transition-all";
  
  const classNames = [baseClasses];

  if (className) {
    classNames.push(className);
  }

  if (disabled) {
    classNames.push("opacity-50 cursor-not-allowed");
  }

  return (
    <button
      {...props}
      disabled={disabled} // Ensure the disabled attribute is passed to the button element
      className={classNames.join(' ')}
    >
      {children}
    </button>
  );
};

export default Button;
