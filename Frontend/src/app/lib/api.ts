import axios, { type AxiosRequestConfig, type Method } from "axios";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
} from "./auth-storage";
import type {
  AIOutfitHistoryItem,
  AIPackage,
  AITransaction,
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
  Payment,
  PaymentStatus,
  Product,
  RegisterPayload,
  Review,
  ResetPasswordPayload,
  ShippingRecord,
  ShippingStatus,
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

const vietnameseDisplayNames: Record<string, string> = {
  "ao thun": "Áo thun",
  "ao da": "Áo da",
  "ao hoodie": "Áo hoodie",
  "ao so mi": "Áo sơ mi",
  "ao khoac": "Áo khoác",
  "ao polo": "Áo polo",
  "quan jean": "Quần jean",
  "quan jeans": "Quần jean",
  "quan short": "Quần short",
  "quan jogger": "Quần jogger",
  "quan dai": "Quần dài",
  "quan ngan": "Quần ngắn",
  vay: "Váy",
  dam: "Đầm",
  "phu kien": "Phụ kiện",
  balo: "Balo",
};

function normalizeVietnameseDisplayName(value?: string | null) {
  if (!value) {
    return value || "";
  }

  const normalizedKey = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  return vietnameseDisplayNames[normalizedKey] || value;
}

function normalizeCategory(category: Category): Category {
  return {
    ...category,
    name: normalizeVietnameseDisplayName(category.name),
    parent: category.parent
      ? {
          ...category.parent,
          name: normalizeVietnameseDisplayName(category.parent.name),
        }
      : category.parent,
  };
}

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

async function optionalAuthRequest<T>(
  path: string,
  options: Omit<RequestOptions, "auth"> = {},
) {
  const hasAccessToken = Boolean(getStoredAuthSession()?.accessToken);

  try {
    return await request<T>(path, {
      ...options,
      auth: hasAccessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && hasAccessToken && (error.status === 401 || error.status === 403)) {
      return request<T>(path, {
        ...options,
        auth: false,
        retryOnUnauthorized: false,
      });
    }

    throw error;
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

interface PaymentsResponse extends MessageResponse {
  payments: Payment[];
}

interface PaymentResponse extends MessageResponse {
  payment: Payment;
}

export interface RevenueReportParams {
  from?: string;
  to?: string;
  groupBy?: "day" | "month" | "year";
  timezone?: string;
  limitTopProducts?: number;
  limitRecentOrders?: number;
}

export interface RevenueReportResponse extends MessageResponse {
  filters: {
    from: string | null;
    to: string | null;
    groupBy: "day" | "month" | "year";
    timezone: string;
  };
  summary: {
    totalRevenue: number;
    subtotal: number;
    tax: number;
    shippingFee: number;
    orderCount: number;
    itemCount: number;
    averageOrderValue: number;
  };
  timeline: Array<{
    period: string;
    revenue: number;
    orderCount: number;
  }>;
  revenueByStatus: Array<{
    status: Order["status"];
    revenue: number;
    orderCount: number;
  }>;
  revenueByPaymentStatus: Array<{
    paymentStatus: Order["paymentStatus"];
    totalAmount: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    product: string;
    name: string;
    quantity: number;
    revenue: number;
    orderCount: number;
  }>;
  recentOrders: Array<Order & {
    user?: Pick<UserProfile, "_id" | "username" | "email" | "phone">;
  }>;
}

interface AIPackagesResponse extends MessageResponse {
  packages: AIPackage[];
}

interface AICreditsBalanceResponse extends MessageResponse {
  balance: number;
  userId: string;
}

interface AITransactionsResponse extends MessageResponse {
  transactions: AITransaction[];
}

interface AIPurchaseResponse extends MessageResponse {
  transaction: {
    id: string;
    orderCode: number;
    checkoutUrl: string;
    amount: number;
    packageName: string;
  };
}

interface AITransactionResponse extends MessageResponse {
  transaction: AITransaction;
}

interface ShippingListResponse {
  success: boolean;
  data: ShippingRecord[];
}

interface ShippingResponse {
  success: boolean;
  message?: string;
  data: ShippingRecord;
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

interface TryOnResponse extends MessageResponse {
  taskId: string;
  status: string;
  progress: number;
  resultImageUrl?: string;
  recommendation: unknown;
}

interface MixMatchTryOnResponse extends MessageResponse {
  taskId: string;
  status: string;
  progress: number;
  resultImageUrl?: string;
  creditCost: number;
  selectedType: "top" | "bottom";
  targetType: "top" | "bottom";
  selectedProduct: ApiProduct;
  matchedProduct: ApiProduct;
  outfit: {
    top: ApiProduct;
    bottom: ApiProduct;
  };
  steps?: unknown[];
}

interface NormalizedMixMatchTryOnResponse extends Omit<MixMatchTryOnResponse, "selectedProduct" | "matchedProduct" | "outfit"> {
  selectedProduct: Product;
  matchedProduct: Product;
  outfit: {
    top: Product;
    bottom: Product;
  };
}

interface ApiAIOutfitHistoryItem extends Omit<AIOutfitHistoryItem, "product"> {
  product?: ApiProduct | null;
}

interface AIOutfitHistoryResponse extends MessageResponse {
  recommendations: ApiAIOutfitHistoryItem[];
}

interface NormalizedAIOutfitHistoryResponse extends MessageResponse {
  recommendations: AIOutfitHistoryItem[];
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

interface CreateProductPayload {
  name: string;
  category: string;
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
  isFeatured?: boolean;
}

type UpdateProductPayload = Partial<CreateProductPayload> & {
  isActive?: boolean;
};

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

interface TryOnPayload {
  modelImageUrl: string;
  clothingImageUrl?: string;
  productId?: string;
  clothType?: "upper" | "lower" | "full_set" | "combo";
  hdMode?: boolean;
}

interface MixMatchTryOnPayload {
  modelImageUrl: string;
  productId: string;
  modelGender?: Product["gender"];
  hdMode?: boolean;
}

function getCategoryParts(category: ApiProduct["category"]) {
  if (typeof category === "object" && category !== null) {
    const normalizedCategory = normalizeCategory(category);

    return {
      id: normalizedCategory._id,
      name: normalizedCategory.name,
      slug: normalizedCategory.slug,
    };
  }

  if (typeof category === "string") {
    return {
      id: category,
      name: normalizeVietnameseDisplayName(category),
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
    const response = await request<CategoriesResponse>("/categories");

    return {
      ...response,
      categories: response.categories.map(normalizeCategory),
    };
  },
  async getById(id: string) {
    const response = await request<CategoryResponse>(`/categories/${id}`);

    return {
      ...response,
      category: normalizeCategory(response.category),
    };
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
  async create(payload: CreateProductPayload) {
    const response = await request<ProductResponse>("/products", {
      method: "POST",
      auth: true,
      body: payload,
    });

    return {
      ...response,
      product: normalizeProduct(response.product),
    };
  },
  async update(id: string, payload: UpdateProductPayload) {
    const response = await request<ProductResponse>(`/products/${id}`, {
      method: "PUT",
      auth: true,
      body: payload,
    });

    return {
      ...response,
      product: normalizeProduct(response.product),
    };
  },
  remove(id: string) {
    return request<MessageResponse>(`/products/${id}`, {
      method: "DELETE",
      auth: true,
    });
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
  getAll(params: { status?: Order["status"]; paymentStatus?: Order["paymentStatus"] } = {}) {
    return request<OrdersResponse>("/orders", {
      auth: true,
      params,
    });
  },
  getById(id: string) {
    return request<OrderResponse>(`/orders/${id}`, {
      auth: true,
    });
  },
  updateStatus(
    id: string,
    payload: { status?: Order["status"]; paymentStatus?: Order["paymentStatus"] },
  ) {
    return request<OrderResponse>(`/orders/${id}/status`, {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },
  cancel(id: string) {
    return request<OrderResponse>(`/orders/${id}/cancel`, {
      method: "PATCH",
      auth: true,
    });
  },
};

export const paymentsApi = {
  getAll(params: { status?: PaymentStatus; provider?: Payment["provider"] } = {}) {
    return request<PaymentsResponse>("/payments", {
      auth: true,
      params,
    });
  },
  updateStatus(id: string, payload: { status: PaymentStatus; transactionNo?: string }) {
    return request<PaymentResponse>(`/payments/${id}/status`, {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },
};

export const reportsApi = {
  getRevenue(params: RevenueReportParams = {}) {
    return request<RevenueReportResponse>("/reports/revenue", {
      auth: true,
      params,
    });
  },
};

export const aiPackageApi = {
  getPackages() {
    return request<AIPackagesResponse>("/ai-packages/packages");
  },
  getMyBalance() {
    return request<AICreditsBalanceResponse>("/ai-packages/my/balance", {
      auth: true,
    });
  },
  getMyTransactions() {
    return request<AITransactionsResponse>("/ai-packages/my/transactions", {
      auth: true,
    });
  },
  purchase(packageId: string) {
    return request<AIPurchaseResponse>("/ai-packages/purchase", {
      method: "POST",
      auth: true,
      body: { packageId },
    });
  },
  getTransaction(transactionId: string) {
    return request<AITransactionResponse>(`/ai-packages/transaction/${transactionId}`, {
      auth: true,
    });
  },
  useCredits(credits = 1) {
    return request<MessageResponse & { creditsUsed: number; remainingBalance: number }>(
      "/ai-packages/use-credits",
      {
        method: "POST",
        auth: true,
        body: { credits },
      },
    );
  },
};

export const shippingApi = {
  create(payload: { orderId: string; shippingMethod?: "standard" | "express" | "overnight" }) {
    return request<ShippingResponse>("/shipping", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
  getAll(status?: ShippingStatus) {
    return request<ShippingListResponse>("/shipping", {
      auth: true,
      params: status ? { status } : undefined,
    });
  },
  getMyShipments(status?: ShippingStatus) {
    return request<ShippingListResponse>("/shipping/my/shipments", {
      auth: true,
      params: status ? { status } : undefined,
    });
  },
  updateStatus(
    shippingId: string,
    payload: { status: ShippingStatus; location?: string; notes?: string },
  ) {
    return request<ShippingResponse>(`/shipping/${shippingId}/status`, {
      method: "PUT",
      auth: true,
      body: payload,
    });
  },
  cancel(shippingId: string, reason: string) {
    return request<ShippingResponse>(`/shipping/${shippingId}/cancel`, {
      method: "PUT",
      auth: true,
      body: { reason },
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
  update(id: string, payload: Pick<CreateReviewPayload, "rating" | "comment">) {
    return request<ReviewResponse>(`/reviews/${id}`, {
      method: "PUT",
      auth: true,
      body: payload,
    });
  },
  remove(id: string) {
    return request<MessageResponse>(`/reviews/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const aiApi = {
  async chat(payload: ChatPayload) {
    const response = await optionalAuthRequest<ChatResponse>("/ai/chat", {
      method: "POST",
      body: payload,
    });

    return {
      ...response,
      products: response.products.map(normalizeProduct),
    };
  },
  async getRecommendations(params: RecommendationParams = {}) {
    const response = await optionalAuthRequest<RecommendationResponse>("/ai/recommendations", {
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
    return optionalAuthRequest<MessageResponse>("/ai/behavior-logs", {
      method: "POST",
      body: payload,
    });
  },
  createTryOn(payload: TryOnPayload) {
    return optionalAuthRequest<TryOnResponse>("/ai/try-on", {
      method: "POST",
      body: payload,
    });
  },
  async getMyTryOns() {
    const response = await request<AIOutfitHistoryResponse>("/ai/try-ons/my", {
      auth: true,
    });

    return {
      ...response,
      recommendations: response.recommendations.map((item) => ({
        ...item,
        product: item.product ? normalizeProduct(item.product) : null,
      })),
    } satisfies NormalizedAIOutfitHistoryResponse;
  },
  async createMixMatchTryOn(payload: MixMatchTryOnPayload) {
    const response = await optionalAuthRequest<MixMatchTryOnResponse>("/ai/mix-match/try-on", {
      method: "POST",
      body: payload,
    });

    return {
      ...response,
      selectedProduct: normalizeProduct(response.selectedProduct),
      matchedProduct: normalizeProduct(response.matchedProduct),
      outfit: {
        top: normalizeProduct(response.outfit.top),
        bottom: normalizeProduct(response.outfit.bottom),
      },
    } satisfies NormalizedMixMatchTryOnResponse;
  },
  createChatbotLog(payload: {
    question: string;
    answer?: string;
    intent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return optionalAuthRequest<MessageResponse>("/ai/chatbot-logs", {
      method: "POST",
      body: payload,
    });
  },
};
