import React, { useState, useEffect } from 'react';

// Temporary simplified auth during migration
export interface SimpleUser {
  id: string;
  email?: string;
}

export interface SimpleSession {
  user: SimpleUser;
  access_token: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [session, setSession] = useState<SimpleSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For migration purposes, always return authenticated state
    // This allows the app to function while we finish the migration
    const mockUser: SimpleUser = { id: 'migration-user', email: 'user@example.com' };
    const mockSession: SimpleSession = { 
      user: mockUser, 
      access_token: 'migration-token' 
    };
    
    setUser(mockUser);
    setSession(mockSession);
    setLoading(false);
  }, []);

  const signOut = async () => {
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: true // Always authenticated during migration
  };
};