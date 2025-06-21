// components/HelpCenter.jsx
export default function HelpCenter() {
  return (
    <div className="w-full h-full">
      <iframe 
        src="/help-center.html" 
        className="w-full h-[calc(100vh-64px)] border-0 rounded-lg"
        title="Help Center"
      />
    </div>
  );
}