import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { authApi, getErrorMessage } from "../lib/api";

type SignupStep = "register" | "verify";

export function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SignupStep>("register");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const sendOtp = async () => {
    await authApi.registerSendOtp({
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    if (!agreeTerms) {
      toast.error("Vui lòng đồng ý với điều khoản dịch vụ");
      return;
    }

    setLoading(true);

    try {
      await sendOtp();
      toast.success("OTP đã được gửi về email của bạn");
      setStep("verify");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      await authApi.registerVerifyOtp({
        email: formData.email.trim(),
        otp: otp.trim(),
      });
      toast.success("Đăng ký thành công, hãy đăng nhập");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);

    try {
      await sendOtp();
      toast.success("Đã gửi lại OTP");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="inline-block mb-8">
              <h1 className="text-3xl font-bold">OUTFIO</h1>
            </Link>
            <h2 className="text-2xl font-bold mb-2">
              {step === "register" ? "Tạo Tài Khoản" : "Xác thực OTP"}
            </h2>
            <p className="text-gray-600">
              Đã có tài khoản?{" "}
              <Link
                to="/login"
                className="text-black font-semibold hover:underline"
              >
                Đăng nhập
              </Link>
            </p>
          </div>

          {step === "register" ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="andang1"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500">Tối thiểu 6 ký tự</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(Boolean(checked))}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Tôi đồng ý với{" "}
                  <Link to="/terms" className="text-black hover:underline">
                    Điều khoản dịch vụ
                  </Link>{" "}
                  và{" "}
                  <Link to="/privacy" className="text-black hover:underline">
                    Chính sách bảo mật
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? "Đang gửi OTP..." : "Tạo Tài Khoản"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                OTP đã được gửi tới <strong>{formData.email}</strong>. Mã có hiệu
                lực trong 10 phút.
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Mã OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Nhập 6 số OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? "Đang xác thực..." : "Xác thực và tạo tài khoản"}
              </Button>

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("register")}
                  disabled={loading}
                >
                  Quay lại
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Gửi lại OTP
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gray-100 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1768289222368-62cbdfe7d5f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwd29tYW4lMjBzdHlsaXNoJTIwb3V0Zml0fGVufDF8fHx8MTc3MzA2NjM0NXww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Fashion"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-8 left-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Tham gia cùng chúng tôi</h2>
          <p className="text-lg opacity-90">Khám phá thế giới thời trang</p>
        </div>
      </div>
    </div>
  );
}
