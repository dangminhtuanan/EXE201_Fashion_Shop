import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  Search,
  Truck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import {
  getErrorMessage,
  ordersApi,
  paymentsApi,
  productsApi,
  reportsApi,
  shippingApi,
  usersApi,
} from "../lib/api";
import type { RevenueReportResponse } from "../lib/api";
import type {
  Order,
  Payment,
  PaymentStatus,
  Product,
  ShippingRecord,
  ShippingStatus,
  UserProfile,
} from "../types";

type ManagerSection = "overview" | "reports" | "orders" | "payments" | "shipping" | "products" | "users";
type ManagerOrder = Order & { user?: Pick<UserProfile, "_id" | "username" | "email" | "phone"> };

const sections = [
  { id: "overview", label: "Tong quan", icon: LayoutDashboard },
  { id: "reports", label: "Thong ke", icon: BadgeCheck },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "products", label: "Products", icon: Boxes },
  { id: "users", label: "Users", icon: Users },
] satisfies Array<{ id: ManagerSection; label: string; icon: typeof LayoutDashboard }>;

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

const shippingStatuses: ShippingStatus[] = [
  "pending",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
  "cancelled",
];

const editableShippingStatuses = shippingStatuses.filter((status) => status !== "cancelled");

const reportRanges = [
  { value: "7", label: "7 ngay" },
  { value: "30", label: "30 ngay" },
  { value: "90", label: "90 ngay" },
  { value: "365", label: "12 thang" },
];

const chartColors = ["#0f172a", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

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

function getDateRange(days: string) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (Number(days) - 1));

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function compactMoney(value?: number) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function shortLabel(value: string, maxLength = 20) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function isFinalShippingStatus(status: ShippingStatus) {
  return ["delivered", "failed", "returned", "cancelled"].includes(status);
}

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<ManagerSection>("overview");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shipments, setShipments] = useState<ShippingRecord[]>([]);
  const [revenueReport, setRevenueReport] = useState<RevenueReportResponse | null>(null);

  const [search, setSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [shippingStatusFilter, setShippingStatusFilter] = useState("");
  const [reportRange, setReportRange] = useState("30");
  const [reportGroupBy, setReportGroupBy] = useState<"day" | "month" | "year">("day");
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResponse, ordersResponse, paymentsResponse, productsResponse, shippingResponse] =
        await Promise.all([
          usersApi.getAll(),
          ordersApi.getAll(orderStatusFilter ? { status: orderStatusFilter as Order["status"] } : {}),
          paymentsApi.getAll(paymentStatusFilter ? { status: paymentStatusFilter as PaymentStatus } : {}),
          productsApi.getAll({ limit: 100, sort: "newest" }),
          shippingApi.getAll(shippingStatusFilter ? (shippingStatusFilter as ShippingStatus) : undefined),
        ]);

      setUsers(usersResponse.users);
      setOrders(ordersResponse.orders as ManagerOrder[]);
      setPayments(paymentsResponse.payments);
      setProducts(productsResponse.products);
      setShipments(shippingResponse.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueReport = async () => {
    setLoadingReport(true);
    try {
      const range = getDateRange(reportRange);
      const response = await reportsApi.getRevenue({
        ...range,
        groupBy: reportGroupBy,
        timezone: "Asia/Ho_Chi_Minh",
        limitTopProducts: 8,
        limitRecentOrders: 8,
      });
      setRevenueReport(response);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadData(), loadRevenueReport()]);
  }, [orderStatusFilter, paymentStatusFilter, shippingStatusFilter]);

  useEffect(() => {
    void loadRevenueReport();
  }, [reportRange, reportGroupBy]);

  const stats = useMemo(
    () => ({
      users: users.length,
      orders: orders.length,
      payments: payments.length,
      products: products.length,
      shipments: shipments.length,
      activeShipments: shipments.filter((item) => !isFinalShippingStatus(item.shippingStatus)).length,
      lowStock: products.filter((item) => (item.stock || 0) <= 5).length,
      revenue: revenueReport?.summary.totalRevenue ?? payments
        .filter((item) => ["paid", "PAID"].includes(item.status))
        .reduce((total, item) => total + item.amount, 0),
    }),
    [orders, payments, products, revenueReport, shipments, users],
  );

  const keyword = search.trim().toLowerCase();

  const filteredUsers = users.filter((item) =>
    !keyword ||
    [item.username, item.email, item.role, item.phone, item.address].some((value) =>
      String(value || "").toLowerCase().includes(keyword),
    ),
  );

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

  const filteredShipments = shipments.filter((item) =>
    !keyword ||
    [item.trackingNumber, item.shippingStatus, item.shippingMethod, item.order?.customerName, item.order?.phone, item.shipper?.username, item.shipper?.email].some((value) =>
      String(value || "").toLowerCase().includes(keyword),
    ),
  );

  const handleLogout = () => {
    logout();
    toast.success("Da dang xuat");
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
      setOrders((prev) => prev.map((item) => (item._id === orderId ? (response.order as ManagerOrder) : item)));
      toast.success("Da cap nhat order");
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
      toast.success("Da cap nhat payment");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleShippingStatusChange = async (shippingId: string, status: ShippingStatus) => {
    setUpdatingId(shippingId);
    try {
      const response = await shippingApi.updateStatus(shippingId, { status });
      setShipments((prev) => prev.map((item) => (item._id === shippingId ? response.data : item)));
      void loadData();
      toast.success("Da cap nhat shipping");
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
            <h1 className="mt-2 text-2xl font-bold">Manager dashboard</h1>
            <p className="mt-2 text-sm text-slate-500">Van hanh don hang, thanh toan va giao hang</p>
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
            <p className="font-medium text-slate-900">{user?.username || "Manager"}</p>
            <p className="mt-1 break-all">{user?.email}</p>
            <Button variant="outline" className="mt-3 w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Dang xuat
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b bg-white px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outfio</p>
                <h1 className="text-xl font-bold">Manager dashboard</h1>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Dang xuat
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
                <p className="text-sm font-medium text-slate-500">Xin chao, {user?.username || "manager"}</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight">
                  {sections.find((item) => item.id === activeSection)?.label}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void loadData()}>
                  <RefreshCcw className="h-4 w-4" />
                  Lam moi
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Dang xuat
                </Button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <StatCard title="Users" value={stats.users} icon={Users} />
              <StatCard title="Orders" value={stats.orders} icon={ClipboardList} />
              <StatCard title="Payments" value={stats.payments} icon={CreditCard} />
              <StatCard title="Shipping" value={stats.shipments} description={`${stats.activeShipments} active`} icon={Truck} />
              <StatCard title="Products" value={stats.products} description={`${stats.lowStock} low stock`} icon={Boxes} />
              <StatCard title="Revenue" value={money(stats.revenue)} icon={BadgeCheck} />
            </div>

            {activeSection !== "overview" && activeSection !== "reports" && (
              <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full xl:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tim kiem du lieu..."
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
                      <option value="">Tat ca order status</option>
                      {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  )}
                  {activeSection === "payments" && (
                    <select
                      value={paymentStatusFilter}
                      onChange={(event) => setPaymentStatusFilter(event.target.value)}
                      className="h-9 rounded-md border bg-white px-3 text-sm"
                    >
                      <option value="">Tat ca payment status</option>
                      {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  )}
                  {activeSection === "shipping" && (
                    <select
                      value={shippingStatusFilter}
                      onChange={(event) => setShippingStatusFilter(event.target.value)}
                      className="h-9 rounded-md border bg-white px-3 text-sm"
                    >
                      <option value="">Tat ca shipping status</option>
                      {shippingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
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
                <ActiveShipments shipments={shipments.filter((item) => !isFinalShippingStatus(item.shippingStatus)).slice(0, 6)} loading={loading} />
              </div>
            )}

            {activeSection === "reports" && (
              <ManagerReportPanel
                report={revenueReport}
                orders={orders}
                shipments={shipments}
                loading={loadingReport}
                range={reportRange}
                groupBy={reportGroupBy}
                onRangeChange={setReportRange}
                onGroupByChange={setReportGroupBy}
                onRefresh={() => void loadRevenueReport()}
              />
            )}

            {activeSection === "orders" && (
              <DataCard title="Danh sach order" description="Manager co the cap nhat order va payment status">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ma don</TableHead>
                      <TableHead>Khach hang</TableHead>
                      <TableHead>San pham</TableHead>
                      <TableHead>Tong tien</TableHead>
                      <TableHead>Order status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Ngay tao</TableHead>
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
                        <TableCell>{item.items.reduce((total, orderItem) => total + orderItem.quantity, 0)} items</TableCell>
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
                        <TableCell>{dateTime(item.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredOrders.length === 0 && <EmptyRow colSpan={7} text="Khong co order phu hop" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "payments" && (
              <DataCard title="Danh sach payment" description="Theo doi va cap nhat trang thai thanh toan">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ma payment</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>So tien</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Ngay tao</TableHead>
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
                    {!loading && filteredPayments.length === 0 && <EmptyRow colSpan={7} text="Khong co payment phu hop" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "shipping" && (
              <DataCard title="Danh sach shipping" description="Theo doi va cap nhat trang thai giao hang">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Khach hang</TableHead>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cap nhat gan nhat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={6} /> : filteredShipments.map((item) => {
                      const latestUpdate = item.updates?.[item.updates.length - 1];
                      return (
                        <TableRow key={item._id}>
                          <TableCell className="font-mono text-xs">{item.trackingNumber || `#${item._id.slice(-8).toUpperCase()}`}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item.order?.customerName || "--"}</div>
                            <div className="text-xs text-slate-500">{item.order?.phone || "--"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.shipper?.username || "Chua gan"}</div>
                            <div className="text-xs text-slate-500">{item.shipper?.email || "--"}</div>
                          </TableCell>
                          <TableCell>{item.shippingMethod}</TableCell>
                          <TableCell>
                            <select
                              value={item.shippingStatus}
                              disabled={updatingId === item._id || item.shippingStatus === "cancelled"}
                              onChange={(event) => void handleShippingStatusChange(item._id, event.target.value as ShippingStatus)}
                              className="h-8 rounded-md border bg-white px-2 text-xs"
                            >
                              {editableShippingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                              {item.shippingStatus === "cancelled" && <option value="cancelled">cancelled</option>}
                            </select>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{latestUpdate?.notes || latestUpdate?.location || "--"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {!loading && filteredShipments.length === 0 && <EmptyRow colSpan={6} text="Khong co shipping phu hop" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "products" && (
              <DataCard title="Danh sach product" description="Theo doi hang ton kho va san pham ban chay">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Gia</TableHead>
                      <TableHead>Kho</TableHead>
                      <TableHead>Da ban</TableHead>
                      <TableHead>Featured</TableHead>
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
                        <TableCell>{item.isFeatured ? "Co" : "Khong"}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredProducts.length === 0 && <EmptyRow colSpan={6} text="Khong co product phu hop" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "users" && (
              <DataCard title="Danh sach user" description="Theo doi user va vai tro trong he thong">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ten</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Vai tro</TableHead>
                      <TableHead>AI credits</TableHead>
                      <TableHead>Cap nhat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={6} /> : filteredUsers.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{item.username}</TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>{item.phone || "--"}</TableCell>
                        <TableCell><Badge variant={item.role === "manager" ? "default" : "secondary"}>{item.role}</Badge></TableCell>
                        <TableCell>{item.aiCredits || 0}</TableCell>
                        <TableCell>{dateTime(item.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredUsers.length === 0 && <EmptyRow colSpan={6} text="Khong co user phu hop" />}
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
  icon: typeof Users;
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

function ManagerReportPanel({
  report,
  orders,
  shipments,
  loading,
  range,
  groupBy,
  onRangeChange,
  onGroupByChange,
  onRefresh,
}: {
  report: RevenueReportResponse | null;
  orders: ManagerOrder[];
  shipments: ShippingRecord[];
  loading: boolean;
  range: string;
  groupBy: "day" | "month" | "year";
  onRangeChange: (value: string) => void;
  onGroupByChange: (value: "day" | "month" | "year") => void;
  onRefresh: () => void;
}) {
  const timeline = report?.timeline || [];
  const topProducts = (report?.topProducts || []).map((item) => ({
    ...item,
    label: shortLabel(item.name, 22),
  }));
  const orderStatusData = Object.entries(
    orders.reduce<Record<string, number>>((result, order) => {
      result[order.status] = (result[order.status] || 0) + 1;
      return result;
    }, {}),
  ).map(([status, count]) => ({ status, count }));
  const shippingStatusData = Object.entries(
    shipments.reduce<Record<string, number>>((result, shipment) => {
      result[shipment.shippingStatus] = (result[shipment.shippingStatus] || 0) + 1;
      return result;
    }, {}),
  ).map(([status, count]) => ({ status, count }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Thong ke van hanh manager</CardTitle>
              <CardDescription>Doanh thu, don hang, san pham va shipping can theo doi</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select value={range} onChange={(event) => onRangeChange(event.target.value)} className="h-9 rounded-md border bg-white px-3 text-sm">
                {reportRanges.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={groupBy} onChange={(event) => onGroupByChange(event.target.value as "day" | "month" | "year")} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="day">Theo ngay</option>
                <option value="month">Theo thang</option>
                <option value="year">Theo nam</option>
              </select>
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCcw className="h-4 w-4" />
                Lam moi
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <ReportMetric label="Doanh thu" value={money(report?.summary.totalRevenue)} loading={loading} />
            <ReportMetric label="Don da thanh toan" value={report?.summary.orderCount ?? 0} loading={loading} />
            <ReportMetric label="San pham da ban" value={report?.summary.itemCount ?? 0} loading={loading} />
            <ReportMetric label="Gia tri don TB" value={money(report?.summary.averageOrderValue)} loading={loading} />
          </div>

          <div className="mt-6 h-80">
            {loading ? (
              <ChartLoading />
            ) : timeline.length === 0 ? (
              <ChartEmpty text="Chua co du lieu doanh thu" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="revenue" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => compactMoney(Number(value))} width={70} />
                  <YAxis yAxisId="orders" orientation="right" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} width={42} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "revenue" ? money(Number(value)) : value,
                      name === "revenue" ? "Doanh thu" : "So don",
                    ]}
                    labelFormatter={(label) => `Ky: ${label}`}
                  />
                  <Legend formatter={(value) => (value === "revenue" ? "Doanh thu" : "So don")} />
                  <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="revenue" stroke="#0f172a" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="orders" type="monotone" dataKey="orderCount" name="orderCount" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Top san pham tao doanh thu</CardTitle>
            <CardDescription>Uu tien xem de quyet dinh ton kho va campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {loading ? (
                <ChartLoading />
              ) : topProducts.length === 0 ? (
                <ChartEmpty text="Chua co san pham tao doanh thu" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => compactMoney(Number(value))} />
                    <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={12} width={150} />
                    <Tooltip formatter={(value) => [money(Number(value)), "Doanh thu"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.name || "San pham"} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                      {topProducts.map((item, index) => (
                        <Cell key={item.product || item.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <ManagerPieCard
          title="Co cau thanh toan"
          description="Ty trong so don theo paymentStatus"
          data={report?.revenueByPaymentStatus || []}
          loading={loading}
          dataKey="orderCount"
          nameKey="paymentStatus"
          emptyText="Chua co du lieu thanh toan"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ManagerPieCard
          title="Trang thai don hang"
          description="Ty trong order theo status hien tai"
          data={orderStatusData}
          loading={loading}
          dataKey="count"
          nameKey="status"
          emptyText="Chua co du lieu order"
        />
        <ManagerPieCard
          title="Trang thai giao hang"
          description="Theo doi shipping dang bi tac hoac da hoan tat"
          data={shippingStatusData}
          loading={loading}
          dataKey="count"
          nameKey="status"
          emptyText="Chua co du lieu shipping"
        />
        <ManagerPieCard
          title="Co cau doanh thu"
          description="Ty trong doanh thu theo trang thai don"
          data={report?.revenueByStatus || []}
          loading={loading}
          dataKey="revenue"
          nameKey="status"
          emptyText="Chua co du lieu doanh thu"
          valueFormatter={(value) => money(Number(value))}
        />
      </div>
    </div>
  );
}

function ReportMetric({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950">{loading ? "..." : value}</p>
    </div>
  );
}

function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-slate-500">
      Dang tai bieu do...
    </div>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function ManagerPieCard({
  title,
  description,
  data,
  loading,
  dataKey,
  nameKey,
  emptyText,
  valueFormatter,
}: {
  title: string;
  description: string;
  data: Array<Record<string, unknown>>;
  loading: boolean;
  dataKey: string;
  nameKey: string;
  emptyText: string;
  valueFormatter?: (value: unknown) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          {loading ? (
            <ChartLoading />
          ) : data.length === 0 ? (
            <ChartEmpty text={emptyText} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value, _, item) => [
                    valueFormatter ? valueFormatter(value) : value,
                    String(item.payload[nameKey] || ""),
                  ]}
                />
                <Legend />
                <Pie
                  data={data}
                  dataKey={dataKey}
                  nameKey={nameKey}
                  cx="50%"
                  cy="44%"
                  outerRadius={86}
                  innerRadius={44}
                  paddingAngle={3}
                  label={(entry) => `${entry[nameKey]} ${(entry.percent * 100).toFixed(0)}%`}
                >
                  {data.map((item, index) => (
                    <Cell key={String(item[nameKey] || index)} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
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

function EmptyRow({ colSpan, text = "Dang tai du lieu..." }: { colSpan: number; text?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-slate-500">
        {text}
      </TableCell>
    </TableRow>
  );
}

function RecentOrders({ orders, loading }: { orders: ManagerOrder[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order moi nhat</CardTitle>
        <CardDescription>Theo du lieu vua fetch tu backend</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Dang tai...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">Chua co order</p>
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
        <CardTitle>Product sap het hang</CardTitle>
        <CardDescription>Can uu tien kiem tra ton kho</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Dang tai...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-500">Khong co product sap het hang</p>
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
        <CardTitle>Payment moi nhat</CardTitle>
        <CardDescription>Theo giao dich thanh toan moi nhat</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Dang tai...</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-slate-500">Chua co payment</p>
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

function ActiveShipments({ shipments, loading }: { shipments: ShippingRecord[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping dang xu ly</CardTitle>
        <CardDescription>Cac don giao hang chua ket thuc</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Dang tai...</p>
        ) : shipments.length === 0 ? (
          <p className="text-sm text-slate-500">Khong co shipping dang xu ly</p>
        ) : (
          shipments.map((shipment) => (
            <div key={shipment._id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{shipment.trackingNumber || shipment._id.slice(-8)}</p>
                <p className="text-sm text-slate-500">{shipment.order?.customerName || "--"}</p>
              </div>
              <Badge variant="secondary">{shipment.shippingStatus}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
