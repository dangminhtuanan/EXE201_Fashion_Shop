import {
  ShoppingBag,
  Search,
  Menu,
  Heart,
  User,
  Shield,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export function Header({ cartCount }: HeaderProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 md:flex-none">
            <Link to="/">
              <h1 className="text-2xl font-bold tracking-tight">OUTFIO</h1>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              Nữ
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              Nam
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              Phụ Kiện
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              Sale
            </a>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              Bộ Sưu Tập
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Search className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Heart className="h-5 w-5" />
            </Button>

            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <Link to="/admin" className="hidden md:block">
                    <Button variant="ghost" className="gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}

                <Link to="/profile">
                  <Button variant="ghost" className="gap-2 hidden md:flex">
                    <User className="h-5 w-5" />
                    <span className="max-w-28 truncate">{user?.username}</span>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  className="gap-2 hidden md:flex"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </Button>

                <Link to="/profile" className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
