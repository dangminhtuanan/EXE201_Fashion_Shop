import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, Clock, Home, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getErrorMessage, ordersApi } from '../lib/api';

type PaymentResultMode = 'return' | 'cancel';

interface PaymentState {
  paymentStatus: string;
  orderStatus?: string;
  amount: number;
  orderId?: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

export function PaymentResultPage({ mode }: { mode: PaymentResultMode }) {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get('orderCode') || searchParams.get('orderCode'.toLowerCase());
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(orderCode));

  useEffect(() => {
    if (!orderCode) {
      setError('Không tìm thấy mã giao dịch PayOS.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadPaymentStatus = async () => {
      try {
        const response = await ordersApi.getPaymentStatus(orderCode);

        if (!cancelled) {
          setPayment({
            paymentStatus: response.paymentStatus,
            orderStatus: response.orderStatus,
            amount: response.amount,
            orderId: response.orderId,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPaymentStatus();

    return () => {
      cancelled = true;
    };
  }, [orderCode]);

  const isPaid = payment?.paymentStatus === 'PAID' || payment?.paymentStatus === 'paid';
  const isCancelled = mode === 'cancel' || payment?.paymentStatus === 'CANCELLED';
  const title = isLoading
    ? 'Đang kiểm tra thanh toán'
    : isPaid
      ? 'Thanh toán thành công'
      : isCancelled
        ? 'Thanh toán đã hủy'
        : 'Thanh toán đang chờ xử lý';
  const description = isPaid
    ? 'PayOS đã xác nhận giao dịch. Đơn hàng của bạn đang được xử lý.'
    : isCancelled
      ? 'Bạn đã hủy thanh toán PayOS. Đơn hàng chưa được thanh toán.'
      : 'Nếu bạn đã chuyển khoản, hệ thống sẽ cập nhật khi PayOS xác nhận giao dịch.';

  const Icon = isPaid ? CheckCircle : isCancelled ? XCircle : Clock;
  const iconClass = isPaid
    ? 'bg-green-100 text-green-600'
    : isCancelled
      ? 'bg-red-100 text-red-600'
      : 'bg-amber-100 text-amber-600';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${iconClass}`}>
          <Icon className="w-12 h-12" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-8">{isLoading ? 'Vui lòng chờ trong giây lát.' : description}</p>

        <div className="bg-gray-50 rounded-xl p-5 mb-8 text-left space-y-3">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-gray-500">Mã PayOS</span>
            <span className="text-sm font-semibold text-gray-900">{orderCode || '--'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-gray-500">Trạng thái</span>
            <span className="text-sm font-semibold text-gray-900">
              {isLoading ? 'Đang tải...' : payment?.paymentStatus || '--'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-gray-500">Số tiền</span>
            <span className="text-sm font-semibold text-gray-900">
              {payment ? formatPrice(payment.amount) : '--'}
            </span>
          </div>
          {error && <p className="text-sm text-red-600 pt-2">{error}</p>}
        </div>

        <div className="space-y-3">
          <Link to="/" className="block">
            <Button className="w-full bg-black text-white hover:bg-gray-800 py-6 text-base font-semibold rounded-xl">
              <Home className="w-5 h-5 mr-2" />
              Về trang chủ
            </Button>
          </Link>
          {!isPaid && (
            <Link to="/checkout" className="block text-center text-gray-600 hover:text-gray-900 text-sm font-medium">
              Quay lại thanh toán
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
