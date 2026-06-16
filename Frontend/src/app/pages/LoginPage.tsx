import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types";

function getRoleDashboardPath(role: UserRole) {
  if (role === "admin") return "/admin";
  if (role === "manager") return "/manager";
  if (role === "staff") return "/staff";
  if (role === "shipper") return "/shipper";
  return null;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const session = await login({
        email: email.trim(),
        password,
      });

      toast.success("Đăng nhập thành công");

      const dashboardPath = getRoleDashboardPath(session.profile.role);
      if (dashboardPath) {
        navigate(dashboardPath, { replace: true });
        return;
      }

      if (redirectTo && redirectTo !== "/login") {
        navigate(redirectTo, { replace: true });
        return;
      }

      navigate("/", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gray-100 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1762430815620-fcca603c240c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwbW9kZWwlMjBydW53YXl8ZW58MXx8fHwxNzczMDY2MzQ4fDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Fashion"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-8 left-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Chào mừng trở lại</h2>
          <p className="text-lg opacity-90">Đăng nhập để tiếp tục mua sắm</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="inline-block mb-8">
              <h1 className="text-3xl font-bold">OUTFIO</h1>
            </Link>
            <h2 className="text-2xl font-bold mb-2">Đăng Nhập</h2>
            <p className="text-gray-600">
              Chưa có tài khoản?{" "}
              <Link to="/signup" className="text-black font-semibold hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-600 hover:text-black"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-500">
            Bằng việc đăng nhập, bạn đồng ý với{" "}
            <Link to="/terms" className="hover:underline">
              Điều khoản dịch vụ
            </Link>{" "}
            và{" "}
            <Link to="/privacy" className="hover:underline">
              Chính sách bảo mật
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
