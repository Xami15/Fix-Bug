// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import LiveData from "../pages/LiveData";
import Prediction from "../pages/Prediction";
import History from "../pages/History";
import Overview from "../pages/Overview";
import Settings from "../pages/Settings";
import LoginSignup from "../pages/LoginSignup";
import ForgetPassword from "../pages/ForgetPassword";
import ResetPassword from "../pages/ResetPassword"; // Make sure this import is correct
import ProtectedRoute from "../auth/ProtectedRoute";
// Removed: import { ThemeProvider } from '../context/ThemeContext';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Redirect root to login/signup */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<LoginSignup />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/reset-password/:oobCode" element={<ResetPassword />} />

      {/* Protected dashboard routes (no longer wrapped by ThemeProvider) */}
      <Route
        path="/*" // Making this a catch-all for protected routes
        element={
          <ProtectedRoute>
            {/* Removed ThemeProvider wrapper */}
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="live-data" element={<LiveData />} />
        <Route path="prediction" element={<Prediction />} />
        <Route path="history" element={<History />} />
        <Route path="overview" element={<Overview />} />
        <Route path="settings" element={<Settings />} />
        {/* Optional: Add a default child route for the protected area if you navigate to, say, /home */}
        {/* <Route index element={<Navigate to="dashboard" replace />} /> */}
      </Route>
      {/* Fallback for any unmatched routes - redirects to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
