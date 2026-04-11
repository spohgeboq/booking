import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Meetings } from './pages/Meetings';
import { Employees } from './pages/Employees';
import { Services } from './pages/Services';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

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
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/" element={<Navigate to="/schedule" replace />} />
                            <Route path="/schedule" element={<Meetings />} />
                            <Route path="/employees" element={<Employees />} />
                            <Route path="/services" element={<Services />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="*" element={<Navigate to="/schedule" replace />} />
                        </Route>
                    </Route>
                </Routes>
            </AnimatePresence>
        </AuthProvider>
    );
}

export default App;
