import React, { createContext, useState, ReactNode } from 'react';

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsLoading(false);
    if (email && password.length >= 6) {
      const name = email.split('@')[0];
      setUser({
        id: 'user_' + Date.now(),
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
      });
      return true;
    }
    return false;
  };

  const signUp = async (name: string, email: string, phone: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsLoading(false);
    if (name && email && phone && password.length >= 6) {
      setUser({ id: 'user_' + Date.now(), name, email, phone });
      return true;
    }
    return false;
  };

  const signOut = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
