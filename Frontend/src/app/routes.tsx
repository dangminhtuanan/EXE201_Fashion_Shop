import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { UseAIPage } from './pages/UseAIPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { ShipperDashboardPage } from './pages/ShipperDashboardPage';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { AIPackagesPage } from './pages/AIPackagesPage';
import { AIPaymentResultPage } from './pages/AIPaymentResultPage';
import { GuestOnlyRoute, RequireAdmin, RequireAuth, RequireRoles } from './components/RouteGuards';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: 'product/:id',
        Component: ProductDetailPage,
      },
      {
        path: 'cart',
        Component: CartPage,
      },
      {
        path: 'checkout',
        Component: CheckoutPage,
      },
      {
        path: 'order-success',
        Component: OrderSuccessPage,
      },
      {
        path: 'payment/return',
        Component: () => <PaymentResultPage mode="return" />,
      },
      {
        path: 'payment/cancel',
        Component: () => <PaymentResultPage mode="cancel" />,
      },
      {
        path: 'ai-packages',
        Component: AIPackagesPage,
      },
      {
        path: 'ai/payment-result',
        Component: () => <AIPaymentResultPage mode="return" />,
      },
      {
        path: 'ai/cancel',
        Component: () => <AIPaymentResultPage mode="cancel" />,
      },
      {
        Component: RequireAuth,
        children: [
          {
            path: 'profile',
            Component: ProfilePage,
          },
        ],
      },
    ],
  },
  {
    Component: GuestOnlyRoute,
    children: [
      {
        path: 'login',
        Component: LoginPage,
      },
      {
        path: 'signup',
        Component: SignupPage,
      },
      {
        path: 'forgot-password',
        Component: ForgotPasswordPage,
      },
    ],
  },
  {
    path: '/use-ai',
    Component: UseAIPage,
  },
  {
    Component: RequireAdmin,
    children: [
      {
        path: 'admin',
        Component: AdminDashboardPage,
      },
    ],
  },
  {
    Component: () => <RequireRoles roles={['manager']} />,
    children: [
      {
        path: 'manager',
        Component: ManagerDashboardPage,
      },
    ],
  },
  {
    Component: () => <RequireRoles roles={['staff']} />,
    children: [
      {
        path: 'staff',
        Component: StaffDashboardPage,
      },
    ],
  },
  {
    Component: () => <RequireRoles roles={['shipper', 'admin']} />,
    children: [
      {
        path: 'shipper',
        Component: ShipperDashboardPage,
      },
    ],
  },
]);
