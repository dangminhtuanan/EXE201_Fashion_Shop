import { useEffect, useState } from "react";
import {
  LogOut,
  Pencil,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { getErrorMessage, usersApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { UserProfile, UserRole } from "../types";
import { useNavigate } from "react-router";

interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  address: string;
}

const emptyForm: UserFormData = {
  username: "",
  email: "",
  password: "",
  role: "user",
  phone: "",
  address: "",
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
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

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/login", { replace: true });
  };

  const filteredUsers = users.filter((item) => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    return (
      item.username.toLowerCase().includes(keyword) ||
      item.email.toLowerCase().includes(keyword) ||
      item.role.toLowerCase().includes(keyword) ||
      item.phone.toLowerCase().includes(keyword)
    );
  });

  const totalUsers = users.length;
  const totalAdmins = users.filter((item) => item.role === "admin").length;
  const totalNormalUsers = users.filter((item) => item.role === "user").length;

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (selectedUser: UserProfile) => {
    setEditingUser(selectedUser);
    setFormData({
      username: selectedUser.username,
      email: selectedUser.email,
      password: "",
      role: selectedUser.role,
      phone: selectedUser.phone || "",
      address: selectedUser.address || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData(emptyForm);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        const response = await usersApi.update(editingUser._id, {
          username: formData.username.trim(),
          email: formData.email.trim(),
          role: formData.role,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        });

        setUsers((prev) =>
          prev.map((item) =>
            item._id === editingUser._id ? { ...item, ...response.user } : item,
          ),
        );

        toast.success("Cập nhật người dùng thành công");
      } else {
        const response = await usersApi.create({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        });

        setUsers((prev) => [response.user, ...prev]);
        toast.success("Tạo người dùng thành công");
      }

      closeDialog();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn vô hiệu hóa người dùng này?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await usersApi.remove(userId);
      setUsers((prev) => prev.filter((item) => item._id !== userId));
      toast.success("Đã vô hiệu hóa người dùng");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-2">
              Admin Panel
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Quản lý người dùng
            </h1>
            <p className="text-gray-600 mt-2">
              Đang đăng nhập với tài khoản admin:{" "}
              <span className="font-semibold">{user?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => void loadUsers()}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <Button onClick={openCreateDialog}>
              <UserPlus className="w-4 h-4 mr-2" />
              Thêm user
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Tổng user đang hoạt động</CardDescription>
              <CardTitle className="text-3xl">{totalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                Lấy từ API `GET /users`
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Số tài khoản admin</CardDescription>
              <CardTitle className="text-3xl">{totalAdmins}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                Có quyền quản trị hệ thống
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Số tài khoản user</CardDescription>
              <CardTitle className="text-3xl">{totalNormalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Người dùng phổ thông đang hoạt động
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Danh sách người dùng</CardTitle>
                <CardDescription>
                  Frontend đã nối trực tiếp với backend `users`
                </CardDescription>
              </div>

              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email, vai trò..."
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên đăng nhập</TableHead>
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
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Đang tải danh sách user...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Không có user phù hợp
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.username}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>{item.phone || "--"}</TableCell>
                      <TableCell>
                        <Badge variant={item.role === "admin" ? "default" : "secondary"}>
                          {item.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-52 truncate">
                        {item.address || "--"}
                      </TableCell>
                      <TableCell>
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleString("vi-VN")
                          : "--"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => void handleDeleteUser(item._id)}
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Cập nhật người dùng" : "Tạo người dùng mới"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Backend hỗ trợ cập nhật username, email, role, phone, address."
                : "Backend yêu cầu username, email, password và role."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  minLength={6}
                  required
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Vai trò</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleFormChange}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Đang lưu..."
                  : editingUser
                    ? "Cập nhật user"
                    : "Tạo user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
