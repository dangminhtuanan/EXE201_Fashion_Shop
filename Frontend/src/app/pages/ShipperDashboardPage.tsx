import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, MapPin, PackageCheck, RefreshCcw, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { getErrorMessage, shippingApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { ShippingRecord, ShippingStatus } from "../types";

const statusLabels: Record<ShippingStatus, string> = {
  pending: "Chờ lấy hàng",
  picked_up: "Đã lấy hàng",
  in_transit: "Đang giao",
  out_for_delivery: "Sắp giao",
  delivered: "Đã giao",
  failed: "Giao thất bại",
  returned: "Hoàn hàng",
  cancelled: "Đã hủy",
};

const nextActions: Array<{ status: ShippingStatus; label: string }> = [
  { status: "picked_up", label: "Đã lấy hàng" },
  { status: "in_transit", label: "Đang giao" },
  { status: "out_for_delivery", label: "Sắp giao" },
  { status: "delivered", label: "Giao thành công" },
  { status: "failed", label: "Giao thất bại" },
  { status: "returned", label: "Hoàn hàng" },
];

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function isFinalStatus(status: ShippingStatus) {
  return ["delivered", "failed", "returned", "cancelled"].includes(status);
}

export function ShipperDashboardPage() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<ShippingRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<ShippingStatus | "all">("all");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadShipments = async () => {
    setLoading(true);

    try {
      const selectedStatus = statusFilter === "all" ? undefined : statusFilter;
      const response =
        user?.role === "admin"
          ? await shippingApi.getAll(selectedStatus)
          : await shippingApi.getMyShipments(selectedStatus);
      setShipments(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadShipments();
  }, [statusFilter, user?.role]);

  const stats = useMemo(
    () => ({
      total: shipments.length,
      active: shipments.filter((item) => !isFinalStatus(item.shippingStatus)).length,
      done: shipments.filter((item) => item.shippingStatus === "delivered").length,
      issue: shipments.filter((item) => ["failed", "returned", "cancelled"].includes(item.shippingStatus)).length,
    }),
    [shipments],
  );

  const handleUpdateStatus = async (shippingId: string, status: ShippingStatus) => {
    setUpdatingId(shippingId);

    try {
      const response = await shippingApi.updateStatus(shippingId, {
        status,
        location: location.trim(),
        notes: notes.trim(),
      });

      setShipments((prev) => prev.map((item) => (item._id === shippingId ? response.data : item)));
      toast.success("Đã cập nhật trạng thái giao hàng");
      setNotes("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-2">Shipper</p>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role === "admin" ? "Tất cả đơn giao" : "Đơn giao của tôi"}
            </h1>
            <p className="text-gray-600 mt-2">
              {user?.role === "admin"
                ? "Xem tất cả bản ghi vận chuyển và cập nhật trạng thái giao hàng."
                : "Xem đơn được gán và cập nhật trạng thái giao hàng."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ShippingStatus | "all")}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="all">Tất cả</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={() => void loadShipments()}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <PackageCheck className="w-5 h-5 text-gray-500 mb-3" />
            <p className="text-sm text-gray-500">Tổng đơn</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <Truck className="w-5 h-5 text-blue-600 mb-3" />
            <p className="text-sm text-gray-500">Đang xử lý</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 mb-3" />
            <p className="text-sm text-gray-500">Đã giao</p>
            <p className="text-2xl font-bold">{stats.done}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <Clock className="w-5 h-5 text-amber-600 mb-3" />
            <p className="text-sm text-gray-500">Cần xử lý</p>
            <p className="text-2xl font-bold">{stats.issue}</p>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Vị trí hiện tại</label>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Ví dụ: Quận 1, TP.HCM"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ghi chú giao hàng</label>
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ví dụ: Khách hẹn giao sau 18h"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border rounded-lg p-10 text-center text-gray-600">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
            Đang tải đơn giao...
          </div>
        ) : shipments.length === 0 ? (
          <div className="bg-white border rounded-lg p-10 text-center text-gray-600">
            Hiện chưa có đơn giao nào.
          </div>
        ) : (
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment._id} className="bg-white border rounded-lg p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="font-semibold text-lg text-gray-900">
                        #{shipment.trackingNumber || shipment._id.slice(-8)}
                      </h2>
                      <Badge variant={shipment.shippingStatus === "delivered" ? "default" : "secondary"}>
                        {statusLabels[shipment.shippingStatus]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {shipment.order.customerName} - {shipment.order.phone}
                    </p>
                    <p className="text-sm text-gray-600 flex items-start gap-2 mt-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{shipment.order.address}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Tổng tiền: <span className="font-semibold text-gray-900">{formatPrice(shipment.order.totalAmount)}</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Dự kiến giao: {formatDate(shipment.estimatedDelivery)}</p>
                    {shipment.order.note && (
                      <p className="text-sm text-gray-500 mt-1">Ghi chú đơn: {shipment.order.note}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-md">
                    {nextActions.map((action) => (
                      <Button
                        key={action.status}
                        type="button"
                        variant={action.status === "delivered" ? "default" : "outline"}
                        size="sm"
                        disabled={updatingId === shipment._id || isFinalStatus(shipment.shippingStatus)}
                        onClick={() => void handleUpdateStatus(shipment._id, action.status)}
                      >
                        {updatingId === shipment._id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {shipment.updates?.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Lịch sử</p>
                    <div className="space-y-2">
                      {shipment.updates.slice(-3).reverse().map((update, index) => (
                        <div key={`${update.status}-${update.timestamp || index}`} className="text-sm text-gray-600">
                          <span className="font-medium">{update.status}</span>
                          <span> - {formatDate(update.timestamp)}</span>
                          {update.location && <span> - {update.location}</span>}
                          {update.notes && <span> - {update.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
