import axios, { type AxiosRequestConfig, type Method } from "axios";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
} from "./auth-storage";
import type {
  AuthSession,
  CartItem,
  CartSummary,
  Category,
  ChangePasswordPayload,
  CreateUserPayload,
  LoginPayload,
  Order,
  OtpPayload,
  Pagination,
  Product,
  RegisterPayload,
  Review,
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

type RequestBody = FormData | object | string | null;

interface RequestOptions
  extends Omit<
    AxiosRequestConfig,
    "url" | "baseURL" | "data" | "headers" | "method" | "auth"
  > {
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

      if ((status === 401 || status === 403) && auth && retryOnUnauthorized) {
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

type ApiCategory = Category;

interface ApiProduct {
  _id: string;
  slug?: string;
  name: string;
  category?: ApiCategory | string | null;
  description?: string;
  price: number;
  originalPrice?: number;
  images?: string[];
  brand?: string;
  material?: string;
  gender?: Product["gender"];
  sizes?: string[];
  colors?: string[];
  stock?: number;
  sold?: number;
  averageRating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
}

interface ApiCartItem {
  _id: string;
  product: ApiProduct | null;
  size?: string;
  color?: string;
  quantity: number;
}

interface ApiCartSummary {
  items: ApiCartItem[];
  subtotal: number;
  totalQuantity: number;
}

interface ProductsResponse extends MessageResponse {
  products: ApiProduct[];
  pagination: Pagination;
}

interface ProductResponse extends MessageResponse {
  product: ApiProduct;
}

interface CategoriesResponse extends MessageResponse {
  categories: Category[];
}

interface CategoryResponse extends MessageResponse {
  category: Category;
}

interface CartResponse extends MessageResponse {
  cart: ApiCartSummary;
}

interface OrdersResponse extends MessageResponse {
  orders: Order[];
}

interface OrderResponse extends MessageResponse {
  order: Order;
}

interface PayOSCheckoutResponse extends MessageResponse {
  checkoutUrl: string;
  orderCode: number;
  orderId: string;
}

interface PaymentStatusResponse extends MessageResponse {
  orderCode: number;
  paymentStatus: string;
  orderStatus?: string;
  amount: number;
  orderId?: string;
}

interface ReviewsResponse extends MessageResponse {
  reviews: Review[];
}

interface ReviewResponse extends MessageResponse {
  review: Review;
}

interface RecommendationResponse extends MessageResponse {
  products: ApiProduct[];
}

interface ChatResponse extends MessageResponse {
  answer: string;
  products: ApiProduct[];
}

interface UploadImageResponse extends MessageResponse {
  url: string;
  public_id: string;
}

interface ProductListParams {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
  gender?: Product["gender"];
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "price_asc" | "price_desc" | "rating" | "sold" | "newest";
}

interface CartItemPayload {
  productId: string;
  quantity?: number;
  size?: string;
  color?: string;
}

interface CreateOrderPayload {
  items?: CartItemPayload[];
  customerName: string;
  email?: string;
  phone: string;
  address: string;
  note?: string;
  paymentProvider?: "cod" | "momo" | "vnpay" | "bank_transfer" | "stripe" | "paypal" | "PAYOS";
}

interface CreateReviewPayload {
  productId: string;
  rating: number;
  comment?: string;
  orderId?: string | null;
}

interface RecommendationParams {
  limit?: number;
  category?: string;
  q?: string;
}

interface ChatPayload {
  question: string;
  limit?: number;
}

function getCategoryParts(category: ApiProduct["category"]) {
  if (typeof category === "object" && category !== null) {
    return {
      id: category._id,
      name: category.name,
      slug: category.slug,
    };
  }

  if (typeof category === "string") {
    return {
      id: category,
      name: category,
      slug: undefined,
    };
  }

  return {
    id: undefined,
    name: "",
    slug: undefined,
  };
}

export function normalizeProduct(product: ApiProduct): Product {
  const category = getCategoryParts(product.category);
  const images = (product.images || []).map(resolveAssetUrl).filter(Boolean);
  const originalPrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : undefined;

  return {
    id: product.slug || product._id,
    _id: product._id,
    productId: product._id,
    slug: product.slug,
    name: product.name,
    category: category.name,
    categoryId: category.id,
    categorySlug: category.slug,
    price: product.price,
    originalPrice,
    discount: originalPrice
      ? Math.round((1 - product.price / originalPrice) * 100)
      : undefined,
    image: images[0] || "",
    images,
    description: product.description,
    brand: product.brand,
    material: product.material,
    gender: product.gender,
    sizes: product.sizes || [],
    colors: product.colors || [],
    stock: product.stock,
    sold: product.sold,
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
  };
}

function normalizeCart(cart: ApiCartSummary): CartSummary {
  const items = cart.items
    .map((item): CartItem | null => {
      if (!item.product) {
        return null;
      }

      const product = normalizeProduct(item.product);

      return {
        ...product,
        id: item._id,
        cartItemId: item._id,
        productId: item.product._id,
        quantity: item.quantity,
        size: item.size || "",
        color: item.color || "",
      };
    })
    .filter((item): item is CartItem => Boolean(item));

  return {
    items,
    subtotal: cart.subtotal,
    totalQuantity: cart.totalQuantity,
  };
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

export const categoriesApi = {
  async getAll() {
    return request<CategoriesResponse>("/categories");
  },
  async getById(id: string) {
    return request<CategoryResponse>(`/categories/${id}`);
  },
};

export const productsApi = {
  async getAll(params: ProductListParams = {}) {
    const response = await request<ProductsResponse>("/products", {
      params,
    });

    return {
      ...response,
      products: response.products.map(normalizeProduct),
    };
  },
  async getById(id: string) {
    const response = await request<ProductResponse>(`/products/${id}`);

    return {
      ...response,
      product: normalizeProduct(response.product),
    };
  },
};

export const uploadApi = {
  uploadImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    return request<UploadImageResponse>("/upload", {
      method: "POST",
      body: formData,
    });
  },
};

export const cartApi = {
  async get() {
    const response = await request<CartResponse>("/cart", {
      auth: true,
    });

    return {
      ...response,
      cart: normalizeCart(response.cart),
    };
  },
  async addItem(payload: CartItemPayload) {
    const response = await request<CartResponse>("/cart/items", {
      method: "POST",
      auth: true,
      body: payload,
    });

    return {
      ...response,
      cart: normalizeCart(response.cart),
    };
  },
  async updateItem(id: string, quantity: number) {
    const response = await request<CartResponse>(`/cart/items/${id}`, {
      method: "PUT",
      auth: true,
      body: { quantity },
    });

    return {
      ...response,
      cart: normalizeCart(response.cart),
    };
  },
  async removeItem(id: string) {
    const response = await request<CartResponse>(`/cart/items/${id}`, {
      method: "DELETE",
      auth: true,
    });

    return {
      ...response,
      cart: normalizeCart(response.cart),
    };
  },
  async clear() {
    const response = await request<CartResponse>("/cart", {
      method: "DELETE",
      auth: true,
    });

    return {
      ...response,
      cart: normalizeCart(response.cart),
    };
  },
};

export const ordersApi = {
  create(payload: CreateOrderPayload) {
    return request<OrderResponse>("/orders", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
  createPayOSCheckout(payload: Omit<CreateOrderPayload, "items" | "paymentProvider">) {
    return request<PayOSCheckoutResponse>("/orders/checkout", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
  getPaymentStatus(orderCode: number | string) {
    return request<PaymentStatusResponse>(`/orders/payment-status/${orderCode}`);
  },
  getMy() {
    return request<OrdersResponse>("/orders/my", {
      auth: true,
    });
  },
  getById(id: string) {
    return request<OrderResponse>(`/orders/${id}`, {
      auth: true,
    });
  },
  cancel(id: string) {
    return request<OrderResponse>(`/orders/${id}/cancel`, {
      method: "PATCH",
      auth: true,
    });
  },
};

export const reviewsApi = {
  getProductReviews(productId: string) {
    return request<ReviewsResponse>(`/reviews/product/${productId}`);
  },
  create(payload: CreateReviewPayload) {
    return request<ReviewResponse>("/reviews", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
};

export const aiApi = {
  async chat(payload: ChatPayload) {
    const response = await request<ChatResponse>("/ai/chat", {
      method: "POST",
      auth: true,
      body: payload,
    });

    return {
      ...response,
      products: response.products.map(normalizeProduct),
    };
  },
  async getRecommendations(params: RecommendationParams = {}) {
    const response = await request<RecommendationResponse>("/ai/recommendations", {
      auth: true,
      params,
    });

    return {
      ...response,
      products: response.products.map(normalizeProduct),
    };
  },
  createBehaviorLog(payload: {
    productId?: string;
    product?: string;
    action?: string;
    keyword?: string;
    metadata?: Record<string, unknown>;
  }) {
    return request<MessageResponse>("/ai/behavior-logs", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
  createChatbotLog(payload: {
    question: string;
    answer?: string;
    intent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return request<MessageResponse>("/ai/chatbot-logs", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
};
