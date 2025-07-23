// src/auth/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from '../firebaseConfig'; // Adjust path if needed
import { onAuthStateChanged } from 'firebase/auth';

export default function ProtectedRoute({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- START DEBUG LOGS ---
  console.log("ProtectedRoute Rendered!");
  console.log("Initial loading (outside useEffect):", loading);
  console.log("Initial isLoggedIn (outside useEffect):", isLoggedIn);
  // --- END DEBUG LOGS ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // --- START DEBUG LOGS ---
      console.log("onAuthStateChanged fired! User:", user);
      // --- END DEBUG LOGS ---
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setLoading(false);
      // --- START DEBUG LOGS ---
      console.log("Updated loading (inside onAuthStateChanged):", false);
      console.log("Updated isLoggedIn (inside onAuthStateChanged):", user ? true : false);
      // --- END DEBUG LOGS ---
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    // --- START DEBUG LOGS ---
    console.log("ProtectedRoute: Returning loading state.");
    // --- END DEBUG LOGS ---
    return <div>Checking authentication status...</div>;
  }

  if (!isLoggedIn) {
    // --- START DEBUG LOGS ---
    console.log("ProtectedRoute: User not logged in, navigating to /login.");
    // --- END DEBUG LOGS ---
    return <Navigate to="/login" replace />;
  }

  // --- START DEBUG LOGS ---
  console.log("ProtectedRoute: User logged in, rendering children.");
  // --- END DEBUG LOGS ---
  return children;
}