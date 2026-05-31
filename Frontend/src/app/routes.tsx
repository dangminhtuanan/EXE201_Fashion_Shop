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
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { GuestOnlyRoute, RequireAdmin, RequireAuth } from './components/RouteGuards';

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
]);
