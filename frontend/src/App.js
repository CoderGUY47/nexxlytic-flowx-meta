import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Flows from './pages/Flows';
import Contacts from './pages/Contacts';
import Keywords from './pages/Keywords';
import Broadcasts from './pages/Broadcasts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import InstagramPosts from './pages/InstagramPosts';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0a0f1e',
              color: '#fff',
              border: '0.5px solid rgba(0,212,255,0.3)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px'
            }
          }}
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="flows" element={<Flows />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="keywords" element={<Keywords />} />
            <Route path="broadcasts" element={<Broadcasts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="instagram" element={<InstagramPosts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
