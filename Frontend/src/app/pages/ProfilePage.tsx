import { useEffect, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import { Link } from "react-router";
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
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { aiPackageApi, getErrorMessage, profileApi, resolveAssetUrl } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

function formatDate(value?: string) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [emailForm, setEmailForm] = useState({
    oldOtp: "",
    newEmail: "",
    newOtp: "",
  });
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [aiCredits, setAiCredits] = useState<number | null>(null);
  const [isAiBalanceLoading, setIsAiBalanceLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSendingPasswordOtp, setIsSendingPasswordOtp] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingOldEmailOtp, setIsSendingOldEmailOtp] = useState(false);
  const [isVerifyingOldEmailOtp, setIsVerifyingOldEmailOtp] = useState(false);
  const [isSendingNewEmailOtp, setIsSendingNewEmailOtp] = useState(false);
  const [isVerifyingNewEmailOtp, setIsVerifyingNewEmailOtp] = useState(false);

  useEffect(() => {
    setProfileForm({
      username: user?.username || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
  }, [user?.username, user?.phone, user?.address]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const profile = await refreshProfile();

        if (isMounted && profile) {
          setProfileForm({
            username: profile.username || "",
            phone: profile.phone || "",
            address: profile.address || "",
          });
        }
      } catch (error) {
        if (isMounted) {
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAiBalance = async () => {
      try {
        const response = await aiPackageApi.getMyBalance();

        if (isMounted) {
          setAiCredits(response.balance);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsAiBalanceLoading(false);
        }
      }
    };

    void loadAiBalance();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      await profileApi.updateProfile({
        username: profileForm.username.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
      });
      await refreshProfile();
      toast.success("Cập nhật hồ sơ thành công");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploadingAvatar(true);

    try {
      await profileApi.uploadAvatar(file);
      await refreshProfile();
      toast.success("Cập nhật avatar thành công");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSendPasswordOtp = async () => {
    setIsSendingPasswordOtp(true);

    try {
      await profileApi.requestChangePasswordOtp();
      toast.success("OTP đổi mật khẩu đã được gửi về email");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSendingPasswordOtp(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);

    try {
      await profileApi.verifyChangePasswordOtp(passwordForm);
      setPasswordForm({
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Đổi mật khẩu thành công");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendOldEmailOtp = async () => {
    setIsSendingOldEmailOtp(true);

    try {
      await profileApi.requestChangeEmailOldOtp();
      toast.success("OTP xác thực email hiện tại đã được gửi");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSendingOldEmailOtp(false);
    }
  };

  const handleVerifyOldEmailOtp = async () => {
    setIsVerifyingOldEmailOtp(true);

    try {
      await profileApi.verifyChangeEmailOldOtp(emailForm.oldOtp.trim());
      toast.success("Xác thực email hiện tại thành công");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsVerifyingOldEmailOtp(false);
    }
  };

  const handleSendNewEmailOtp = async () => {
    setIsSendingNewEmailOtp(true);

    try {
      await profileApi.requestChangeEmailNewOtp(emailForm.newEmail.trim());
      toast.success("OTP xác thực email mới đã được gửi");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSendingNewEmailOtp(false);
    }
  };

  const handleVerifyNewEmailOtp = async () => {
    setIsVerifyingNewEmailOtp(true);

    try {
      await profileApi.verifyChangeEmailNewOtp(emailForm.newOtp.trim());
      await refreshProfile();
      setEmailForm({
        oldOtp: "",
        newEmail: "",
        newOtp: "",
      });
      toast.success("Đổi email thành công");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsVerifyingNewEmailOtp(false);
    }
  };

  const avatarUrl = resolveAssetUrl(user?.avatar?.url);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col gap-6 lg:flex-row">
          <Card className="lg:w-80 shrink-0">
            <CardHeader>
              <CardTitle>Tài khoản của bạn</CardTitle>
              <CardDescription>
                Thông tin tổng quan lấy trực tiếp từ backend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col items-center text-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.username || "Avatar"}
                    className="h-24 w-24 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-black text-white flex items-center justify-center text-3xl font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xl font-semibold">{user?.username || "--"}</p>
                  <p className="text-sm text-gray-500">{user?.email || "--"}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Vai trò</span>
                  <Badge variant={user?.role === "admin" ? "default" : "secondary"}>
                    {user?.role === "admin" ? "Admin" : "User"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Ngày tạo</span>
                  <span>{formatDate(user?.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Cập nhật</span>
                  <span>{formatDate(user?.updatedAt)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-pink-100 bg-pink-50/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-pink-900">AI credits</p>
                    <p className="text-xs text-pink-700">Dùng cho thử đồ và mix-match AI</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-pink-600">
                    <Coins className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold text-pink-950">
                      {isAiBalanceLoading ? "--" : aiCredits ?? 0}
                    </p>
                    <p className="text-xs text-pink-700">Số dư hiện tại</p>
                  </div>
                  <Link to="/ai-packages">
                    <Button size="sm" className="bg-pink-600 text-white hover:bg-pink-700">
                      <Sparkles className="h-4 w-4" />
                      Mua gói
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Ảnh đại diện</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
                <p className="text-xs text-gray-500">
                  {isUploadingAvatar
                    ? "Đang tải ảnh lên..."
                    : "Backend dùng API /profile/upload-avatar"}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex-1">
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
                <TabsTrigger value="password">Mật khẩu</TabsTrigger>
                <TabsTrigger value="email">Đổi email</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Cập nhật thông tin cá nhân</CardTitle>
                    <CardDescription>
                      Đồng bộ với API `GET /profile/get-profile` và `PUT /profile/update`
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="profile-username">Tên đăng nhập</Label>
                          <Input
                            id="profile-username"
                            value={profileForm.username}
                            onChange={(e) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                username: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="profile-email">Email hiện tại</Label>
                          <Input
                            id="profile-email"
                            value={user?.email || ""}
                            disabled
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="profile-phone">Số điện thoại</Label>
                          <Input
                            id="profile-phone"
                            value={profileForm.phone}
                            onChange={(e) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="0912345678"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Trạng thái</Label>
                          <Input value={user?.isActive ? "Đang hoạt động" : "Đã khóa"} disabled />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-address">Địa chỉ</Label>
                        <Textarea
                          id="profile-address"
                          value={profileForm.address}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          placeholder="Nhập địa chỉ giao hàng"
                        />
                      </div>

                      <Button type="submit" disabled={isProfileLoading || isSavingProfile}>
                        {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle>Đổi mật khẩu bằng OTP</CardTitle>
                    <CardDescription>
                      Bước 1 gửi OTP, bước 2 nhập OTP và mật khẩu mới
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border border-dashed p-4">
                      <p className="text-sm text-gray-600 mb-3">
                        OTP sẽ được gửi tới email hiện tại của bạn:{" "}
                        <strong>{user?.email}</strong>
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendPasswordOtp}
                        disabled={isSendingPasswordOtp}
                      >
                        {isSendingPasswordOtp ? "Đang gửi OTP..." : "Gửi OTP đổi mật khẩu"}
                      </Button>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="password-otp">OTP</Label>
                        <Input
                          id="password-otp"
                          value={passwordForm.otp}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              otp: e.target.value,
                            }))
                          }
                          placeholder="Nhập OTP từ email"
                          required
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="new-password">Mật khẩu mới</Label>
                          <Input
                            id="new-password"
                            type="password"
                            minLength={6}
                            value={passwordForm.newPassword}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                newPassword: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            minLength={6}
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                confirmPassword: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" disabled={isChangingPassword}>
                        {isChangingPassword ? "Đang đổi mật khẩu..." : "Xác nhận đổi mật khẩu"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email">
                <Card>
                  <CardHeader>
                    <CardTitle>Đổi email bằng 4 bước xác thực</CardTitle>
                    <CardDescription>
                      Luồng này bám đúng backend: xác thực email cũ trước, sau đó xác thực email mới
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border p-4 space-y-3">
                        <h3 className="font-semibold">Bước 1 và 2: Email hiện tại</h3>
                        <p className="text-sm text-gray-600">
                          Gửi OTP đến <strong>{user?.email}</strong>, sau đó nhập mã OTP để xác thực.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendOldEmailOtp}
                          disabled={isSendingOldEmailOtp}
                        >
                          {isSendingOldEmailOtp ? "Đang gửi OTP..." : "Gửi OTP email hiện tại"}
                        </Button>

                        <div className="space-y-2">
                          <Label htmlFor="old-email-otp">OTP email hiện tại</Label>
                          <Input
                            id="old-email-otp"
                            value={emailForm.oldOtp}
                            onChange={(e) =>
                              setEmailForm((prev) => ({
                                ...prev,
                                oldOtp: e.target.value,
                              }))
                            }
                            placeholder="Nhập OTP bước 2"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={handleVerifyOldEmailOtp}
                          disabled={isVerifyingOldEmailOtp}
                        >
                          {isVerifyingOldEmailOtp ? "Đang xác thực..." : "Xác thực OTP email hiện tại"}
                        </Button>
                      </div>

                      <div className="rounded-xl border p-4 space-y-3">
                        <h3 className="font-semibold">Bước 3 và 4: Email mới</h3>
                        <p className="text-sm text-gray-600">
                          Sau khi bước 2 thành công, nhập email mới để nhận OTP xác thực cuối cùng.
                        </p>

                        <div className="space-y-2">
                          <Label htmlFor="new-email">Email mới</Label>
                          <Input
                            id="new-email"
                            type="email"
                            value={emailForm.newEmail}
                            onChange={(e) =>
                              setEmailForm((prev) => ({
                                ...prev,
                                newEmail: e.target.value,
                              }))
                            }
                            placeholder="new-email@example.com"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendNewEmailOtp}
                          disabled={isSendingNewEmailOtp}
                        >
                          {isSendingNewEmailOtp ? "Đang gửi OTP..." : "Gửi OTP email mới"}
                        </Button>

                        <div className="space-y-2">
                          <Label htmlFor="new-email-otp">OTP email mới</Label>
                          <Input
                            id="new-email-otp"
                            value={emailForm.newOtp}
                            onChange={(e) =>
                              setEmailForm((prev) => ({
                                ...prev,
                                newOtp: e.target.value,
                              }))
                            }
                            placeholder="Nhập OTP bước 4"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={handleVerifyNewEmailOtp}
                          disabled={isVerifyingNewEmailOtp}
                        >
                          {isVerifyingNewEmailOtp ? "Đang cập nhật..." : "Xác nhận đổi email"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
