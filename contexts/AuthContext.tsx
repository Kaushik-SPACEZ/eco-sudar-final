import React, { createContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const USER_STORAGE_KEY = '@ecosudar_user';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app launch, restore saved session
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (_) {
        // Ignore storage errors
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const saveUser = async (u: User) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    } catch (_) {}
    setUser(u);
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsLoading(false);
    if (email && password.length >= 6) {
      const name = email.split('@')[0];
      const u: User = {
        id: 'user_' + Date.now(),
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
      };
      await saveUser(u);
      return true;
    }
    return false;
  };

  const signUp = async (name: string, email: string, phone: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsLoading(false);
    if (name && email && phone && password.length >= 6) {
      const u: User = { id: 'user_' + Date.now(), name, email, phone };
      await saveUser(u);
      return true;
    }
    return false;
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (_) {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
