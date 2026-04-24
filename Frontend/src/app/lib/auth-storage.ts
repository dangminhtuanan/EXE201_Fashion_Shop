import type { AuthSession, UserProfile } from "../types";

export const AUTH_STORAGE_KEY = "outfio-auth-session";
export const AUTH_STORAGE_EVENT = "outfio-auth-changed";

function emitAuthChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_STORAGE_EVENT));
}

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  emitAuthChange();
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthChange();
}

export function updateStoredProfile(profile: UserProfile) {
  const currentSession = getStoredAuthSession();
  if (!currentSession) {
    return null;
  }

  const nextSession: AuthSession = {
    ...currentSession,
    profile,
  };

  setStoredAuthSession(nextSession);
  return nextSession;
}
