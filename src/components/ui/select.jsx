// select.jsx
import * as React from "react"

export function Select({ children, value, onValueChange, ...props }) {
  const handleChange = (event) => {
    if (onValueChange) {
      onValueChange(event.target.value); // Pass the selected value to onValueChange
    }
  };

  return (
    <div className="relative w-full">
      <select
        className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={value} // Pass value directly
        onChange={handleChange} // Use the new handleChange for native onChange
        {...props} // Pass other props (like id, name, disabled, etc.)
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
        ▼
      </div>
    </div>
  );
}

export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}
