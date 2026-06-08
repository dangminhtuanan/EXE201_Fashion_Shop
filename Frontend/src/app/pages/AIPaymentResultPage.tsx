import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle, Clock, Coins, Home, PackageCheck, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { aiPackageApi, getErrorMessage } from "../lib/api";
import type { AITransaction } from "../types";

type AIPaymentResultMode = "return" | "cancel";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const packageNameOf = (transaction?: AITransaction | null) => {
  if (transaction && typeof transaction.package === "object" && transaction.package !== null) {
    return transaction.package.name;
  }

  return "Gói AI";
};

export function AIPaymentResultPage({ mode }: { mode: AIPaymentResultMode }) {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get("orderCode") || searchParams.get("ordercode");
  const [transaction, setTransaction] = useState<AITransaction | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(orderCode));

  const loadResult = async () => {
    if (!orderCode) {
      setError("Không tìm thấy mã giao dịch PayOS.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [transactionsResponse, balanceResponse] = await Promise.all([
        aiPackageApi.getMyTransactions(),
        aiPackageApi.getMyBalance(),
      ]);
      const matchedTransaction =
        transactionsResponse.transactions.find((item) => String(item.orderCode) === String(orderCode)) || null;

      setTransaction(matchedTransaction);
      setBalance(balanceResponse.balance);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadResult();
  }, [orderCode]);

  const isPaid = transaction?.status === "PAID" || transaction?.status === "paid";
  const isCancelled = mode === "cancel" || transaction?.status === "CANCELLED" || transaction?.status === "cancelled";
  const title = useMemo(() => {
    if (isLoading) {
      return "Đang kiểm tra thanh toán";
    }

    if (isPaid) {
      return "Gói AI đã được kích hoạt";
    }

    if (isCancelled) {
      return "Thanh toán gói AI đã hủy";
    }

    return "Thanh toán đang chờ xác nhận";
  }, [isCancelled, isLoading, isPaid]);

  const description = isPaid
    ? "Credit đã được cộng vào tài khoản của bạn sau khi PayOS xác nhận giao dịch."
    : isCancelled
      ? "Bạn đã hủy thanh toán PayOS. Gói AI chưa được cộng credit."
      : "Nếu bạn đã chuyển khoản, hệ thống sẽ cập nhật credit khi webhook PayOS hoàn tất.";

  const Icon = isPaid ? CheckCircle : isCancelled ? XCircle : Clock;
  const iconClass = isPaid
    ? "bg-emerald-100 text-emerald-600"
    : isCancelled
      ? "bg-red-100 text-red-600"
      : "bg-amber-100 text-amber-600";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-lg rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className={`mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-12 w-12" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-950">{title}</h1>
        <p className="mb-8 text-gray-600">{isLoading ? "Vui lòng chờ trong giây lát." : description}</p>

        <div className="mb-8 rounded-lg bg-gray-50 p-5 text-left">
          <div className="space-y-3">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Mã PayOS</span>
              <span className="text-sm font-semibold text-gray-900">{orderCode || "--"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Gói</span>
              <span className="text-sm font-semibold text-gray-900">{transaction ? packageNameOf(transaction) : "--"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Credit</span>
              <span className="text-sm font-semibold text-gray-900">{transaction?.credits ?? "--"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Số tiền</span>
              <span className="text-sm font-semibold text-gray-900">
                {transaction ? formatCurrency(transaction.amount) : "--"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Số dư hiện tại</span>
              <span className="text-sm font-semibold text-gray-900">{balance ?? "--"}</span>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {!error && !isLoading && !transaction && (
            <p className="mt-4 text-sm text-amber-700">Chưa tìm thấy giao dịch trong lịch sử tài khoản.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/ai-packages">
            <Button className="w-full bg-gray-950 text-white hover:bg-gray-800">
              <PackageCheck className="h-4 w-4" />
              Gói của tôi
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="outline" className="w-full">
              <Coins className="h-4 w-4" />
              Tài khoản
            </Button>
          </Link>
          <Button variant="outline" onClick={loadResult} disabled={isLoading} className="sm:col-span-2">
            <RefreshCcw className="h-4 w-4" />
            Kiểm tra lại
          </Button>
          <Link to="/" className="sm:col-span-2">
            <Button variant="ghost" className="w-full">
              <Home className="h-4 w-4" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
