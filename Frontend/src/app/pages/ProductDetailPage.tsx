import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
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
  Plus
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';

const PRODUCT = {
  id: '1',
  name: 'Áo Khoác Denim Nữ Cao Cấp Dáng Rộng',
  price: 890000,
  originalPrice: 1200000,
  rating: 4.8,
  reviews: 124,
  description: 'Áo khoác denim form rộng thoải mái, chất liệu bò cotton cao cấp mềm mịn không phai màu. Thiết kế cổ bẻ cổ điển với những đường may nổi bật tinh tế. Phù hợp cho nhiều dịp, dễ dàng phối cùng nhiều loại trang phục khác nhau.',
  colors: [
    { id: 'c1', name: 'Xanh nhạt', hex: '#87CEEB' },
    { id: 'c2', name: 'Xanh đậm', hex: '#4169E1' },
    { id: 'c3', name: 'Đen', hex: '#2C2C2C' },
  ],
  sizes: ['S', 'M', 'L', 'XL'],
  images: [
    'https://images.unsplash.com/photo-1708523842501-800cd1c7505e?auto=format&fit=crop&q=80&w=600&h=800',
    'https://images.unsplash.com/photo-1621198059871-0d5f9b449233?auto=format&fit=crop&q=80&w=600&h=800',
    'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&q=80&w=600&h=800',
    'https://images.unsplash.com/photo-1527332042004-0b1a4d8646a3?auto=format&fit=crop&q=80&w=600&h=800',
  ],
};

const RELATED_PRODUCTS = [
  {
    id: '2',
    name: 'Áo Thun Basic Cotton Trắng',
    price: 250000,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=300&h=400',
  },
  {
    id: '3',
    name: 'Quần Jeans Ống Suông Nữ',
    price: 450000,
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=300&h=400',
  },
  {
    id: '4',
    name: 'Chân Váy Chữ A Dáng Ngắn',
    price: 320000,
    image: 'https://images.unsplash.com/photo-1583496923485-f5db81186a51?auto=format&fit=crop&q=80&w=300&h=400',
  },
  {
    id: '5',
    name: 'Áo Sơ Mi Lụa Cổ V',
    price: 380000,
    image: 'https://images.unsplash.com/photo-1604695573706-53170668f6a6?auto=format&fit=crop&q=80&w=300&h=400',
  },
];

export function ProductDetailPage() {
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(PRODUCT.colors[0].id);
  const [selectedSize, setSelectedSize] = useState(PRODUCT.sizes[1]);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    addItem({
      id: PRODUCT.id,
      name: PRODUCT.name,
      price: PRODUCT.price,
      category: 'Áo khoác',
      image: PRODUCT.images[selectedImage],
    }, quantity);
    toast.success('Đã thêm sản phẩm vào giỏ hàng!');
  };

  return (
    <div className="bg-gray-50 pb-16">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-900">Trang chủ</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/category/women" className="hover:text-gray-900">Nữ</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/category/women/jackets" className="hover:text-gray-900">Áo khoác</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium truncate">{PRODUCT.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            
            {/* Left Column: Images */}
            <div className="w-full md:w-1/2 p-4 md:p-8 flex flex-col-reverse md:flex-row gap-4">
              {/* Thumbnails */}
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0 md:w-20 scrollbar-hide">
                {PRODUCT.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-20 md:w-full md:h-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-black' : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <img src={img} alt={`${PRODUCT.name} thumbnail ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              
              {/* Main Image */}
              <div className="flex-1 relative aspect-[3/4] md:aspect-auto md:h-[600px] bg-gray-100 rounded-xl overflow-hidden">
                <img 
                  src={PRODUCT.images[selectedImage]} 
                  alt={PRODUCT.name} 
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>
              </div>
            </div>

            {/* Right Column: Product Info */}
            <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-10 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">Mới</span>
                <button className="text-gray-400 hover:text-gray-600 flex items-center gap-1.5 text-sm">
                  <Share2 className="w-4 h-4" /> Chia sẻ
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{PRODUCT.name}</h1>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(PRODUCT.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                  <span className="ml-2 text-sm font-medium text-gray-700">{PRODUCT.rating}</span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <a href="#reviews" className="text-sm text-gray-500 hover:text-indigo-600 hover:underline">
                  {PRODUCT.reviews} đánh giá
                </a>
              </div>

              <div className="flex items-end gap-3 mb-8">
                <span className="text-3xl font-bold text-gray-900">{formatPrice(PRODUCT.price)}</span>
                {PRODUCT.originalPrice > PRODUCT.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through mb-1">{formatPrice(PRODUCT.originalPrice)}</span>
                    <span className="text-sm font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded mb-1">
                      -{Math.round((1 - PRODUCT.price / PRODUCT.originalPrice) * 100)}%
                    </span>
                  </>
                )}
              </div>

              {/* Color Selection */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    Màu sắc: <span className="text-gray-500 font-normal">{PRODUCT.colors.find(c => c.id === selectedColor)?.name}</span>
                  </h3>
                </div>
                <div className="flex gap-3">
                  {PRODUCT.colors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        selectedColor === color.id ? 'border-black scale-110' : 'border-transparent hover:border-gray-300'
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

              {/* Size Selection */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Kích thước</h3>
                  <button className="text-sm text-indigo-600 hover:underline">Hướng dẫn chọn size</button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {PRODUCT.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        selectedSize === size 
                          ? 'border-black bg-black text-white' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Số lượng</h3>
                <div className="flex items-center w-32 border border-gray-200 rounded-lg bg-gray-50">
                  <button 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black disabled:opacity-50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center font-medium text-gray-900">{quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 10}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mb-8">
                <div className="flex gap-3">
                  <button 
                    onClick={handleAddToCart}
                    className="flex-1 bg-white border border-black text-black font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" /> Thêm vào giỏ
                  </button>
                  <button className="flex-1 bg-black text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-colors">
                    Mua ngay
                  </button>
                </div>
                
                {/* AI Feature Button */}
                <Link to="/use-ai" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3.5 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                  <Wand2 className="w-5 h-5" /> Thử nghiệm với AI
                </Link>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-y border-gray-100 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Truck className="w-5 h-5 text-gray-400" />
                  Giao hàng miễn phí toàn quốc
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <RotateCcw className="w-5 h-5 text-gray-400" />
                  Đổi trả miễn phí 30 ngày
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <ShieldCheck className="w-5 h-5 text-gray-400" />
                  Bảo hành chất lượng 1 năm
                </div>
              </div>

              {/* Description Dropdown (mocked as open) */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Mô tả sản phẩm</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {PRODUCT.description}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Chất liệu: 100% Cotton Denim</li>
                  <li>Form: Oversize</li>
                  <li>Hướng dẫn giặt: Giặt máy nước lạnh, không dùng chất tẩy mạnh</li>
                  <li>Xuất xứ: Việt Nam</li>
                </ul>
              </div>

            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Có thể bạn sẽ thích</h2>
            <Link to="/category/women/jackets" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1">
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {RELATED_PRODUCTS.map(product => (
              <Link to={`/product/${product.id}`} key={product.id} className="group flex flex-col">
                <div className="relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-3">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                    <button className="bg-white text-black font-medium text-sm px-6 py-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform w-full shadow-lg">
                      Xem nhanh
                    </button>
                  </div>
                </div>
                <h3 className="text-gray-900 font-medium text-sm mb-1 truncate group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                <p className="text-gray-500 font-semibold">{formatPrice(product.price)}</p>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}