import React from 'react';

const Button = ({ children, className = '', ...props }) => {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-2xl bg-black text-white font-medium shadow hover:bg-gray-800 transition-all ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
