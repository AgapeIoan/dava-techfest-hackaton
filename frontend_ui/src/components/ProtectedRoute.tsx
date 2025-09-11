import React from 'react';
import { Navigate } from 'react-router-dom';
import useDupeStore from '../store/dupeStore';

// This component acts as a gatekeeper for routes
export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  // Get the authentication state directly from the Zustand store
  const { isAuthenticated, role } = useDupeStore();

  // Check for the required condition: user must be authenticated AND have the 'admin' role
  if (!isAuthenticated || role !== 'admin') {
    // If the condition is not met, redirect the user to a safe, public page.
    return <Navigate to="/duplicates" replace />;
  }

  // If the user is an admin, render the page they were trying to access.
  return children;
}