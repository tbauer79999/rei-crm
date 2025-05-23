import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AIControlRoom from './pages/AIControlRoom'; // Updated name
import Settings from './pages/Settings';
import LeadDetail from './pages/LeadDetail';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Standalone routes for login and signup */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes wrapped by Layout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={
            <Layout>
              <Routes>
                {/* Redirect root to control room */}
                <Route path="/" element={<Navigate to="/control-room" replace />} />
                <Route path="/control-room" element={<AIControlRoom />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/lead/:id" element={<LeadDetail />} />
              </Routes>
            </Layout>
          } />
        </Route>
      </Routes>
    </Router>
  );
}
