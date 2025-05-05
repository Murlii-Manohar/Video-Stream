import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

type AuthUser = {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  profileImage?: string;
  bio?: string;
  subscriberCount?: number;
  isVerified?: boolean;
  isAdmin?: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sendVerificationCode: (email: string) => Promise<boolean>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in when the app loads
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : "Failed to login");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest("POST", "/api/auth/register", userData);
      const newUser = await response.json();
      setUser(newUser);
    } catch (error) {
      console.error("Registration error:", error);
      setError(error instanceof Error ? error.message : "Failed to register");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      setError(error instanceof Error ? error.message : "Failed to logout");
    } finally {
      setIsLoading(false);
    }
  };

  const sendVerificationCode = async (email: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await apiRequest("POST", "/api/auth/send-verification", { email });
      return response.ok;
    } catch (error) {
      console.error("Send verification error:", error);
      setError(error instanceof Error ? error.message : "Failed to send verification code");
      throw error;
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await apiRequest("POST", "/api/auth/verify-email", { email, code });
      const data = await response.json();
      return data.verified || false;
    } catch (error) {
      console.error("Email verification error:", error);
      setError(error instanceof Error ? error.message : "Failed to verify email");
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error("User refresh error:", error);
      setError(error instanceof Error ? error.message : "Failed to refresh user data");
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshUser,
        sendVerificationCode,
        verifyEmail,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
