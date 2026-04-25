import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  Star,
  Heart,
  Share2,
  ShoppingBag,
  Wand2,
  ChevronRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  Minus,
  Plus,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import type { Product, Review } from "../types";
import { aiApi, getErrorMessage, productsApi, reviewsApi } from "../lib/api";
import { toast } from "sonner";

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function getColorHex(value: string) {
  const normalized = value.toLowerCase();
  const colorMap: Record<string, string> = {
    black: "#111827",
    den: "#111827",
    white: "#f9fafb",
    trang: "#f9fafb",
    blue: "#2563eb",
    xanh: "#2563eb",
    red: "#dc2626",
    do: "#dc2626",
    pink: "#ec4899",
    hong: "#ec4899",
    green: "#16a34a",
    vang: "#facc15",
    yellow: "#facc15",
    gray: "#9ca3af",
    xam: "#9ca3af",
    brown: "#92400e",
    nau: "#92400e",
  };

  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    return value;
  }

  return colorMap[normalized] || "#d1d5db";
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    const loadProduct = async () => {
      setLoading(true);
      setProduct(null);
      setRelatedProducts([]);
      setReviews([]);

      try {
        const response = await productsApi.getById(id);
        const loadedProduct = response.product;

        if (cancelled) {
          return;
        }

        setProduct(loadedProduct);
        setSelectedImage(0);
        setSelectedColor(loadedProduct.colors?.[0] || "");
        setSelectedSize(loadedProduct.sizes?.[0] || "");
        setQuantity(1);

        if (loadedProduct.productId) {
          void aiApi.createBehaviorLog({
            productId: loadedProduct.productId,
            action: "view",
          });

          reviewsApi
            .getProductReviews(loadedProduct.productId)
            .then((reviewResponse) => {
              if (!cancelled) {
                setReviews(reviewResponse.reviews);
              }
            })
            .catch(() => undefined);
        }

        aiApi
          .getRecommendations({
            category: loadedProduct.categoryId,
            limit: 5,
          })
          .then((recommendationResponse) => {
            if (!cancelled) {
              setRelatedProducts(
                recommendationResponse.products
                  .filter(
                    (item) => item.productId !== loadedProduct.productId,
                  )
                  .slice(0, 4),
              );
            }
          })
          .catch(() => undefined);
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const images = useMemo(() => {
    if (!product) {
      return [];
    }

    if (product.images?.length) {
      return product.images;
    }

    return product.image ? [product.image] : ["/favicon.svg"];
  }, [product]);

  const colors = useMemo(() => {
    if (!product?.colors?.length) {
      return [];
    }

    return product.colors.map((color) => ({
      id: color,
      name: color,
      hex: getColorHex(color),
    }));
  }, [product]);

  const sizes = product?.sizes?.length ? product.sizes : [];
  const rating = product?.averageRating || 0;
  const reviewCount = product?.reviewCount || reviews.length;
  const maxQuantity = Math.max(1, Math.min(product?.stock ?? 10, 10));
  const isOutOfStock = product?.stock !== undefined && product.stock <= 0;

  const handleQuantityChange = (delta: number) => {
    const nextQuantity = quantity + delta;
    if (nextQuantity >= 1 && nextQuantity <= maxQuantity) {
      setQuantity(nextQuantity);
    }
  };

  const addCurrentItem = async () => {
    if (!product) {
      return false;
    }

    try {
      await addItem(product, quantity, {
        size: selectedSize,
        color: selectedColor,
      });
      toast.success("Da them san pham vao gio hang");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  const handleBuyNow = async () => {
    const added = await addCurrentItem();
    if (added) {
      navigate("/checkout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-gray-100 animate-pulse" />
            <div className="h-6 w-1/2 rounded bg-gray-100 animate-pulse" />
            <div className="h-40 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Khong tim thay san pham
          </h1>
          <Link to="/" className="text-indigo-600 hover:underline">
            Quay ve trang chu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-900">
              Trang chu
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium truncate">
              {product.name}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 p-4 md:p-8 flex flex-col-reverse md:flex-row gap-4">
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0 md:w-20 scrollbar-hide">
                {images.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-20 md:w-full md:h-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? "border-black"
                        : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    <img
                      src={img || "/favicon.svg"}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <div className="flex-1 relative aspect-[3/4] md:aspect-auto md:h-[600px] bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={images[selectedImage] || "/favicon.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isWishlisted
                        ? "fill-red-500 text-red-500"
                        : "text-gray-600"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-10 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {product.stock && product.stock > 0 ? "Con hang" : "Het hang"}
                </span>
                <button className="text-gray-400 hover:text-gray-600 flex items-center gap-1.5 text-sm">
                  <Share2 className="w-4 h-4" /> Chia se
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`w-4 h-4 ${
                        index < Math.floor(rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {rating.toFixed(1)}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <a
                  href="#reviews"
                  className="text-sm text-gray-500 hover:text-indigo-600 hover:underline"
                >
                  {reviewCount} danh gia
                </a>
              </div>

              <div className="flex items-end gap-3 mb-8">
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through mb-1">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <span className="text-sm font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded mb-1">
                      -{product.discount}%
                    </span>
                  </>
                )}
              </div>

              {colors.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Mau sac:{" "}
                      <span className="text-gray-500 font-normal">
                        {colors.find((color) => color.id === selectedColor)?.name}
                      </span>
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    {colors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColor(color.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          selectedColor === color.id
                            ? "border-black scale-110"
                            : "border-transparent hover:border-gray-300"
                        }`}
                      >
                        <span
                          className="w-8 h-8 rounded-full border border-black/10 shadow-inner"
                          style={{ backgroundColor: color.hex }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Kich thuoc
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                          selectedSize === size
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white text-gray-900 hover:border-gray-300"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  So luong
                </h3>
                <div className="flex items-center w-32 border border-gray-200 rounded-lg bg-gray-50">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black disabled:opacity-50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center font-medium text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= maxQuantity}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-8">
                <div className="flex gap-3">
                  <button
                    onClick={() => void addCurrentItem()}
                    disabled={isOutOfStock}
                    className="flex-1 bg-white border border-black text-black font-semibold py-3.5 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" /> Them vao gio
                  </button>
                  <button
                    onClick={() => void handleBuyNow()}
                    disabled={isOutOfStock}
                    className="flex-1 bg-black text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Mua ngay
                  </button>
                </div>

                <Link
                  to="/use-ai"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3.5 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Wand2 className="w-5 h-5" /> Thu nghiem voi AI
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-y border-gray-100 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Truck className="w-5 h-5 text-gray-400" />
                  Giao hang nhanh
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <RotateCcw className="w-5 h-5 text-gray-400" />
                  Doi tra theo chinh sach
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <ShieldCheck className="w-5 h-5 text-gray-400" />
                  Bao hanh chat luong
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Mo ta san pham
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {product.description || "San pham hien chua co mo ta chi tiet."}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {product.brand && <li>Thuong hieu: {product.brand}</li>}
                  {product.material && <li>Chat lieu: {product.material}</li>}
                  {product.category && <li>Danh muc: {product.category}</li>}
                  <li>Ton kho: {product.stock ?? 0}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Co the ban se thich
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
              {relatedProducts.map((item) => (
                <Link
                  to={`/product/${item.id}`}
                  key={item.productId || item.id}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-3">
                    <img
                      src={item.image || "/favicon.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="text-gray-900 font-medium text-sm mb-1 truncate group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-gray-500 font-semibold">
                    {formatPrice(item.price)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
