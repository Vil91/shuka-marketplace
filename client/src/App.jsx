import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import { LoginPage, RegisterPage, ProfilePage } from './pages/AuthPages';
import SellerActivatePage from './pages/SellerActivatePage';
import SellerOverviewPage from './pages/SellerOverviewPage';
import SellerProductsPage from './pages/SellerProductsPage';
import SellerProductEditorPage from './pages/SellerProductEditorPage';
import SellerOrdersPage from './pages/SellerOrdersPage';
import SellerOrderDetailPage from './pages/SellerOrderDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/products/:id" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/seller/activate" element={<SellerActivatePage />} />
            <Route path="/seller" element={<SellerOverviewPage />} />
            <Route path="/seller/products" element={<SellerProductsPage />} />
            <Route path="/seller/products/new" element={<SellerProductEditorPage />} />
            <Route path="/seller/products/:id/edit" element={<SellerProductEditorPage />} />
            <Route path="/seller/orders" element={<SellerOrdersPage />} />
            <Route path="/seller/orders/:id" element={<SellerOrderDetailPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
