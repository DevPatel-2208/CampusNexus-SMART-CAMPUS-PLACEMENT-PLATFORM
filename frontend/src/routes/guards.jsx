import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="cc-auth-wrap"><div className="spinner-border text-primary" role="status" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="cc-auth-wrap"><div className="spinner-border text-primary" role="status" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

export function PublicOnly({ children }) {
  const { user, loading, postLogin } = useAuth();
  if (loading) return <div className="cc-auth-wrap"><div className="spinner-border text-primary" role="status" /></div>;
  if (user && !postLogin) {
    const home = user.role === 'student' ? '/student' : user.role === 'company' ? '/company' : '/tpo';
    return <Navigate to={home} replace />;
  }
  return children;
}
