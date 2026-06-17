import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  RefreshCcw,
  Search,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router";
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
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage, ordersApi, paymentsApi, productsApi, shippingApi } from "../lib/api";
import type { Order, Payment, PaymentStatus, Product, UserProfile } from "../types";

type StaffSection = "overview" | "orders" | "payments" | "products";
type StaffOrder = Order & { user?: Pick<UserProfile, "_id" | "username" | "email" | "phone"> };

const sections = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "orders", label: "Đơn hàng", icon: ClipboardList },
  { id: "payments", label: "Thanh toán", icon: CreditCard },
  { id: "products", label: "Sản phẩm", icon: Boxes },
] satisfies Array<{ id: StaffSection; label: string; icon: typeof LayoutDashboard }>;

const orderStatuses: Order["status"][] = [
  "pending",
  "confirmed",
  "packing",
  "shipping",
  "completed",
  "cancelled",
  "refunded",
  "delivery_failed",
  "returned",
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "FAILED",
];

const orderPaymentStatuses: Order["paymentStatus"][] = ["unpaid", "pending", "paid", "failed", "refunded"];

const paymentStatuses: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "PENDING",
  "PAID",
  "CANCELLED",
  "FAILED",
];

function money(value?: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("vi-VN") : "--";
}

function canCreateShipping(order: StaffOrder) {
  return ["confirmed", "packing", "PAID"].includes(order.status);
}

export function StaffDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<StaffSection>("overview");
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersResponse, paymentsResponse, productsResponse] = await Promise.all([
        ordersApi.getAll(orderStatusFilter ? { status: orderStatusFilter as Order["status"] } : {}),
        paymentsApi.getAll(paymentStatusFilter ? { status: paymentStatusFilter as PaymentStatus } : {}),
        productsApi.getAll({ limit: 100, sort: "newest" }),
      ]);

      setOrders(ordersResponse.orders as StaffOrder[]);
      setPayments(paymentsResponse.payments);
      setProducts(productsResponse.products);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [orderStatusFilter, paymentStatusFilter]);

  const stats = useMemo(
    () => ({
      orders: orders.length,
      pendingOrders: orders.filter((item) => ["pending", "PENDING_PAYMENT"].includes(item.status)).length,
      payments: payments.length,
      paidPayments: payments.filter((item) => ["paid", "PAID"].includes(item.status)).length,
      products: products.length,
      lowStock: products.filter((item) => (item.stock || 0) <= 5).length,
      revenue: payments
        .filter((item) => ["paid", "PAID"].includes(item.status))
        .reduce((total, item) => total + item.amount, 0),
    }),
    [orders, payments, products],
  );

  const keyword = search.trim().toLowerCase();

  const filteredOrders = orders.filter((item) =>
    !keyword ||
    [item._id, item.customerName, item.phone, item.address, item.status, item.paymentStatus, item.user?.email].some((value) =>
      String(value || "").toLowerCase().includes(keyword),
    ),
  );

  const filteredPayments = payments.filter((item) => {
    const paymentUser = typeof item.user === "object" ? item.user : null;
    const order = typeof item.order === "object" ? item.order : null;
    return (
      !keyword ||
      [item._id, item.provider, item.status, item.transactionNo, item.transactionReference, item.orderCode, paymentUser?.email, paymentUser?.username, order?._id].some((value) =>
        String(value || "").toLowerCase().includes(keyword),
      )
    );
  });

  const filteredProducts = products.filter((item) =>
    !keyword ||
    [item.name, item.category, item.brand, item.gender, item.material].some((value) =>
      String(value || "").toLowerCase().includes(keyword),
    ),
  );

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/login", { replace: true });
  };

  const handleOrderStatusChange = async (
    orderId: string,
    field: "status" | "paymentStatus",
    value: string,
  ) => {
    setUpdatingId(orderId);
    try {
      const response = await ordersApi.updateStatus(orderId, { [field]: value });
      setOrders((prev) => prev.map((item) => (item._id === orderId ? (response.order as StaffOrder) : item)));
      toast.success("Đã cập nhật đơn hàng");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePaymentStatusChange = async (paymentId: string, status: PaymentStatus) => {
    setUpdatingId(paymentId);
    try {
      const response = await paymentsApi.updateStatus(paymentId, { status });
      setPayments((prev) => prev.map((item) => (item._id === paymentId ? response.payment : item)));
      void loadData();
      toast.success("Đã cập nhật thanh toán");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateShipping = async (order: StaffOrder) => {
    setUpdatingId(order._id);
    try {
      await shippingApi.create({
        orderId: order._id,
        shippingMethod: "standard",
      });
      await loadData();
      toast.success("Đã tạo giao hàng cho đơn hàng");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r bg-white px-4 py-5 lg:block">
          <div className="mb-8 px-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outfio</p>
            <h1 className="mt-2 text-2xl font-bold">Bảng điều khiển nhân viên</h1>
            <p className="mt-2 text-sm text-slate-500">Xử lý đơn hàng, thanh toán và tạo giao hàng</p>
          </div>

          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${
                    active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-md border bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">{user?.username || "Nhân viên"}</p>
            <p className="mt-1 break-all">{user?.email}</p>
            <Button variant="outline" className="mt-3 w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b bg-white px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outfio</p>
                <h1 className="text-xl font-bold">Bảng điều khiển nhân viên</h1>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSection(section.id)}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Xin chào, {user?.username || "nhân viên"}</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight">
                  {sections.find((item) => item.id === activeSection)?.label}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void loadData()}>
                  <RefreshCcw className="h-4 w-4" />
                  Làm mới
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </Button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard title="Đơn hàng" value={stats.orders} description={`${stats.pendingOrders} đơn chờ xử lý`} icon={ClipboardList} />
              <StatCard title="Thanh toán" value={stats.payments} description={`${stats.paidPayments} đã thanh toán`} icon={CreditCard} />
              <StatCard title="Sản phẩm" value={stats.products} description={`${stats.lowStock} sắp hết hàng`} icon={Boxes} />
              <StatCard title="Doanh thu" value={money(stats.revenue)} icon={BadgeCheck} />
              <StatCard title="Tạo giao hàng" value={orders.filter(canCreateShipping).length} description="đơn sẵn sàng" icon={Truck} />
            </div>

            {activeSection !== "overview" && (
              <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full xl:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm kiếm dữ liệu..."
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeSection === "orders" && (
                    <select
                      value={orderStatusFilter}
                      onChange={(event) => setOrderStatusFilter(event.target.value)}
                      className="h-9 rounded-md border bg-white px-3 text-sm"
                    >
                      <option value="">Tất cả trạng thái đơn hàng</option>
                      {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  )}
                  {activeSection === "payments" && (
                    <select
                      value={paymentStatusFilter}
                      onChange={(event) => setPaymentStatusFilter(event.target.value)}
                      className="h-9 rounded-md border bg-white px-3 text-sm"
                    >
                      <option value="">Tất cả trạng thái thanh toán</option>
                      {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  )}
                </div>
              </div>
            )}

            {activeSection === "overview" && (
              <div className="grid gap-4 xl:grid-cols-2">
                <RecentOrders orders={orders.slice(0, 6)} loading={loading} />
                <LowStockProducts products={products.filter((item) => (item.stock || 0) <= 5).slice(0, 6)} loading={loading} />
                <RecentPayments payments={payments.slice(0, 6)} loading={loading} />
                <ReadyShippingOrders orders={orders.filter(canCreateShipping).slice(0, 6)} loading={loading} onCreateShipping={handleCreateShipping} updatingId={updatingId} />
              </div>
            )}

            {activeSection === "orders" && (
              <DataCard title="Danh sách đơn hàng" description="Nhân viên cập nhật trạng thái đơn hàng/thanh toán và tạo giao hàng">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Tổng tiền</TableHead>
                      <TableHead>Trạng thái đơn</TableHead>
                      <TableHead>Thanh toán</TableHead>
                      <TableHead>Shipping</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={7} /> : filteredOrders.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-mono text-xs">#{item._id.slice(-8).toUpperCase()}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.customerName}</div>
                          <div className="text-xs text-slate-500">{item.phone}</div>
                        </TableCell>
                        <TableCell>{item.items.reduce((total, orderItem) => total + orderItem.quantity, 0)} sản phẩm</TableCell>
                        <TableCell>{money(item.totalAmount)}</TableCell>
                        <TableCell>
                          <select
                            value={item.status}
                            disabled={updatingId === item._id}
                            onChange={(event) => void handleOrderStatusChange(item._id, "status", event.target.value)}
                            className="h-8 rounded-md border bg-white px-2 text-xs"
                          >
                            {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </TableCell>
                        <TableCell>
                          <select
                            value={item.paymentStatus}
                            disabled={updatingId === item._id}
                            onChange={(event) => void handleOrderStatusChange(item._id, "paymentStatus", event.target.value)}
                            className="h-8 rounded-md border bg-white px-2 text-xs"
                          >
                            {orderPaymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canCreateShipping(item) || updatingId === item._id}
                            onClick={() => void handleCreateShipping(item)}
                          >
                            <PackagePlus className="h-4 w-4" />
                            Tạo giao hàng
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredOrders.length === 0 && <EmptyRow colSpan={7} text="Không có đơn hàng phù hợp" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "payments" && (
              <DataCard title="Danh sách thanh toán" description="Nhân viên cập nhật trạng thái thanh toán">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã thanh toán</TableHead>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Đơn hàng</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={7} /> : filteredPayments.map((item) => {
                      const paymentUser = typeof item.user === "object" ? item.user : null;
                      const order = typeof item.order === "object" ? item.order : null;
                      return (
                        <TableRow key={item._id}>
                          <TableCell className="font-mono text-xs">#{item._id.slice(-8).toUpperCase()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{paymentUser?.username || "--"}</div>
                            <div className="text-xs text-slate-500">{paymentUser?.email || "--"}</div>
                          </TableCell>
                          <TableCell>{item.provider}</TableCell>
                          <TableCell>{money(item.amount)}</TableCell>
                          <TableCell>
                            <select
                              value={item.status}
                              disabled={updatingId === item._id}
                              onChange={(event) => void handlePaymentStatusChange(item._id, event.target.value as PaymentStatus)}
                              className="h-8 rounded-md border bg-white px-2 text-xs"
                            >
                              {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{order?._id ? `#${order._id.slice(-8).toUpperCase()}` : "--"}</TableCell>
                          <TableCell>{dateTime(item.createdAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {!loading && filteredPayments.length === 0 && <EmptyRow colSpan={7} text="Không có thanh toán phù hợp" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "products" && (
              <DataCard title="Danh sách sản phẩm" description="Nhân viên theo dõi sản phẩm và tồn kho">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Kho</TableHead>
                      <TableHead>Đã bán</TableHead>
                      <TableHead>Nổi bật</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={6} /> : filteredProducts.map((item) => (
                      <TableRow key={item._id || item.id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.brand || "--"} · {item.gender || "unisex"}</div>
                        </TableCell>
                        <TableCell>{item.category || "--"}</TableCell>
                        <TableCell>{money(item.price)}</TableCell>
                        <TableCell><Badge variant={(item.stock || 0) <= 5 ? "destructive" : "secondary"}>{item.stock || 0}</Badge></TableCell>
                        <TableCell>{item.sold || 0}</TableCell>
                        <TableCell>{item.isFeatured ? "Có" : "Không"}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredProducts.length === 0 && <EmptyRow colSpan={6} text="Không có sản phẩm phù hợp" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: typeof ClipboardList;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </CardContent>
    </Card>
  );
}

function DataCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, text = "Đang tải dữ liệu..." }: { colSpan: number; text?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-slate-500">
        {text}
      </TableCell>
    </TableRow>
  );
}

function RecentOrders({ orders, loading }: { orders: StaffOrder[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đơn hàng mới nhất</CardTitle>
        <CardDescription>Các đơn cần xử lý gần đây</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đơn hàng</p>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-sm text-slate-500">#{order._id.slice(-8).toUpperCase()} · {order.status}</p>
              </div>
              <p className="font-semibold">{money(order.totalAmount)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LowStockProducts({ products, loading }: { products: Product[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sản phẩm sắp hết hàng</CardTitle>
        <CardDescription>Cần báo cáo/bổ sung hàng</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-500">Không có sản phẩm sắp hết hàng</p>
        ) : (
          products.map((product) => (
            <div key={product._id || product.id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-slate-500">{product.category || "--"}</p>
              </div>
              <Badge variant="destructive">{product.stock || 0}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentPayments({ payments, loading }: { payments: Payment[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thanh toán mới nhất</CardTitle>
        <CardDescription>Theo giao dịch thanh toán mới nhất</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có thanh toán</p>
        ) : (
          payments.map((payment) => (
            <div key={payment._id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{payment.provider}</p>
                <p className="text-sm text-slate-500">#{payment._id.slice(-8).toUpperCase()} · {payment.status}</p>
              </div>
              <p className="font-semibold">{money(payment.amount)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ReadyShippingOrders({
  orders,
  loading,
  onCreateShipping,
  updatingId,
}: {
  orders: StaffOrder[];
  loading: boolean;
  onCreateShipping: (order: StaffOrder) => void;
  updatingId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đơn hàng sẵn sàng tạo giao hàng</CardTitle>
        <CardDescription>Các đơn đã xác nhận/đang đóng gói</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đơn hàng sẵn sàng tạo giao hàng</p>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-sm text-slate-500">#{order._id.slice(-8).toUpperCase()} · {order.status}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={updatingId === order._id}
                onClick={() => onCreateShipping(order)}
              >
                Tạo giao hàng
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
