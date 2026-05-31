import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, CreditCard, Wallet, Building2, Check, QrCode } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { getErrorMessage, ordersApi } from '../lib/api';
import { toast } from 'sonner';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { isAuthenticated, isHydrating, user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    ward: '',
    note: '',
  });

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  useEffect(() => {
    if (!isHydrating && !isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' }, replace: true });
    }
  }, [isAuthenticated, isHydrating, navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fullName: prev.fullName || user.username || '',
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
      address: prev.address || user.address || '',
    }));
  }, [user]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const estimatedTax = totalPrice * 0.1;
  const shipping = totalPrice > 500000 ? 0 : 30000;
  const finalTotal = totalPrice + estimatedTax + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const shippingAddress = [
      formData.address,
      formData.ward,
      formData.district,
      formData.city,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      if (paymentMethod === 'payos') {
        if (!formData.email.trim()) {
          toast.error('Vui lòng nhập email để thanh toán qua PayOS');
          return;
        }

        const response = await ordersApi.createPayOSCheckout({
          customerName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: shippingAddress,
          note: formData.note.trim(),
        });

        await clearCart();
        window.location.assign(response.checkoutUrl);
        return;
      }

      const paymentProvider =
        paymentMethod === 'bank'
          ? 'bank_transfer'
          : paymentMethod === 'card'
            ? 'stripe'
            : 'cod';

      const response = await ordersApi.create({
        customerName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: shippingAddress,
        note: formData.note.trim(),
        paymentProvider,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
      });

      await clearCart();
      navigate('/order-success', {
        state: {
          order: response.order,
          email: formData.email,
        },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 || isHydrating || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/cart" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại giỏ hàng
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Thanh toán</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Contact Information */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Thông tin liên hệ</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Họ và tên *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Nguyễn Văn A"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Số điện thoại *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="0123456789"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Địa chỉ giao hàng</h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">Tỉnh/Thành phố *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Hà Nội"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="district">Quận/Huyện *</Label>
                      <Input
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        placeholder="Hoàn Kiếm"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ward">Phường/Xã *</Label>
                      <Input
                        id="ward"
                        name="ward"
                        value={formData.ward}
                        onChange={handleInputChange}
                        placeholder="Hàng Bài"
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Địa chỉ cụ thể *</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Số nhà, tên đường..."
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="note">Ghi chú đơn hàng (tùy chọn)</Label>
                    <textarea
                      id="note"
                      name="note"
                      value={formData.note}
                      onChange={handleInputChange}
                      placeholder="Ghi chú về đơn hàng, ví dụ: giao hàng vào giờ hành chính..."
                      rows={3}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Phương thức thanh toán</h2>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    <label
                      htmlFor="payos"
                      className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === 'payos' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="payos" id="payos" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-cyan-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Thanh toán PayOS</p>
                            <p className="text-sm text-gray-500">Quét QR hoặc thanh toán qua ngân hàng</p>
                          </div>
                        </div>
                      </div>
                      {paymentMethod === 'payos' && (
                        <Check className="w-5 h-5 text-black" />
                      )}
                    </label>

                    <label
                      htmlFor="cod"
                      className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === 'cod' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="cod" id="cod" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-green-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Thanh toán khi nhận hàng (COD)</p>
                            <p className="text-sm text-gray-500">Thanh toán bằng tiền mặt khi nhận hàng</p>
                          </div>
                        </div>
                      </div>
                      {paymentMethod === 'cod' && (
                        <Check className="w-5 h-5 text-black" />
                      )}
                    </label>

                    <label
                      htmlFor="bank"
                      className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === 'bank' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="bank" id="bank" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Chuyển khoản ngân hàng</p>
                            <p className="text-sm text-gray-500">Chuyển khoản qua Internet Banking</p>
                          </div>
                        </div>
                      </div>
                      {paymentMethod === 'bank' && (
                        <Check className="w-5 h-5 text-black" />
                      )}
                    </label>

                    <label
                      htmlFor="card"
                      className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === 'card' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="card" id="card" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-purple-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Thẻ tín dụng/ghi nợ</p>
                            <p className="text-sm text-gray-500">Visa, Mastercard, JCB</p>
                          </div>
                        </div>
                      </div>
                      {paymentMethod === 'card' && (
                        <Check className="w-5 h-5 text-black" />
                      )}
                    </label>
                  </div>
                </RadioGroup>

                {paymentMethod === 'payos' && (
                  <div className="mt-4 p-4 bg-cyan-50 rounded-lg border border-cyan-100">
                    <p className="text-sm text-cyan-900 font-medium mb-1">Thanh toán qua PayOS</p>
                    <p className="text-sm text-cyan-800">
                      Sau khi bấm thanh toán, bạn sẽ được chuyển sang cổng PayOS để quét QR hoặc chuyển khoản.
                    </p>
                  </div>
                )}

                {paymentMethod === 'bank' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-900 font-medium mb-2">Thông tin chuyển khoản:</p>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>Ngân hàng: <span className="font-semibold">Vietcombank</span></p>
                      <p>Số tài khoản: <span className="font-semibold">1234567890</span></p>
                      <p>Chủ tài khoản: <span className="font-semibold">FASHION STORE</span></p>
                      <p>Nội dung: <span className="font-semibold">Họ tên + Số điện thoại</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Đơn hàng của bạn</h2>
                
                {/* Order Items */}
                <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span className="font-medium text-gray-900">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Thuế VAT (10%)</span>
                    <span className="font-medium text-gray-900">{formatPrice(estimatedTax)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển</span>
                    <span className="font-medium text-gray-900">
                      {shipping === 0 ? (
                        <span className="text-green-600 font-semibold">Miễn phí</span>
                      ) : (
                        formatPrice(shipping)
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold text-gray-900">Tổng cộng</span>
                  <span className="text-2xl font-bold text-gray-900">{formatPrice(finalTotal)}</span>
                </div>

                <Button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full bg-black text-white hover:bg-gray-800 py-6 text-base font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing
                    ? 'Đang xử lý...'
                    : paymentMethod === 'payos'
                      ? 'Thanh toán qua PayOS'
                      : 'Hoàn tất đơn hàng'}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Bằng cách đặt hàng, bạn đồng ý với{' '}
                  <a href="#" className="text-black hover:underline">Điều khoản dịch vụ</a>
                  {' '}và{' '}
                  <a href="#" className="text-black hover:underline">Chính sách bảo mật</a>
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
