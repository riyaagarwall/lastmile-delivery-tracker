import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Nav from './components/Nav';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerHome from './pages/CustomerHome';
import OrderDetail from './pages/OrderDetail';
import AgentHome from './pages/AgentHome';
import AdminHome from './pages/AdminHome';

function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'agent') return <Navigate to="/agent" replace />;
  return <Navigate to="/customer" replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/customer" element={<ProtectedRoute roles={['customer']}><CustomerHome /></ProtectedRoute>} />
        <Route path="/agent" element={<ProtectedRoute roles={['agent']}><AgentHome /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminHome /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute roles={['customer', 'agent', 'admin']}><OrderDetail /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
