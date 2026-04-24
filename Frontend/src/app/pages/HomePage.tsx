import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';

export function HomePage() {
  const { addItem } = useCart();

  // Mock products data
  const products: Product[] = [
    {
      id: '1',
      name: 'Áo Sơ Mi Oversized',
      category: 'Áo Nữ',
      price: 599000,
      image: 'https://images.unsplash.com/photo-1768289222368-62cbdfe7d5f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwd29tYW4lMjBzdHlsaXNoJTIwb3V0Zml0fGVufDF8fHx8MTc3MzA2NjM0NXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      id: '2',
      name: 'Áo Polo Nam',
      category: 'Áo Nam',
      price: 450000,
      originalPrice: 650000,
      discount: 30,
      image: 'https://images.unsplash.com/photo-1665832102556-ba212924f541?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwbWFuJTIwY2FzdWFsJTIwd2VhcnxlbnwxfHx8fDE3NzMwNjYzNDZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      id: '3',
      name: 'Túi Xách Da Cao Cấp',
      category: 'Phụ Kiện',
      price: 1250000,
      image: 'https://images.unsplash.com/photo-1575201046471-082b5c1a1e79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwYWNjZXNzb3JpZXMlMjBoYW5kYmFnfGVufDF8fHx8MTc3Mjk5MTcyMHww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      id: '4',
      name: 'Giày Sneaker Trắng',
      category: 'Giày Dép',
      price: 890000,
      originalPrice: 1200000,
      discount: 25,
      image: 'https://images.unsplash.com/photo-1650320079970-b4ee8f0dae33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc25lYWtlcnMlMjBzaG9lc3xlbnwxfHx8fDE3NzI5NTQwMzl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      id: '5',
      name: 'Áo Khoác Denim',
      category: 'Áo Khoác',
      price: 750000,
      image: 'https://images.unsplash.com/photo-1727516299214-c4d54704b045?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwamFja2V0JTIwY2xvdGhpbmd8ZW58MXx8fHwxNzczMDMxNTAyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      id: '6',
      name: 'Đầm Dạ Hội Sang Trọng',
      category: 'Váy Đầm',
      price: 1850000,
      image: 'https://images.unsplash.com/photo-1764265148862-7ee72a4fb367?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwZHJlc3MlMjBlbGVnYW50fGVufDF8fHx8MTc3MzA2MTM0MHww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      id: '7',
      name: 'Áo Blazer Công Sở',
      category: 'Áo Vest',
      price: 950000,
      originalPrice: 1400000,
      discount: 32,
      image: 'https://images.unsplash.com/photo-1762430815620-fcca603c240c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwbW9kZWwlMjBydW53YXl8ZW58MXx8fHwxNzczMDY2MzQ4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      id: '8',
      name: 'Kính Mát Thời Trang',
      category: 'Phụ Kiện',
      price: 380000,
      image: 'https://images.unsplash.com/photo-1771736816565-c17e3c12c3d3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc3VuZ2xhc3NlcyUyMGFjY2Vzc29yaWVzfGVufDF8fHx8MTc3MzA2NjM0OHww&ixlib=rb-4.1.0&q=80&w=1080',
    },
  ];

  const handleAddToCart = (product: Product) => {
    addItem(product, 1);
    toast.success('Đã thêm vào giỏ hàng');
  };

  return (
    <>
      <Hero imageUrl="https://images.unsplash.com/photo-1762430815620-fcca603c240c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwbW9kZWwlMjBydW53YXl8ZW58MXx8fHwxNzczMDY2MzQ4fDA&ixlib=rb-4.1.0&q=80&w=1080" />

      {/* Categories */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {['Tất Cả', 'Áo Nữ', 'Áo Nam', 'Váy Đầm', 'Phụ Kiện', 'Giày Dép'].map((category) => (
              <button
                key={category}
                className="px-4 py-2 rounded-full border hover:bg-black hover:text-white transition-colors whitespace-nowrap text-sm"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Sản Phẩm Nổi Bật</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">Đăng Ký Nhận Tin</h2>
          <p className="text-gray-600 mb-6">
            Nhận thông tin về các sản phẩm mới và ưu đãi đặc biệt
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email của bạn"
              className="flex-1 px-4 py-3 rounded border focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors">
              Đăng Ký
            </button>
          </div>
        </div>
      </section>
    </>
  );
}