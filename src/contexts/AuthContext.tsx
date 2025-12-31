import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  name: string;
  lastLogin: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (email: string, password: string, name: string) => { success: boolean; error?: string };
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Stored users in localStorage
const STORAGE_KEY = 'sncf_registered_users';

const DEFAULT_USERS = [
  { email: 'demo@sncf.fr', password: 'demo123', name: 'Agent Demo' },
  { email: 'agent@sncf.fr', password: 'sncf2025', name: 'Agent SNCF' },
];

function getStoredUsers(): { email: string; password: string; name: string }[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return DEFAULT_USERS;
}

function saveUsers(users: { email: string; password: string; name: string }[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('sncf_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (email: string, password: string): boolean => {
    const users = getStoredUsers();
    const validUser = users.find(
      (cred) => cred.email === email && cred.password === password
    );

    if (validUser) {
      const userData: User = {
        email: validUser.email,
        name: validUser.name,
        lastLogin: new Date().toISOString(),
      };
      setUser(userData);
      localStorage.setItem('sncf_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const register = (email: string, password: string, name: string): { success: boolean; error?: string } => {
    const users = getStoredUsers();
    
    // Check if email already exists
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Cet email est déjà utilisé' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Format d\'email invalide' };
    }

    // Validate password length
    if (password.length < 6) {
      return { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' };
    }

    // Add new user
    const newUsers = [...users, { email, password, name }];
    saveUsers(newUsers);

    // Auto login
    const userData: User = {
      email,
      name,
      lastLogin: new Date().toISOString(),
    };
    setUser(userData);
    localStorage.setItem('sncf_user', JSON.stringify(userData));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sncf_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
