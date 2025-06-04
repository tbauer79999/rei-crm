import React from 'react';

export default function Slider({ value, onValueChange, min = 0, max = 100, step = 1 }) {
  return (
    <input
      type="range"
      value={value[0]}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange([parseInt(e.target.value, 10)])}
      className="w-full"
    />
  );
}
