import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LeadDetail from './pages/LeadDetail';
import AddLead from './pages/AddLead';
import Analytics from './pages/Analytics';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <nav className="bg-white shadow mb-4 px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold">Lead Dashboard</div>
          <div className="space-x-4">
            <a href="/" className="text-blue-600 hover:underline">
              Dashboard
            </a>
          </div>
        </nav>

        <div className="px-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lead/:id" element={<LeadDetail />} />
            <Route path="/add" element={<AddLead />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
