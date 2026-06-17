import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Pencil,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
  Truck,
  UserPlus,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import {
  categoriesApi,
  getErrorMessage,
  ordersApi,
  paymentsApi,
  productsApi,
  reportsApi,
  shippingApi,
  usersApi,
} from "../lib/api";
import type { Category, Order, Payment, PaymentStatus, Product, ShippingRecord, ShippingStatus, UserProfile, UserRole } from "../types";
import type { RevenueReportResponse } from "../lib/api";

type AdminSection = "overview" | "reports" | "users" | "orders" | "payments" | "shipping" | "products";
type AdminOrder = Order & { user?: Pick<UserProfile, "_id" | "username" | "email" | "phone"> };

interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  address: string;
}

interface ProductFormData {
  name: string;
  category: string;
  description: string;
  price: string;
  originalPrice: string;
  brand: string;
  material: string;
  gender: Product["gender"];
  sizes: string;
  colors: string;
  stock: string;
  images: string;
  isFeatured: boolean;
}

const emptyUserForm: UserFormData = {
  username: "",
  email: "",
  password: "",
  role: "user",
  phone: "",
  address: "",
};

const emptyProductForm: ProductFormData = {
  name: "",
  category: "",
  description: "",
  price: "",
  originalPrice: "",
  brand: "",
  material: "",
  gender: "unisex",
  sizes: "",
  colors: "",
  stock: "",
  images: "",
  isFeatured: false,
};

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

const paymentStatuses: Order["paymentStatus"][] = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
];

const adminPaymentStatuses: PaymentStatus[] = [
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

const revenueRangeOptions = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "365", label: "12 tháng" },
];

const chartColors = ["#0f172a", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

const sections = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "reports", label: "Thống kê", icon: BadgeCheck },
  { id: "users", label: "Quản lý người dùng", icon: Users },
  { id: "orders", label: "Quản lý đơn hàng", icon: ClipboardList },
  { id: "payments", label: "Thanh toán", icon: CreditCard },
  { id: "shipping", label: "Giao hàng", icon: Truck },
  { id: "products", label: "Quản lý sản phẩm", icon: Boxes },
] satisfies Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }>;

function money(value?: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("vi-VN") : "--";
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function shortLabel(value: string, maxLength = 18) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [shippings, setShippings] = useState<ShippingRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [revenueReport, setRevenueReport] = useState<RevenueReportResponse | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [shippingSearch, setShippingSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [shippingStatusFilter, setShippingStatusFilter] = useState("");
  const [revenueRange, setRevenueRange] = useState("30");
  const [revenueGroupBy, setRevenueGroupBy] = useState<"day" | "month" | "year">("day");

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingShippings, setLoadingShippings] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>(emptyUserForm);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(emptyProductForm);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await usersApi.getAll();
      setUsers(response.users);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await ordersApi.getAll(
        orderStatusFilter ? { status: orderStatusFilter as Order["status"] } : {},
      );
      setOrders(response.orders as AdminOrder[]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const response = await paymentsApi.getAll(
        paymentStatusFilter ? { status: paymentStatusFilter as PaymentStatus } : {},
      );
      setPayments(response.payments);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadShippings = async () => {
    setLoadingShippings(true);
    try {
      const response = await shippingApi.getAll(
        shippingStatusFilter ? (shippingStatusFilter as ShippingStatus) : undefined,
      );
      setShippings(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingShippings(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        productsApi.getAll({ limit: 100, sort: "newest" }),
        categoriesApi.getAll(),
      ]);
      setProducts(productResponse.products);
      setCategories(categoryResponse.categories);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadRevenueReport = async () => {
    setLoadingRevenue(true);
    try {
      const range = getDateRange(revenueRange);
      const response = await reportsApi.getRevenue({
        ...range,
        groupBy: revenueGroupBy,
        timezone: "Asia/Ho_Chi_Minh",
        limitTopProducts: 6,
        limitRecentOrders: 6,
      });
      setRevenueReport(response);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingRevenue(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      loadUsers(),
      loadOrders(),
      loadPayments(),
      loadShippings(),
      loadProducts(),
      loadRevenueReport(),
    ]);
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [orderStatusFilter]);

  useEffect(() => {
    void loadPayments();
  }, [paymentStatusFilter]);

  useEffect(() => {
    void loadShippings();
  }, [shippingStatusFilter]);

  useEffect(() => {
    void loadRevenueReport();
  }, [revenueRange, revenueGroupBy]);

  const stats = useMemo(() => {
    const revenue = orders
      .filter((item) => ["paid", "refunded"].includes(item.paymentStatus))
      .reduce((total, item) => total + item.totalAmount, 0);

    return {
      users: users.length,
      admins: users.filter((item) => item.role === "admin").length,
      orders: orders.length,
      pendingOrders: orders.filter((item) => ["pending", "PENDING_PAYMENT"].includes(item.status)).length,
      payments: payments.length,
      paidPayments: payments.filter((item) => ["paid", "PAID"].includes(item.status)).length,
      shippings: shippings.length,
      activeShippings: shippings.filter((item) => !["delivered", "failed", "returned", "cancelled"].includes(item.shippingStatus)).length,
      products: products.length,
      lowStock: products.filter((item) => (item.stock || 0) <= 5).length,
      revenue: revenueReport?.summary.totalRevenue ?? revenue,
    };
  }, [orders, payments, products, revenueReport, shippings, users]);

  const filteredUsers = users.filter((item) => {
    const keyword = userSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [item.username, item.email, item.role, item.phone, item.address]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(keyword));
  });

  const filteredOrders = orders.filter((item) => {
    const keyword = orderSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [item._id, item.customerName, item.phone, item.address, item.status, item.paymentStatus, item.user?.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const filteredPayments = payments.filter((item) => {
    const keyword = paymentSearch.trim().toLowerCase();
    if (!keyword) return true;
    const order = typeof item.order === "object" ? item.order : null;
    const paymentUser = typeof item.user === "object" ? item.user : null;
    return [item._id, item.provider, item.status, item.transactionNo, item.transactionReference, item.orderCode, order?._id, paymentUser?.email, paymentUser?.username]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const filteredShippings = shippings.filter((item) => {
    const keyword = shippingSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [item._id, item.trackingNumber, item.shippingStatus, item.shippingMethod, item.order?._id, item.order?.customerName, item.order?.phone, item.shipper?.email, item.shipper?.username]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const filteredProducts = products.filter((item) => {
    const keyword = productSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [item.name, item.category, item.brand, item.gender, item.material]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/login", { replace: true });
  };

  const openCreateUserDialog = () => {
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setIsUserDialogOpen(true);
  };

  const openEditUserDialog = (selectedUser: UserProfile) => {
    setEditingUser(selectedUser);
    setUserForm({
      username: selectedUser.username,
      email: selectedUser.email,
      password: "",
      role: selectedUser.role,
      phone: selectedUser.phone || "",
      address: selectedUser.address || "",
    });
    setIsUserDialogOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        const response = await usersApi.update(editingUser._id, {
          username: userForm.username.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
          phone: userForm.phone.trim(),
          address: userForm.address.trim(),
        });
        setUsers((prev) => prev.map((item) => (item._id === editingUser._id ? response.user : item)));
        toast.success("Cập nhật người dùng thành công");
      } else {
        const response = await usersApi.create({
          username: userForm.username.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role,
          phone: userForm.phone.trim(),
          address: userForm.address.trim(),
        });
        setUsers((prev) => [response.user, ...prev]);
        toast.success("Tạo người dùng thành công");
      }

      setIsUserDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa hoặc vô hiệu hóa người dùng này?")) return;

    try {
      await usersApi.remove(userId);
      setUsers((prev) => prev.filter((item) => item._id !== userId));
      toast.success("Đã xóa người dùng");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleOrderStatusChange = async (
    orderId: string,
    field: "status" | "paymentStatus",
    value: string,
  ) => {
    try {
      const response = await ordersApi.updateStatus(orderId, { [field]: value });
      setOrders((prev) => prev.map((item) => (item._id === orderId ? (response.order as AdminOrder) : item)));
      toast.success("Cập nhật đơn hàng thành công");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handlePaymentStatusChange = async (paymentId: string, status: PaymentStatus) => {
    try {
      const response = await paymentsApi.updateStatus(paymentId, { status });
      setPayments((prev) => prev.map((item) => (item._id === paymentId ? response.payment : item)));
      void loadOrders();
      toast.success("Cập nhật thanh toán thành công");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleShippingStatusChange = async (shippingId: string, status: ShippingStatus) => {
    try {
      const response = await shippingApi.updateStatus(shippingId, { status });
      setShippings((prev) => prev.map((item) => (item._id === shippingId ? response.data : item)));
      void loadOrders();
      toast.success("Cập nhật giao hàng thành công");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openCreateProductDialog = () => {
    setEditingProduct(null);
    setProductForm({ ...emptyProductForm, category: categories[0]?._id || "" });
    setIsProductDialogOpen(true);
  };

  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.categoryId || "",
      description: product.description || "",
      price: String(product.price || ""),
      originalPrice: String(product.originalPrice || ""),
      brand: product.brand || "",
      material: product.material || "",
      gender: product.gender || "unisex",
      sizes: (product.sizes || []).join(", "),
      colors: (product.colors || []).join(", "),
      stock: String(product.stock || 0),
      images: (product.images || []).join(", "),
      isFeatured: Boolean(product.isFeatured),
    });
    setIsProductDialogOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category,
      description: productForm.description.trim(),
      price: Number(productForm.price || 0),
      originalPrice: Number(productForm.originalPrice || 0),
      brand: productForm.brand.trim(),
      material: productForm.material.trim(),
      gender: productForm.gender,
      sizes: splitCsv(productForm.sizes),
      colors: splitCsv(productForm.colors),
      stock: Number(productForm.stock || 0),
      images: splitCsv(productForm.images),
      isFeatured: productForm.isFeatured,
    };

    try {
      if (editingProduct?._id) {
        const response = await productsApi.update(editingProduct._id, payload);
        setProducts((prev) => prev.map((item) => (item._id === editingProduct._id ? response.product : item)));
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        const response = await productsApi.create(payload);
        setProducts((prev) => [response.product, ...prev]);
        toast.success("Tạo sản phẩm thành công");
      }

      setIsProductDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!product._id || !window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) return;

    try {
      await productsApi.remove(product._id);
      setProducts((prev) => prev.filter((item) => item._id !== product._id));
      toast.success("Đã xóa sản phẩm");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r bg-white px-4 py-5 lg:block">
          <div className="mb-8 px-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outfio</p>
            <h1 className="mt-2 text-2xl font-bold">Bảng quản trị</h1>
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
            <p className="font-medium text-slate-900">{user?.username || "Admin"}</p>
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
                <h1 className="text-xl font-bold">Bảng quản trị</h1>
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
                <p className="text-sm font-medium text-slate-500">Xin chào, {user?.username || "quản trị viên"}</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight">
                  {sections.find((item) => item.id === activeSection)?.label}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void Promise.all([loadUsers(), loadOrders(), loadPayments(), loadShippings(), loadProducts()])}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Làm mới tất cả
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </Button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <StatCard title="Người dùng" value={stats.users} description={`${stats.admins} tài khoản quản trị`} icon={Users} />
              <StatCard title="Đơn hàng" value={stats.orders} description={`${stats.pendingOrders} đơn đang chờ`} icon={ClipboardList} />
              <StatCard title="Thanh toán" value={stats.payments} description={`${stats.paidPayments} đã thanh toán`} icon={CreditCard} />
              <StatCard title="Giao hàng" value={stats.shippings} description={`${stats.activeShippings} đang xử lý`} icon={Truck} />
              <StatCard title="Sản phẩm" value={stats.products} description={`${stats.lowStock} sản phẩm sắp hết`} icon={Boxes} />
              <StatCard title="Doanh thu đã ghi nhận" value={money(stats.revenue)} description="Từ các đơn đã thanh toán" icon={BadgeCheck} />
            </div>

            {activeSection === "overview" && (
              <div className="grid gap-4 xl:grid-cols-2">
                <RecentOrders orders={orders.slice(0, 6)} loading={loadingOrders} />
                <LowStockProducts products={products.filter((item) => (item.stock || 0) <= 5).slice(0, 6)} loading={loadingProducts} />
              </div>
            )}

            {activeSection === "reports" && (
              <div className="space-y-4">
                <RevenueReportPanel
                  report={revenueReport}
                  loading={loadingRevenue}
                  range={revenueRange}
                  groupBy={revenueGroupBy}
                  onRangeChange={setRevenueRange}
                  onGroupByChange={setRevenueGroupBy}
                  onRefresh={() => void loadRevenueReport()}
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  <RecentOrders
                    orders={(revenueReport?.recentOrders as AdminOrder[] | undefined) || orders.slice(0, 6)}
                    loading={loadingRevenue || loadingOrders}
                  />
                  <RevenueStatusBreakdown report={revenueReport} loading={loadingRevenue} />
                </div>
              </div>
            )}

            {activeSection === "users" && (
              <Card>
                <CardHeader className="gap-4">
                  <Toolbar
                    title="Danh sách người dùng"
                    description="Lấy dữ liệu từ API /users"
                    searchValue={userSearch}
                    searchPlaceholder="Tìm tên, email, vai trò..."
                    onSearchChange={setUserSearch}
                    onRefresh={() => void loadUsers()}
                    action={
                      <Button onClick={openCreateUserDialog}>
                        <UserPlus className="h-4 w-4" />
                        Thêm người dùng
                      </Button>
                    }
                  />
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Số điện thoại</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead>Địa chỉ</TableHead>
                        <TableHead>Cập nhật</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        <EmptyRow colSpan={7} text="Đang tải người dùng..." />
                      ) : filteredUsers.length === 0 ? (
                        <EmptyRow colSpan={7} text="Không có người dùng phù hợp" />
                      ) : (
                        filteredUsers.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell className="font-medium">{item.username}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>{item.phone || "--"}</TableCell>
                            <TableCell><Badge variant={item.role === "admin" ? "default" : "secondary"}>{item.role}</Badge></TableCell>
                            <TableCell className="max-w-56 truncate">{item.address || "--"}</TableCell>
                            <TableCell>{dateTime(item.updatedAt)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button size="icon" variant="outline" onClick={() => openEditUserDialog(item)} title="Sửa người dùng">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline" className="text-red-600" onClick={() => void handleDeleteUser(item._id)} title="Xóa người dùng">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeSection === "orders" && (
              <Card>
                <CardHeader className="gap-4">
                  <Toolbar
                    title="Danh sách đơn hàng"
                    description="Lấy dữ liệu từ API /orders, cập nhật trạng thái bằng /orders/:id/status"
                    searchValue={orderSearch}
                    searchPlaceholder="Tìm mã đơn, khách hàng, SĐT..."
                    onSearchChange={setOrderSearch}
                    onRefresh={() => void loadOrders()}
                    action={
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="h-9 rounded-md border bg-white px-3 text-sm"
                      >
                        <option value="">Tất cả trạng thái</option>
                        {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    }
                  />
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Tổng tiền</TableHead>
                        <TableHead>Trạng thái đơn</TableHead>
                        <TableHead>Thanh toán</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingOrders ? (
                        <EmptyRow colSpan={7} text="Đang tải đơn hàng..." />
                      ) : filteredOrders.length === 0 ? (
                        <EmptyRow colSpan={7} text="Không có đơn hàng phù hợp" />
                      ) : (
                        filteredOrders.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell className="font-mono text-xs">#{item._id.slice(-8).toUpperCase()}</TableCell>
                            <TableCell>
                              <div className="font-medium">{item.customerName}</div>
                              <div className="text-xs text-slate-500">{item.phone}</div>
                            </TableCell>
                            <TableCell>{item.items.reduce((total, orderItem) => total + orderItem.quantity, 0)} sản phẩm</TableCell>
                            <TableCell className="font-medium">{money(item.totalAmount)}</TableCell>
                            <TableCell>
                              <select
                                value={item.status}
                                onChange={(e) => void handleOrderStatusChange(item._id, "status", e.target.value)}
                                className="h-8 rounded-md border bg-white px-2 text-xs"
                              >
                                {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                              </select>
                            </TableCell>
                            <TableCell>
                              <select
                                value={item.paymentStatus}
                                onChange={(e) => void handleOrderStatusChange(item._id, "paymentStatus", e.target.value)}
                                className="h-8 rounded-md border bg-white px-2 text-xs"
                              >
                                {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                              </select>
                            </TableCell>
                            <TableCell>{dateTime(item.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeSection === "payments" && (
              <Card>
                <CardHeader className="gap-4">
                  <Toolbar
                    title="Danh sách thanh toán"
                    description="Lấy dữ liệu từ API /payments, cập nhật bằng /payments/:id/status"
                    searchValue={paymentSearch}
                    searchPlaceholder="Tìm mã thanh toán, nhà cung cấp, người dùng..."
                    onSearchChange={setPaymentSearch}
                    onRefresh={() => void loadPayments()}
                    action={
                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="h-9 rounded-md border bg-white px-3 text-sm"
                      >
                        <option value="">Tất cả trạng thái</option>
                        {adminPaymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    }
                  />
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã thanh toán</TableHead>
                        <TableHead>Người dùng</TableHead>
                        <TableHead>Nhà cung cấp</TableHead>
                        <TableHead>Số tiền</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingPayments ? (
                        <EmptyRow colSpan={7} text="Đang tải thanh toán..." />
                      ) : filteredPayments.length === 0 ? (
                        <EmptyRow colSpan={7} text="Không có thanh toán phù hợp" />
                      ) : (
                        filteredPayments.map((item) => {
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
                              <TableCell className="font-medium">{money(item.amount)}</TableCell>
                              <TableCell>
                                <select
                                  value={item.status}
                                  onChange={(e) => void handlePaymentStatusChange(item._id, e.target.value as PaymentStatus)}
                                  className="h-8 rounded-md border bg-white px-2 text-xs"
                                >
                                  {adminPaymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                                </select>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{order?._id ? `#${order._id.slice(-8).toUpperCase()}` : "--"}</TableCell>
                              <TableCell>{dateTime(item.createdAt)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeSection === "shipping" && (
              <Card>
                <CardHeader className="gap-4">
                  <Toolbar
                    title="Danh sách giao hàng"
                    description="Lấy dữ liệu từ API /shipping, cập nhật bằng /shipping/:id/status"
                    searchValue={shippingSearch}
                    searchPlaceholder="Tìm mã vận đơn, đơn hàng, người giao..."
                    onSearchChange={setShippingSearch}
                    onRefresh={() => void loadShippings()}
                    action={
                      <select
                        value={shippingStatusFilter}
                        onChange={(e) => setShippingStatusFilter(e.target.value)}
                        className="h-9 rounded-md border bg-white px-3 text-sm"
                      >
                        <option value="">Tất cả trạng thái</option>
                        {shippingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    }
                  />
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã vận đơn</TableHead>
                        <TableHead>Đơn hàng</TableHead>
                        <TableHead>Người giao</TableHead>
                        <TableHead>Phương thức</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Cập nhật gần nhất</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingShippings ? (
                        <EmptyRow colSpan={7} text="Đang tải giao hàng..." />
                      ) : filteredShippings.length === 0 ? (
                        <EmptyRow colSpan={7} text="Không có giao hàng phù hợp" />
                      ) : (
                        filteredShippings.map((item) => {
                          const latestUpdate = item.updates?.[item.updates.length - 1];
                          return (
                            <TableRow key={item._id}>
                              <TableCell className="font-mono text-xs">{item.trackingNumber || `#${item._id.slice(-8).toUpperCase()}`}</TableCell>
                              <TableCell>
                                <div className="font-medium">{item.order?.customerName || "--"}</div>
                                <div className="text-xs text-slate-500">{item.order?.phone || item.order?._id || "--"}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{item.shipper?.username || "Chưa gán"}</div>
                                <div className="text-xs text-slate-500">{item.shipper?.email || "--"}</div>
                              </TableCell>
                              <TableCell>{item.shippingMethod}</TableCell>
                              <TableCell>
                                <select
                                  value={item.shippingStatus}
                                  onChange={(e) => void handleShippingStatusChange(item._id, e.target.value as ShippingStatus)}
                                  className="h-8 rounded-md border bg-white px-2 text-xs"
                                >
                                  {shippingStatuses.map((status) => <option key={status} value={status} disabled={status === "cancelled"}>{status}</option>)}
                                </select>
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">{latestUpdate?.notes || latestUpdate?.location || "--"}</TableCell>
                              <TableCell>{dateTime(item.createdAt)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeSection === "products" && (
              <Card>
                <CardHeader className="gap-4">
                  <Toolbar
                    title="Danh sách sản phẩm"
                    description="Lấy dữ liệu từ API /products, thêm/sửa/xóa bằng quyền quản trị"
                    searchValue={productSearch}
                    searchPlaceholder="Tìm tên, thương hiệu, danh mục..."
                    onSearchChange={setProductSearch}
                    onRefresh={() => void loadProducts()}
                    action={
                      <Button onClick={openCreateProductDialog}>
                        <PackagePlus className="h-4 w-4" />
                        Thêm sản phẩm
                      </Button>
                    }
                  />
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Danh mục</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Kho</TableHead>
                        <TableHead>Đã bán</TableHead>
                        <TableHead>Nổi bật</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingProducts ? (
                        <EmptyRow colSpan={7} text="Đang tải sản phẩm..." />
                      ) : filteredProducts.length === 0 ? (
                        <EmptyRow colSpan={7} text="Không có sản phẩm phù hợp" />
                      ) : (
                        filteredProducts.map((item) => (
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
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button size="icon" variant="outline" onClick={() => openEditProductDialog(item)} title="Sửa sản phẩm">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline" className="text-red-600" onClick={() => void handleDeleteProduct(item)} title="Xóa sản phẩm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      <UserDialog
        open={isUserDialogOpen}
        editingUser={editingUser}
        form={userForm}
        submitting={submitting}
        onOpenChange={setIsUserDialogOpen}
        onFormChange={setUserForm}
        onSubmit={handleUserSubmit}
      />

      <ProductDialog
        open={isProductDialogOpen}
        editingProduct={editingProduct}
        form={productForm}
        categories={categories}
        submitting={submitting}
        onOpenChange={setIsProductDialogOpen}
        onFormChange={setProductForm}
        onSubmit={handleProductSubmit}
      />
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
  description: string;
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
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function RevenueReportPanel({
  report,
  loading,
  range,
  groupBy,
  onRangeChange,
  onGroupByChange,
  onRefresh,
}: {
  report: RevenueReportResponse | null;
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Báo cáo doanh thu</CardTitle>
              <CardDescription>
                Dữ liệu từ API /reports/revenue dành cho admin và manager
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={range}
                onChange={(event) => onRangeChange(event.target.value)}
                className="h-9 rounded-md border bg-white px-3 text-sm"
              >
                {revenueRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={groupBy}
                onChange={(event) => onGroupByChange(event.target.value as "day" | "month" | "year")}
                className="h-9 rounded-md border bg-white px-3 text-sm"
              >
                <option value="day">Theo ngày</option>
                <option value="month">Theo tháng</option>
                <option value="year">Theo năm</option>
              </select>
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <MiniMetric
              label="Doanh thu"
              value={money(report?.summary.totalRevenue)}
              loading={loading}
            />
            <MiniMetric
              label="Số đơn đã ghi nhận"
              value={report?.summary.orderCount ?? 0}
              loading={loading}
            />
            <MiniMetric
              label="Sản phẩm đã bán"
              value={report?.summary.itemCount ?? 0}
              loading={loading}
            />
            <MiniMetric
              label="Giá trị đơn TB"
              value={money(report?.summary.averageOrderValue)}
              loading={loading}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-slate-950" />
              Doanh thu
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-blue-600" />
              Số đơn
            </div>
          </div>

          <div className="mt-3 h-80">
            {loading ? (
              <ChartLoading />
            ) : timeline.length === 0 ? (
              <ChartEmpty text="Chưa có dữ liệu doanh thu trong khoảng đã chọn" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    yAxisId="revenue"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value) => compactMoney(Number(value))}
                    width={70}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    allowDecimals={false}
                    width={42}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "revenue" ? money(Number(value)) : value,
                      name === "revenue" ? "Doanh thu" : "Số đơn",
                    ]}
                    labelFormatter={(label) => `Kỳ: ${label}`}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    formatter={(value) => (value === "revenue" ? "Doanh thu" : "Số đơn")}
                  />
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="#0f172a"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orderCount"
                    name="orderCount"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Top sản phẩm theo doanh thu</CardTitle>
            <CardDescription>Sắp xếp theo doanh thu từ đơn đã thanh toán</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {loading ? (
                <ChartLoading />
              ) : topProducts.length === 0 ? (
                <ChartEmpty text="Chưa có sản phẩm phát sinh doanh thu" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={(value) => compactMoney(Number(value))}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      width={150}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "revenue" ? money(Number(value)) : value,
                        name === "revenue" ? "Doanh thu" : "Số lượng",
                      ]}
                    />
                    <Legend formatter={() => "Doanh thu"} />
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

        <Card>
          <CardHeader>
            <CardTitle>Cơ cấu thanh toán</CardTitle>
            <CardDescription>Đếm đơn theo paymentStatus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Đang tải...</p>
            ) : !report?.revenueByPaymentStatus.length ? (
              <p className="text-sm text-slate-500">Chưa có dữ liệu thanh toán</p>
            ) : (
              report.revenueByPaymentStatus.map((item) => (
                <div key={item.paymentStatus} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={item.paymentStatus === "paid" ? "default" : "secondary"}>
                      {item.paymentStatus}
                    </Badge>
                    <span className="text-sm font-semibold">{item.orderCount} đơn</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{money(item.totalAmount)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PaymentStatusPie report={report} loading={loading} />
        <RevenueStatusPie report={report} loading={loading} />
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950">
        {loading ? "..." : value}
      </p>
    </div>
  );
}

function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-slate-500">
      Đang tải biểu đồ...
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

function PaymentStatusPie({
  report,
  loading,
}: {
  report: RevenueReportResponse | null;
  loading: boolean;
}) {
  const data = report?.revenueByPaymentStatus || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sơ đồ tròn thanh toán</CardTitle>
        <CardDescription>Tỷ trọng số đơn theo paymentStatus</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {loading ? (
            <ChartLoading />
          ) : data.length === 0 ? (
            <ChartEmpty text="Chưa có dữ liệu thanh toán" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value, name, item) => [
                    `${value} đơn - ${money(item.payload.totalAmount)}`,
                    item.payload.paymentStatus,
                  ]}
                />
                <Legend />
                <Pie
                  data={data}
                  dataKey="orderCount"
                  nameKey="paymentStatus"
                  cx="50%"
                  cy="45%"
                  outerRadius={92}
                  innerRadius={48}
                  paddingAngle={3}
                  label={({ paymentStatus, percent }) =>
                    `${paymentStatus} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.map((item, index) => (
                    <Cell key={item.paymentStatus} fill={chartColors[index % chartColors.length]} />
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

function RevenueStatusPie({
  report,
  loading,
}: {
  report: RevenueReportResponse | null;
  loading: boolean;
}) {
  const data = report?.revenueByStatus || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sơ đồ tròn doanh thu</CardTitle>
        <CardDescription>Tỷ trọng doanh thu theo trạng thái đơn</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {loading ? (
            <ChartLoading />
          ) : data.length === 0 ? (
            <ChartEmpty text="Chưa có dữ liệu doanh thu theo trạng thái" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value, name, item) => [
                    `${money(Number(value))} - ${item.payload.orderCount} đơn`,
                    item.payload.status,
                  ]}
                />
                <Legend />
                <Pie
                  data={data}
                  dataKey="revenue"
                  nameKey="status"
                  cx="50%"
                  cy="45%"
                  outerRadius={92}
                  innerRadius={48}
                  paddingAngle={3}
                  label={({ status, percent }) =>
                    `${status} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.map((item, index) => (
                    <Cell key={item.status} fill={chartColors[index % chartColors.length]} />
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

function RevenueStatusBreakdown({
  report,
  loading,
}: {
  report: RevenueReportResponse | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Doanh thu theo trạng thái đơn</CardTitle>
        <CardDescription>Các trạng thái được tính trong báo cáo doanh thu</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : !report?.revenueByStatus.length ? (
          <p className="text-sm text-slate-500">Chưa có dữ liệu trạng thái đơn</p>
        ) : (
          report.revenueByStatus.map((item) => (
            <div key={item.status} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">{item.status}</Badge>
                <span className="text-sm font-semibold">{item.orderCount} đơn</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{money(item.revenue)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Toolbar({
  title,
  description,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onRefresh,
  action,
}: {
  title: string;
  description: string;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
        {action}
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-slate-500">
        {text}
      </TableCell>
    </TableRow>
  );
}

function RecentOrders({ orders, loading }: { orders: AdminOrder[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đơn hàng mới nhất</CardTitle>
        <CardDescription>Theo dữ liệu mới lấy từ backend</CardDescription>
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
        <CardDescription>Ưu tiên kiểm tra tồn kho</CardDescription>
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

function UserDialog({
  open,
  editingUser,
  form,
  submitting,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  editingUser: UserProfile | null;
  form: UserFormData;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: UserFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{editingUser ? "Cập nhật người dùng" : "Tạo người dùng mới"}</DialogTitle>
          <DialogDescription>Thông tin sẽ được lưu qua API /users.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên đăng nhập" id="username" value={form.username} onChange={(value) => onFormChange({ ...form, username: value })} required />
            <Field label="Email" id="email" type="email" value={form.email} onChange={(value) => onFormChange({ ...form, email: value })} required />
          </div>
          {!editingUser && (
            <Field label="Mật khẩu" id="password" type="password" value={form.password} onChange={(value) => onFormChange({ ...form, password: value })} required />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò</Label>
              <select id="role" value={form.role} onChange={(e) => onFormChange({ ...form, role: e.target.value as UserRole })} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                {["user", "customer", "staff", "manager", "shipper", "admin"].map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <Field label="Số điện thoại" id="phone" value={form.phone} onChange={(value) => onFormChange({ ...form, phone: value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Textarea id="address" value={form.address} onChange={(e) => onFormChange({ ...form, address: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Đang lưu..." : "Lưu người dùng"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductDialog({
  open,
  editingProduct,
  form,
  categories,
  submitting,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  editingProduct: Product | null;
  form: ProductFormData;
  categories: Category[];
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: ProductFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{editingProduct ? "Cập nhật sản phẩm" : "Tạo sản phẩm mới"}</DialogTitle>
          <DialogDescription>Nhập kích cỡ, màu sắc và URL ảnh bằng dấu phẩy nếu có nhiều giá trị.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên sản phẩm" id="product-name" value={form.name} onChange={(value) => onFormChange({ ...form, name: value })} required />
            <div className="space-y-2">
              <Label htmlFor="category">Danh mục</Label>
              <select id="category" value={form.category} onChange={(e) => onFormChange({ ...form, category: e.target.value })} required className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                <option value="">Chọn danh mục</option>
                {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Giá bán" id="price" type="number" value={form.price} onChange={(value) => onFormChange({ ...form, price: value })} required />
            <Field label="Giá gốc" id="originalPrice" type="number" value={form.originalPrice} onChange={(value) => onFormChange({ ...form, originalPrice: value })} />
            <Field label="Tồn kho" id="stock" type="number" value={form.stock} onChange={(value) => onFormChange({ ...form, stock: value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Thương hiệu" id="brand" value={form.brand} onChange={(value) => onFormChange({ ...form, brand: value })} />
            <Field label="Chất liệu" id="material" value={form.material} onChange={(value) => onFormChange({ ...form, material: value })} />
            <div className="space-y-2">
              <Label htmlFor="gender">Giới tính</Label>
              <select id="gender" value={form.gender} onChange={(e) => onFormChange({ ...form, gender: e.target.value as Product["gender"] })} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                {["men", "women", "unisex", "kids"].map((gender) => <option key={gender} value={gender}>{gender}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Kích cỡ" id="sizes" value={form.sizes} onChange={(value) => onFormChange({ ...form, sizes: value })} placeholder="S, M, L" />
            <Field label="Màu sắc" id="colors" value={form.colors} onChange={(value) => onFormChange({ ...form, colors: value })} placeholder="Đen, Trắng" />
          </div>
          <Field label="URL ảnh" id="images" value={form.images} onChange={(value) => onFormChange({ ...form, images: value })} placeholder="https://..., https://..." />
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" value={form.description} onChange={(e) => onFormChange({ ...form, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => onFormChange({ ...form, isFeatured: e.target.checked })} />
            Sản phẩm nổi bật
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={submitting || categories.length === 0}>{submitting ? "Đang lưu..." : "Lưu sản phẩm"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}
