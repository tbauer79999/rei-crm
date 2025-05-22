import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import LeadDetail from './pages/LeadDetail';
import LoginPage from './pages/LoginPage'; // Import LoginPage
import SignupPage from './pages/SignupPage'; // Import SignupPage
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute

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
                {/* Default redirect to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/lead/:id" element={<LeadDetail />} />
                {/* Add other layout-wrapped routes here */}
              </Routes>
            </Layout>
          } />
        </Route>
      </Routes>
    </Router>
  );
}
