export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Avatar {
  _id: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt?: string;
}

export type UserRole = "user" | "admin";

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  refreshToken?: string | null;
  isActive: boolean;
  avatar?: Avatar | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  profile: UserProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface OtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload extends OtpPayload {
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfilePayload {
  username?: string;
  phone?: string;
  address?: string;
}

export interface ChangePasswordPayload {
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  address?: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  address?: string;
}
