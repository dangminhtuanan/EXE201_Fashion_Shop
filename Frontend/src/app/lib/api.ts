import axios, { type AxiosRequestConfig, type Method } from "axios";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
} from "./auth-storage";
import type {
  AuthSession,
  ChangePasswordPayload,
  CreateUserPayload,
  LoginPayload,
  OtpPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  UpdateUserPayload,
  UserProfile,
} from "../types";

const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export const API_ORIGIN = (() => {
  try {
    if (typeof window !== "undefined") {
      return new URL(API_BASE_URL, window.location.origin).origin;
    }

    return new URL(API_BASE_URL).origin;
  } catch {
    return "http://localhost:5000";
  }
})();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
});

let refreshPromise: Promise<string | null> | null = null;

export function resolveAssetUrl(path?: string | null) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định";
}

type RequestBody = FormData | Record<string, unknown> | string | null;

interface RequestOptions
  extends Omit<AxiosRequestConfig, "url" | "baseURL" | "data" | "headers" | "method"> {
  auth?: boolean;
  body?: RequestBody;
  headers?: Record<string, string>;
  method?: Method;
  retryOnUnauthorized?: boolean;
}

function extractMessage(data: unknown, fallback = "Yêu cầu thất bại") {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return fallback;
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentSession = getStoredAuthSession();
    if (!currentSession?.refreshToken) {
      clearStoredAuthSession();
      return null;
    }

    try {
      const response = await refreshClient.post<RefreshTokenResponse>(
        "/auth/refresh-token",
        {
          refreshToken: currentSession.refreshToken,
        },
      );

      if (!response.data?.accessToken) {
        clearStoredAuthSession();
        return null;
      }

      const nextSession: AuthSession = {
        ...currentSession,
        accessToken: response.data.accessToken,
      };

      setStoredAuthSession(nextSession);
      return response.data.accessToken;
    } catch {
      clearStoredAuthSession();
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request<T>(
  path: string,
  {
    auth = false,
    body,
    headers = {},
    method = "GET",
    retryOnUnauthorized = true,
    ...config
  }: RequestOptions = {},
): Promise<T> {
  const session = getStoredAuthSession();
  const requestHeaders: Record<string, string> = { ...headers };

  if (auth && session?.accessToken) {
    requestHeaders.Authorization = `Bearer ${session.accessToken}`;
  }

  if (!(body instanceof FormData) && body !== undefined && body !== null && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  try {
    const response = await apiClient.request<T>({
      url: path,
      method,
      data: body ?? undefined,
      headers: requestHeaders,
      ...config,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0;
      const data = error.response?.data;

      if (status === 401 && auth && retryOnUnauthorized) {
        const newAccessToken = await refreshAccessToken();

        if (newAccessToken) {
          return request<T>(path, {
            ...config,
            auth,
            body,
            headers,
            method,
            retryOnUnauthorized: false,
          });
        }
      }

      throw new ApiError(
        extractMessage(data, error.message),
        status,
        data,
      );
    }

    throw new ApiError("Đã xảy ra lỗi không xác định", 0, error);
  }
}

interface MessageResponse {
  message: string;
}

interface LoginResponse extends MessageResponse {
  profile: UserProfile;
  accessToken: string;
  refreshToken: string;
}

interface ProfileResponse extends MessageResponse {
  profile: UserProfile;
}

interface UsersResponse extends MessageResponse {
  users: UserProfile[];
}

interface UserResponse extends MessageResponse {
  user: UserProfile;
}

interface RefreshTokenResponse extends MessageResponse {
  accessToken: string;
}

interface AvatarResponse extends MessageResponse {
  avatar: UserProfile["avatar"];
}

export const authApi = {
  login(payload: LoginPayload) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },
  registerSendOtp(payload: RegisterPayload) {
    return request<MessageResponse>("/auth/register-send-otp", {
      method: "POST",
      body: payload,
    });
  },
  registerVerifyOtp(payload: OtpPayload) {
    return request<MessageResponse>("/auth/register-verify-otp", {
      method: "POST",
      body: payload,
    });
  },
  requestReset(email: string) {
    return request<MessageResponse>("/auth/request-reset", {
      method: "POST",
      body: { email },
    });
  },
  verifyResetOtp(payload: ResetPasswordPayload) {
    return request<MessageResponse>("/auth/verify-otp", {
      method: "POST",
      body: payload,
    });
  },
  refreshToken(refreshToken: string) {
    return request<RefreshTokenResponse>("/auth/refresh-token", {
      method: "POST",
      body: { refreshToken },
    });
  },
};

export const profileApi = {
  getProfile() {
    return request<ProfileResponse>("/profile/get-profile", {
      auth: true,
    });
  },
  updateProfile(payload: UpdateProfilePayload) {
    return request<ProfileResponse>("/profile/update", {
      method: "PUT",
      auth: true,
      body: payload,
    });
  },
  requestChangePasswordOtp() {
    return request<MessageResponse>("/profile/change-password/request-otp", {
      method: "POST",
      auth: true,
    });
  },
  verifyChangePasswordOtp(payload: ChangePasswordPayload) {
    return request<MessageResponse>("/profile/change-password/verify-otp", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
  requestChangeEmailOldOtp() {
    return request<MessageResponse>("/profile/change-email/request-old-otp", {
      method: "POST",
      auth: true,
    });
  },
  verifyChangeEmailOldOtp(otp: string) {
    return request<MessageResponse>("/profile/change-email/verify-old-otp", {
      method: "POST",
      auth: true,
      body: { otp },
    });
  },
  requestChangeEmailNewOtp(newEmail: string) {
    return request<MessageResponse>("/profile/change-email/request-new-otp", {
      method: "POST",
      auth: true,
      body: { newEmail },
    });
  },
  verifyChangeEmailNewOtp(otp: string) {
    return request<MessageResponse>("/profile/change-email/verify-new-otp", {
      method: "POST",
      auth: true,
      body: { otp },
    });
  },
  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);

    return request<AvatarResponse>("/profile/upload-avatar", {
      method: "POST",
      auth: true,
      body: formData,
    });
  },
};

export const usersApi = {
  getAll() {
    return request<UsersResponse>("/users", {
      auth: true,
    });
  },
  getById(id: string) {
    return request<UserResponse>(`/users/${id}`, {
      auth: true,
    });
  },
  create(payload: CreateUserPayload) {
    return request<UserResponse>("/users", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
  update(id: string, payload: UpdateUserPayload) {
    return request<UserResponse>(`/users/${id}`, {
      method: "PUT",
      auth: true,
      body: payload,
    });
  },
  remove(id: string) {
    return request<MessageResponse>(`/users/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
