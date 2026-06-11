import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types";

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-900">Đang tải...</p>
        <p className="text-sm text-gray-500 mt-1">
          Vui lòng chờ trong giây lát
        </p>
      </div>
    </div>
  );
}

export function GuestOnlyRoute() {
  const { isAuthenticated, isHydrating, user } = useAuth();

  if (isHydrating) {
    return <FullPageLoader />;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={
          user?.role === "admin"
            ? "/admin"
            : user?.role === "manager"
              ? "/manager"
              : user?.role === "staff"
                ? "/staff"
                : user?.role === "shipper"
                  ? "/shipper"
                  : "/"
        }
        replace
      />
    );
  }

  return <Outlet />;
}

export function RequireAuth() {
  const { isAuthenticated, isHydrating } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { isAuthenticated, isHydrating, user } = useAuth();

  if (isHydrating) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}

export function RequireRoles({ roles }: { roles: UserRole[] }) {
  const { isAuthenticated, isHydrating, user } = useAuth();

  if (isHydrating) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
