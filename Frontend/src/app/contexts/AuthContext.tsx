import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi, profileApi } from "../lib/api";
import {
  AUTH_STORAGE_EVENT,
  AUTH_STORAGE_KEY,
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
  updateStoredProfile,
} from "../lib/auth-storage";
import type { AuthSession, LoginPayload, UserProfile } from "../types";

interface AuthContextType {
  session: AuthSession | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  setProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const syncSession = () => {
      setSession(getStoredAuthSession());
    };

    syncSession();
    setIsHydrating(false);

    if (typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === AUTH_STORAGE_KEY) {
        syncSession();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(AUTH_STORAGE_EVENT, syncSession);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(AUTH_STORAGE_EVENT, syncSession);
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    const nextSession: AuthSession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      profile: response.profile,
    };

    setStoredAuthSession(nextSession);
    setSession(nextSession);
    return nextSession;
  };

  const logout = () => {
    clearStoredAuthSession();
    setSession(null);
  };

  const refreshProfile = async () => {
    const currentSession = getStoredAuthSession();
    if (!currentSession) {
      setSession(null);
      return null;
    }

    const response = await profileApi.getProfile();
    const nextSession: AuthSession = {
      ...currentSession,
      profile: response.profile,
    };

    setStoredAuthSession(nextSession);
    setSession(nextSession);
    return response.profile;
  };

  const setProfile = (profile: UserProfile) => {
    const nextSession = updateStoredProfile(profile);
    if (nextSession) {
      setSession(nextSession);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.profile || null,
        isAuthenticated: Boolean(session?.accessToken),
        isHydrating,
        login,
        logout,
        refreshProfile,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
