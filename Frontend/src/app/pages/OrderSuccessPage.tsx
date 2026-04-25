import { Link, useLocation } from 'react-router';
import { CheckCircle, Package, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import type { Order } from '../types';

export function OrderSuccessPage() {
  const location = useLocation();
  const state = location.state as { order?: Order; email?: string } | null;
  const order = state?.order;
  const email = state?.email;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Đặt hàng thành công!
          </h1>
          <p className="text-gray-600 mb-8">
            Cảm ơn bạn đã mua hàng. Chúng tôi đã nhận được đơn hàng và sẽ xử lý trong thời gian sớm nhất.
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <div className="flex items-start gap-3 mb-4">
              <Package className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 mb-1">Mã đơn hàng</p>
                <p className="font-semibold text-gray-900">
                  {order?._id ? `#${order._id.slice(-8).toUpperCase()}` : '--'}
                </p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 mb-2">Email xác nhận đã được gửi đến:</p>
              <p className="font-medium text-gray-900">{email || '--'}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4">Tiếp theo sẽ diễn ra gì?</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Xác nhận đơn hàng</p>
                  <p className="text-xs text-gray-600">Chúng tôi sẽ xác nhận đơn hàng qua email/SMS</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Đóng gói & vận chuyển</p>
                  <p className="text-xs text-gray-600">Đơn hàng sẽ được giao trong 2-3 ngày</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Nhận hàng</p>
                  <p className="text-xs text-gray-600">Kiểm tra và thanh toán (nếu COD)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link to="/" className="block">
              <Button className="w-full bg-black text-white hover:bg-gray-800 py-6 text-base font-semibold rounded-xl">
                <Home className="w-5 h-5 mr-2" />
                Về trang chủ
              </Button>
            </Link>
            <a href="#" className="block text-center text-gray-600 hover:text-gray-900 text-sm font-medium">
              Theo dõi đơn hàng
            </a>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-2">Cần hỗ trợ?</p>
          <div className="flex justify-center gap-4">
            <a href="#" className="text-sm text-blue-600 hover:underline">Liên hệ hotline</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="text-sm text-blue-600 hover:underline">Chat với chúng tôi</a>
          </div>
        </div>
      </div>
    </div>
  );
}
