import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, cartApi } from "../lib/api";
import type { CartItem, Product } from "../types";
import { useAuth } from "./AuthContext";

const CART_STORAGE_KEY = "outfio-cart";

interface CartContextType {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    options?: { size?: string; color?: string },
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isSyncing: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readGuestCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as CartItem[];
  } catch {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

function writeGuestCart(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function clearGuestCart() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CART_STORAGE_KEY);
}

function getProductId(product: Product) {
  return product.productId || product._id || product.id;
}

function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function buildGuestCartItem(
  product: Product,
  quantity: number,
  options: { size?: string; color?: string } = {},
): CartItem {
  const productId = getProductId(product);
  const size = options.size || "";
  const color = options.color || "";
  const id = [productId, size, color].filter(Boolean).join(":");

  return {
    ...product,
    id,
    productId,
    quantity,
    size,
    color,
  };
}

function isSameCartVariant(
  item: CartItem,
  product: Product,
  options: { size?: string; color?: string } = {},
) {
  return (
    item.productId === getProductId(product) &&
    (item.size || "") === (options.size || "") &&
    (item.color || "") === (options.color || "")
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => readGuestCart());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCart = async () => {
    if (!isAuthenticated) {
      setItems(readGuestCart());
      return;
    }

    try {
      const response = await cartApi.get();
      setItems(response.cart.items);
    } catch (error) {
      if (isAuthError(error)) {
        setItems(readGuestCart());
        return;
      }

      throw error;
    }
  };

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    let cancelled = false;

    const syncCart = async () => {
      if (!isAuthenticated) {
        setItems(readGuestCart());
        return;
      }

      setIsSyncing(true);
      try {
        const guestItems = readGuestCart();

        for (const item of guestItems) {
          try {
            await cartApi.addItem({
              productId: item.productId,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
            });
          } catch {
            // Ignore stale guest-cart rows whose products no longer exist.
          }
        }

        if (guestItems.length > 0) {
          clearGuestCart();
        }

        try {
          const response = await cartApi.get();
          if (!cancelled) {
            setItems(response.cart.items);
          }
        } catch (error) {
          if (!cancelled && isAuthError(error)) {
            setItems(readGuestCart());
            return;
          }

          throw error;
        }
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
        }
      }
    };

    void syncCart();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrating]);

  useEffect(() => {
    if (!isAuthenticated) {
      writeGuestCart(items);
    }
  }, [isAuthenticated, items]);

  const addItem = async (
    product: Product,
    quantity: number = 1,
    options: { size?: string; color?: string } = {},
  ) => {
    if (isAuthenticated) {
      const response = await cartApi.addItem({
        productId: getProductId(product),
        quantity,
        size: options.size,
        color: options.color,
      });
      setItems(response.cart.items);
      return;
    }

    setItems((prevItems) => {
      const existingItem = prevItems.find((item) =>
        isSameCartVariant(item, product, options),
      );

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [...prevItems, buildGuestCartItem(product, quantity, options)];
    });
  };

  const removeItem = async (id: string) => {
    if (isAuthenticated) {
      const response = await cartApi.removeItem(id);
      setItems(response.cart.items);
      return;
    }

    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id);
      return;
    }

    if (isAuthenticated) {
      const response = await cartApi.updateItem(id, quantity);
      setItems(response.cart.items);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      const response = await cartApi.clear();
      setItems(response.cart.items);
      return;
    }

    clearGuestCart();
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        totalItems,
        totalPrice,
        isSyncing,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
