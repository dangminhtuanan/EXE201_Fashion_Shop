import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { authApi, getErrorMessage } from "../lib/api";
import { toast } from "sonner";

type ForgotPasswordStep = "request" | "verify";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ForgotPasswordStep>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authApi.requestReset(email.trim());
      toast.success("Nếu email tồn tại, OTP đã được gửi");
      setStep("verify");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);

    try {
      await authApi.verifyResetOtp({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });
      toast.success("Đổi mật khẩu thành công, hãy đăng nhập lại");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <Link to="/" className="inline-block mb-8">
          <h1 className="text-3xl font-bold">OUTFIO</h1>
        </Link>

        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            {step === "request" ? "Quên mật khẩu" : "Nhập OTP xác thực"}
          </h2>
          <p className="text-gray-600 mt-2">
            {step === "request"
              ? "Nhập email để nhận OTP đặt lại mật khẩu"
              : `OTP đã được gửi tới ${email}. Nhập OTP và mật khẩu mới để hoàn tất.`}
          </p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang gửi OTP..." : "Gửi OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Mã OTP</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập mã OTP"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("request")}
                disabled={loading}
              >
                Quay lại
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Đang cập nhật..." : "Đổi mật khẩu"}
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-sm text-center text-gray-600">
          Nhớ mật khẩu rồi?{" "}
          <Link to="/login" className="font-semibold text-black hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
