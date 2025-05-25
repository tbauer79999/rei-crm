// src/components/ui/checkbox.jsx
export default function Checkbox({ checked, onCheckedChange }) {
  return (
    <input
      type="checkbox"
      className="w-4 h-4 accent-blue-500"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  );
}
