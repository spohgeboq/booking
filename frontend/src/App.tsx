import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Meetings } from './pages/Meetings';
import { Employees } from './pages/Employees';
import { Services } from './pages/Services';
import { Reports } from './pages/Reports';
import { Finance } from './pages/Finance';
import { Settings } from './pages/Settings';
import { MasterDashboard } from './pages/MasterDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Компонент для умного редиректа на главную по роли
function RoleRedirect() {
    const { user } = useAuth();
    if (user?.role === 'MASTER') {
        return <Navigate to="/my-dashboard" replace />;
    }
    return <Navigate to="/schedule" replace />;
}

function App() {
    return (
        <AuthProvider>
            <Toaster position="top-right"
                toastOptions={{
                    style: {
                        background: '#2A2A2A',
                        color: '#F5F5F5',
                        border: '1px solid #404040',
                    },
                }}
            />
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* Роуты доступные всем авторизованным */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/" element={<RoleRedirect />} />
                            <Route path="/schedule" element={<Meetings />} />
                            <Route path="/my-dashboard" element={<MasterDashboard />} />

                            {/* Роуты только для OWNER */}
                            <Route path="/employees" element={<Employees />} />
                            <Route path="/services" element={<Services />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/finance" element={<Finance />} />
                            <Route path="/settings" element={<Settings />} />

                            <Route path="*" element={<RoleRedirect />} />
                        </Route>
                    </Route>
                </Routes>
            </AnimatePresence>
        </AuthProvider>
    );
}

export default App;
