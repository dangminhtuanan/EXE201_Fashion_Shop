import { LogOut, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

const navItems = [
  { label: "TRANG CHỦ", href: "/" },
  { label: "SẢN PHẨM", href: "/" },
  { label: "GÓI AI", href: "/ai-packages" },
  { label: "NEW ARRIVAL", href: "/" },
  { label: "BEST SELLER", href: "/" },
  { label: "SALE", href: "/" },
  { label: "BLOG", href: "/" },
  { label: "LIÊN HỆ", href: "/" },
];

export function Header({ cartCount }: HeaderProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const accountPath = !isAuthenticated
    ? "/login"
    : user?.role === "admin"
      ? "/admin"
      : user?.role === "manager"
        ? "/manager"
      : user?.role === "shipper"
        ? "/shipper"
        : "/profile";

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-t-4 border-pink-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div className="flex w-44 items-center">
          <Button variant="ghost" size="icon" className="mr-2 md:hidden">
            <Menu className="h-5 w-5 text-[#8b5d7c]" />
          </Button>

          <Link to="/" className="inline-flex flex-col leading-none">
            <span className="text-2xl font-bold tracking-tight text-pink-500">
              OUTFIO
            </span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.25em] text-pink-300">
              Fashion Store
            </span>
          </Link>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="text-[11px] font-semibold uppercase text-[#8b5d7c] transition-colors hover:text-pink-500"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex w-44 items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 text-[#8b5d7c] hover:text-pink-500 md:inline-flex"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Link to={accountPath}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-[#8b5d7c] hover:text-pink-500"
            >
              <User className="h-4 w-4" />
            </Button>
          </Link>

          {isAuthenticated && (
            <Button
              variant="ghost"
              className="hidden h-9 px-2 text-[#8b5d7c] hover:text-pink-500 sm:inline-flex"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Đăng xuất</span>
            </Button>
          )}

          <Link to="/cart">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-[#8b5d7c] hover:text-pink-500"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-[#8b5d7c] hover:text-pink-500 sm:hidden"
              onClick={handleLogout}
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-pink-50 md:hidden">
        <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 py-3">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="shrink-0 text-[11px] font-semibold uppercase text-[#8b5d7c]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
