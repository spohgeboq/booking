import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-bg1 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Проверка роли: если указаны allowedRoles и роль не подходит — редирект
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // MASTER уходит на свой дашборд, остальные — на расписание
        const fallback = user.role === 'MASTER' ? '/my-dashboard' : '/schedule';
        return <Navigate to={fallback} replace />;
    }

    return <Outlet />;
}
