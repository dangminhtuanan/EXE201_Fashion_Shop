import { useEffect, useState } from "react";
import { Hero } from "../components/Hero";
import { ProductCard } from "../components/ProductCard";
import type { Category, Product } from "../types";
import { useCart } from "../contexts/CartContext";
import { toast } from "sonner";
import { categoriesApi, getErrorMessage, productsApi } from "../lib/api";

export function HomePage() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoriesApi.getAll();
        setCategories(response.categories);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await productsApi.getAll({
          category: selectedCategory || undefined,
          limit: 8,
          sort: "newest",
          inStock: true,
        });

        if (!cancelled) {
          setProducts(response.products);
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  const handleAddToCart = async (product: Product) => {
    try {
      await addItem(product, 1);
      toast.success("Da them vao gio hang");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <Hero imageUrl="https://images.unsplash.com/photo-1762430815620-fcca603c240c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwbW9kZWwlMjBydW53YXl8ZW58MXx8fHwxNzczMDY2MzQ4fDA&ixlib=rb-4.1.0&q=80&w=1080" />

      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-4 py-2 rounded-full border transition-colors whitespace-nowrap text-sm ${
                selectedCategory === ""
                  ? "bg-black text-white border-black"
                  : "hover:bg-black hover:text-white"
              }`}
            >
              Tat ca
            </button>
            {categories.map((category) => {
              const value = category.slug || category._id;
              return (
                <button
                  key={category._id}
                  onClick={() => setSelectedCategory(value)}
                  className={`px-4 py-2 rounded-full border transition-colors whitespace-nowrap text-sm ${
                    selectedCategory === value
                      ? "bg-black text-white border-black"
                      : "hover:bg-black hover:text-white"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">San pham noi bat</h2>
          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <div className="aspect-[3/4] rounded-lg bg-gray-100 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-gray-100 animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
              Chua co san pham phu hop.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.productId || product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">Dang ky nhan tin</h2>
          <p className="text-gray-600 mb-6">
            Nhan thong tin ve san pham moi va uu dai dac biet
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email cua ban"
              className="flex-1 px-4 py-3 rounded border focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors">
              Dang ky
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
