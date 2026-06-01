export interface Product {
  id: string;
  _id?: string;
  productId?: string;
  slug?: string;
  name: string;
  category: string;
  categoryId?: string;
  categorySlug?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images?: string[];
  description?: string;
  brand?: string;
  material?: string;
  gender?: "men" | "women" | "unisex" | "kids";
  sizes?: string[];
  colors?: string[];
  stock?: number;
  sold?: number;
  averageRating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
}

export interface CartItem extends Product {
  cartItemId?: string;
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: Pick<Category, "_id" | "name" | "slug"> | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  totalQuantity: number;
}

export interface Review {
  _id: string;
  product: string;
  rating: number;
  comment: string;
  user?: Pick<UserProfile, "_id" | "username" | "avatar">;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  product: string | Product;
  name: string;
  image: string;
  size?: string;
  color?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  items: OrderItem[];
  customerName: string;
  phone: string;
  address: string;
  note?: string;
  status:
    | "pending"
    | "confirmed"
    | "packing"
    | "shipping"
    | "completed"
    | "cancelled"
    | "refunded"
    | "delivery_failed"
    | "returned"
    | "PENDING_PAYMENT"
    | "PAID"
    | "CANCELLED"
    | "FAILED";
  totalAmount: number;
  paymentStatus: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  payment?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export type ShippingStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled";

export interface ShippingUpdate {
  status: string;
  timestamp?: string;
  location?: string;
  notes?: string;
}

export interface ShippingRecord {
  _id: string;
  order: Order;
  shipper?: Pick<UserProfile, "_id" | "username" | "email" | "phone"> | null;
  shippingStatus: ShippingStatus;
  trackingNumber: string;
  shippingMethod: "standard" | "express" | "overnight";
  estimatedDelivery?: string | null;
  actualDelivery?: string | null;
  pickupTime?: string | null;
  notes?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  updates: ShippingUpdate[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Avatar {
  _id: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt?: string;
}

export type UserRole = "user" | "customer" | "admin" | "manager" | "staff" | "shipper";

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
