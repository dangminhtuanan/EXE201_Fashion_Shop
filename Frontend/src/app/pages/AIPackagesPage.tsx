import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Check,
  Clock,
  Coins,
  CreditCard,
  Loader2,
  PackageCheck,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { aiPackageApi, getErrorMessage } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { AIPackage, AITransaction, AITransactionStatus } from "../types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const packageNameOf = (transaction: AITransaction) => {
  if (typeof transaction.package === "object" && transaction.package !== null) {
    return transaction.package.name;
  }

  return "Gói AI";
};

const statusMeta: Record<AITransactionStatus, { label: string; className: string }> = {
  pending: { label: "Đang chờ", className: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDING: { label: "Đang chờ", className: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { label: "Đã thanh toán", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PAID: { label: "Đã thanh toán", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Thất bại", className: "bg-red-50 text-red-700 border-red-200" },
  FAILED: { label: "Thất bại", className: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Đã hủy", className: "bg-gray-100 text-gray-700 border-gray-200" },
  CANCELLED: { label: "Đã hủy", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export function AIPackagesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [packages, setPackages] = useState<AIPackage[]>([]);
  const [transactions, setTransactions] = useState<AITransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingAccount, setIsRefreshingAccount] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const paidTransactions = useMemo(
    () => transactions.filter((transaction) => ["paid", "PAID"].includes(transaction.status)),
    [transactions],
  );

  const loadData = async () => {
    try {
      const packagesResponse = await aiPackageApi.getPackages();
      setPackages(packagesResponse.packages);

      if (isAuthenticated) {
        const [balanceResponse, transactionsResponse] = await Promise.all([
          aiPackageApi.getMyBalance(),
          aiPackageApi.getMyTransactions(),
        ]);

        setBalance(balanceResponse.balance);
        setTransactions(transactionsResponse.transactions);
      } else {
        setBalance(0);
        setTransactions([]);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      await loadData();

      if (isMounted) {
        setIsLoading(false);
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleRefreshAccount = async () => {
    setIsRefreshingAccount(true);

    try {
      await loadData();
      toast.success("Đã cập nhật số dư và lịch sử gói AI");
    } finally {
      setIsRefreshingAccount(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/ai-packages" } });
      return;
    }

    setPurchasingId(packageId);

    try {
      const response = await aiPackageApi.purchase(packageId);
      window.location.assign(response.transaction.checkoutUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setPurchasingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white px-3 py-1 text-sm font-medium text-pink-600">
              <Sparkles className="h-4 w-4" />
              OUTFIO AI
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-950">Gói AI của tôi</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Mua credit để dùng thử đồ AI, mix-match outfit và các tính năng tư vấn thông minh.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleRefreshAccount}
            disabled={isLoading || isRefreshingAccount}
            className="w-full md:w-auto"
          >
            {isRefreshingAccount ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Cập nhật
          </Button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">AI credits còn lại</p>
                {isLoading ? (
                  <Skeleton className="mt-3 h-9 w-28" />
                ) : (
                  <p className="mt-2 text-4xl font-bold text-gray-950">{balance}</p>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-pink-600">
                <Coins className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Giao dịch thành công</p>
                {isLoading ? (
                  <Skeleton className="mt-3 h-9 w-20" />
                ) : (
                  <p className="mt-2 text-4xl font-bold text-gray-950">{paidTransactions.length}</p>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <PackageCheck className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Gói đang mở bán</p>
                {isLoading ? (
                  <Skeleton className="mt-3 h-9 w-20" />
                ) : (
                  <p className="mt-2 text-4xl font-bold text-gray-950">{packages.length}</p>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">Chọn gói credit</h2>
              <p className="text-sm text-gray-500">Thanh toán qua PayOS, credit được cộng sau khi webhook xác nhận.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-72 rounded-lg" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-white p-8 text-center text-gray-500">
              Chưa có gói AI nào đang mở bán.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {packages.map((item) => (
                <Card key={item._id} className="overflow-hidden">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">{item.name}</CardTitle>
                        <CardDescription className="mt-2 min-h-10">
                          {item.description || "Gói credit dùng cho các tính năng AI của OUTFIO."}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{item.duration === "one-time" ? "Một lần" : item.duration}</Badge>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-950">{formatCurrency(item.price)}</p>
                      <p className="mt-1 text-sm text-pink-600">{item.credits} AI credits</p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      {(item.features.length > 0 ? item.features : ["Thử đồ AI", "Mix-match outfit", "Tư vấn sản phẩm"]).map(
                        (feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="h-4 w-4 text-emerald-600" />
                            <span>{feature}</span>
                          </div>
                        ),
                      )}
                    </div>

                    <Button
                      className="w-full bg-gray-950 text-white hover:bg-gray-800"
                      onClick={() => handlePurchase(item._id)}
                      disabled={purchasingId === item._id}
                    >
                      {purchasingId === item._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Mua bằng PayOS
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">Lịch sử gói của tôi</h2>
              <p className="text-sm text-gray-500">Theo dõi các giao dịch mua AI package của tài khoản hiện tại.</p>
            </div>
            <Link to="/use-ai">
              <Button variant="outline" className="w-full sm:w-auto">
                Dùng AI
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="rounded-lg border bg-white shadow-sm">
            {!isAuthenticated ? (
              <div className="p-8 text-center">
                <Clock className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                <p className="font-medium text-gray-900">Đăng nhập để xem lịch sử gói AI</p>
                <p className="mt-1 text-sm text-gray-500">Sau khi mua, giao dịch và số dư credit sẽ hiển thị tại đây.</p>
                <Link to="/login" state={{ from: "/ai-packages" }} className="mt-4 inline-flex">
                  <Button>Đăng nhập</Button>
                </Link>
              </div>
            ) : isLoading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Bạn chưa có giao dịch mua gói AI nào.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gói</TableHead>
                    <TableHead>Mã PayOS</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const meta = statusMeta[transaction.status] || statusMeta.pending;

                    return (
                      <TableRow key={transaction._id}>
                        <TableCell className="font-medium">{packageNameOf(transaction)}</TableCell>
                        <TableCell>{transaction.orderCode || "--"}</TableCell>
                        <TableCell>{transaction.credits}</TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
