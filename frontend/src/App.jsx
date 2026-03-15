import React from 'react';
import {
  BrowserRouter as Router,
  Routes, Route, Navigate
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from './context/LanguageContext';

import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Analyze from './pages/Analyze';
import Map from './pages/Map';
import Tips from './pages/Tips';
import Reports from './pages/Reports';
import Lifestyle from './pages/Lifestyle';
import Profile from './pages/Profile';
import Reminders from './pages/Reminders';
import Insurance from './pages/Insurance';
import PublicProfile from './pages/PublicProfile';
import Onboarding from './pages/Onboarding';
import EmergencyCard from './pages/EmergencyCard';

const isLoggedIn = () => !!localStorage.getItem('access_token');

const Protected = ({ children }) =>
  isLoggedIn() ? children : <Navigate to="/login" replace />;

const AuthLayout = ({ children }) => (
  <Layout>{children}</Layout>
);

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ className: 'toast-dark', duration: 4000 }} />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={isLoggedIn() ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Guest-accessible (no auth needed, but sidebar if logged in) */}
          <Route path="/chat" element={<Layout showSidebar={!!localStorage.getItem('access_token')}><Chat /></Layout>} />
          <Route path="/analyze" element={<Layout showSidebar={!!localStorage.getItem('access_token')}><Analyze /></Layout>} />
          <Route path="/map" element={<Layout showSidebar={!!localStorage.getItem('access_token')}><Map /></Layout>} />
          <Route path="/tips" element={<Layout showSidebar={!!localStorage.getItem('access_token')}><Tips /></Layout>} />

          {/* Protected routes (require auth) */}
          <Route path="/dashboard" element={<Protected><AuthLayout><Dashboard /></AuthLayout></Protected>} />
          <Route path="/reports" element={<Protected><AuthLayout><Reports /></AuthLayout></Protected>} />
          <Route path="/lifestyle" element={<Protected><AuthLayout><Lifestyle /></AuthLayout></Protected>} />
          <Route path="/profile" element={<Protected><AuthLayout><Profile /></AuthLayout></Protected>} />

          {/* Reminders - protected */}
          <Route path="/reminders" element={
            <Protected>
              <AuthLayout>
                <Reminders />
              </AuthLayout>
            </Protected>
          } />

          {/* Insurance - protected */}
          <Route path="/insurance" element={
            <Protected>
              <AuthLayout>
                <Insurance />
              </AuthLayout>
            </Protected>
          } />

          {/* Onboarding - protected, new users only */}
          <Route path="/onboarding" element={
            <Protected>
              <Onboarding />
            </Protected>
          } />

          {/* Public profile - no auth needed */}
          <Route path="/profile/:username" element={<PublicProfile />} />

          {/* Emergency card - public, no auth needed */}
          <Route path="/emergency/:username" element={<EmergencyCard />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
