import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  Search,
  Truck,
  Users,
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
import { getErrorMessage, ordersApi, productsApi, shippingApi, usersApi } from "../lib/api";
import type { Order, Product, ShippingRecord, UserProfile } from "../types";

type ManagerSection = "overview" | "users" | "orders" | "products" | "shipping";
type ManagerOrder = Order & { user?: Pick<UserProfile, "_id" | "username" | "email" | "phone"> };

const sections = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "users", label: "Xem user", icon: Users },
  { id: "orders", label: "Xem order", icon: ClipboardList },
  { id: "products", label: "Xem product", icon: Boxes },
  { id: "shipping", label: "Xem giao hàng", icon: Truck },
] satisfies Array<{ id: ManagerSection; label: string; icon: typeof LayoutDashboard }>;

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

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<ManagerSection>("overview");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shipments, setShipments] = useState<ShippingRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResponse, ordersResponse, productsResponse, shippingResponse] = await Promise.all([
        usersApi.getAll(),
        ordersApi.getAll(),
        productsApi.getAll({ limit: 100, sort: "newest" }),
        shippingApi.getAll(),
      ]);

      setUsers(usersResponse.users);
      setOrders(ordersResponse.orders as ManagerOrder[]);
      setProducts(productsResponse.products);
      setShipments(shippingResponse.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const stats = useMemo(
    () => ({
      users: users.length,
      orders: orders.length,
      products: products.length,
      shipments: shipments.length,
      revenue: orders
        .filter((item) => item.paymentStatus === "paid")
        .reduce((total, item) => total + item.totalAmount, 0),
    }),
    [orders, products, shipments, users],
  );

  const keyword = search.trim().toLowerCase();
  const filteredUsers = users.filter((item) =>
    !keyword || [item.username, item.email, item.role, item.phone].some((value) => value?.toLowerCase().includes(keyword)),
  );
  const filteredOrders = orders.filter((item) =>
    !keyword || [item._id, item.customerName, item.phone, item.status, item.paymentStatus].some((value) => String(value).toLowerCase().includes(keyword)),
  );
  const filteredProducts = products.filter((item) =>
    !keyword || [item.name, item.category, item.brand, item.gender].some((value) => String(value || "").toLowerCase().includes(keyword)),
  );
  const filteredShipments = shipments.filter((item) =>
    !keyword ||
    [item.trackingNumber, item.shippingStatus, item.order?.customerName, item.order?.phone, item.shipper?.username]
      .some((value) => String(value || "").toLowerCase().includes(keyword)),
  );

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r bg-white px-4 py-5 lg:block">
          <div className="mb-8 px-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outfio</p>
            <h1 className="mt-2 text-2xl font-bold">Manager dashboard</h1>
            <p className="mt-2 text-sm text-slate-500">Chế độ chỉ xem</p>
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
              Đăng xuất
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
                <p className="text-sm font-medium text-slate-500">Xin chào, {user?.username || "manager"}</p>
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
              <StatCard title="Users" value={stats.users} icon={Users} />
              <StatCard title="Orders" value={stats.orders} icon={ClipboardList} />
              <StatCard title="Products" value={stats.products} icon={Boxes} />
              <StatCard title="Shipments" value={stats.shipments} icon={Truck} />
              <StatCard title="Revenue" value={money(stats.revenue)} icon={LayoutDashboard} />
            </div>

            {activeSection !== "overview" && (
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm kiếm dữ liệu..."
                    className="pl-9"
                  />
                </div>
                <Badge variant="secondary">Read only</Badge>
              </div>
            )}

            {activeSection === "overview" && (
              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Order mới nhất</CardTitle>
                    <CardDescription>Manager chỉ xem, không cập nhật trạng thái</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {orders.slice(0, 6).map((order) => (
                      <div key={order._id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-slate-500">{order.status} · {order.paymentStatus}</p>
                        </div>
                        <p className="font-semibold">{money(order.totalAmount)}</p>
                      </div>
                    ))}
                    {!loading && orders.length === 0 && <p className="text-sm text-slate-500">Chưa có order</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Product sắp hết hàng</CardTitle>
                    <CardDescription>Theo tồn kho hiện tại</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {products.filter((item) => (item.stock || 0) <= 5).slice(0, 6).map((product) => (
                      <div key={product._id || product.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-slate-500">{product.category || "--"}</p>
                        </div>
                        <Badge variant="destructive">{product.stock || 0}</Badge>
                      </div>
                    ))}
                    {!loading && products.filter((item) => (item.stock || 0) <= 5).length === 0 && (
                      <p className="text-sm text-slate-500">Không có product sắp hết hàng</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "users" && (
              <DataCard title="Danh sách user" description="Chỉ xem thông tin user">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Cập nhật</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={5} /> : filteredUsers.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{item.username}</TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>{item.phone || "--"}</TableCell>
                        <TableCell><Badge variant={item.role === "manager" ? "default" : "secondary"}>{item.role}</Badge></TableCell>
                        <TableCell>{dateTime(item.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredUsers.length === 0 && <EmptyRow colSpan={5} text="Không có user phù hợp" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "orders" && (
              <DataCard title="Danh sách order" description="Chỉ xem order, không đổi trạng thái">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Tổng tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={6} /> : filteredOrders.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-mono text-xs">#{item._id.slice(-8).toUpperCase()}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.customerName}</div>
                          <div className="text-xs text-slate-500">{item.phone}</div>
                        </TableCell>
                        <TableCell>{money(item.totalAmount)}</TableCell>
                        <TableCell><Badge variant="secondary">{item.status}</Badge></TableCell>
                        <TableCell>{item.paymentStatus}</TableCell>
                        <TableCell>{dateTime(item.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredOrders.length === 0 && <EmptyRow colSpan={6} text="Không có order phù hợp" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "products" && (
              <DataCard title="Danh sách product" description="Chỉ xem product, không thêm/sửa/xóa">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Kho</TableHead>
                      <TableHead>Đã bán</TableHead>
                      <TableHead>Featured</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={6} /> : filteredProducts.map((item) => (
                      <TableRow key={item._id || item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category || "--"}</TableCell>
                        <TableCell>{money(item.price)}</TableCell>
                        <TableCell><Badge variant={(item.stock || 0) <= 5 ? "destructive" : "secondary"}>{item.stock || 0}</Badge></TableCell>
                        <TableCell>{item.sold || 0}</TableCell>
                        <TableCell>{item.isFeatured ? "Có" : "Không"}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredProducts.length === 0 && <EmptyRow colSpan={6} text="Không có product phù hợp" />}
                  </TableBody>
                </Table>
              </DataCard>
            )}

            {activeSection === "shipping" && (
              <DataCard title="Danh sách giao hàng" description="Chỉ xem vận chuyển, không gán/cập nhật shipper">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Dự kiến giao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <EmptyRow colSpan={5} /> : filteredShipments.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-mono text-xs">{item.trackingNumber || item._id.slice(-8)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.order?.customerName || "--"}</div>
                          <div className="text-xs text-slate-500">{item.order?.phone || "--"}</div>
                        </TableCell>
                        <TableCell>{item.shipper?.username || "Chưa gán"}</TableCell>
                        <TableCell><Badge variant="secondary">{item.shippingStatus}</Badge></TableCell>
                        <TableCell>{dateTime(item.estimatedDelivery || undefined)}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredShipments.length === 0 && <EmptyRow colSpan={5} text="Không có đơn giao phù hợp" />}
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

function StatCard({ title, value, icon: Icon }: { title: string; value: number | string; icon: typeof Users }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl">{value}</CardTitle>
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
