import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Calendar,
    Settings,
    Briefcase,
    LogOut,
    Menu,
    X,
    Wallet,
    LayoutDashboard
} from 'lucide-react';
import { useState } from 'react';
import { useAuth, UserRole } from '../../contexts/AuthContext';

// Навигация с ролями
interface NavItem {
    name: string;
    path: string;
    icon: any;
    roles?: UserRole[]; // если не указано — доступно всем
}

const NAVIGATION: NavItem[] = [
    { name: 'Мой кабинет', path: '/my-dashboard', icon: LayoutDashboard, roles: ['MASTER'] },
    { name: 'Расписание', path: '/schedule', icon: Calendar },
    { name: 'Сотрудники', path: '/employees', icon: Users, roles: ['OWNER'] },
    { name: 'Услуги', path: '/services', icon: Briefcase, roles: ['OWNER'] },
    { name: 'Финансы', path: '/finance', icon: Wallet, roles: ['OWNER'] },
    { name: 'Настройки', path: '/settings', icon: Settings, roles: ['OWNER'] },
];

export function Layout() {
    const location = useLocation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user } = useAuth();

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
    };

    // Фильтруем навигацию по роли
    const filteredNav = NAVIGATION.filter(item => {
        if (!item.roles) return true; // доступно всем
        return item.roles.includes(user?.role || 'MASTER');
    });

    const SidebarContent = () => (
        <>
            <div className="flex items-center justify-between h-16 px-6">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-light to-brand">
                    {user?.role === 'MASTER' ? 'Личный кабинет' : 'Admin CRM'}
                </h1>
            </div>
            <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {filteredNav.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsMobileOpen(false)}
                            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-brand text-white shadow-glow'
                                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                                }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
            <div className="p-4 mt-auto">
                {user && (
                    <div className="mb-3 px-4 py-2 text-xs text-text-secondary border border-white/5 rounded-lg bg-white/3">
                        <div className="font-medium text-text-primary truncate">{user.email}</div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider opacity-60">
                            {user.role === 'OWNER' ? 'Владелец' : 'Мастер'}
                        </div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-text-secondary rounded-lg hover:bg-error/10 hover:text-error transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="font-medium">Выйти</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-neutral-bg1 text-text-primary overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-white/5 z-20">
                <SidebarContent />
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between h-16 w-full px-4 glass-panel border-b border-white/5 fixed top-0 z-30">
                <h1 className="text-lg font-bold text-brand-light">
                    {user?.role === 'MASTER' ? 'Личный кабинет' : 'Admin CRM'}
                </h1>
                <button onClick={() => setIsMobileOpen(true)} className="p-2 text-text-secondary">
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            className="fixed inset-y-0 left-0 w-64 glass-panel z-50 flex flex-col shadow-2xl md:hidden border-r border-white/10"
                        >
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                className="absolute top-4 right-4 p-2 text-text-secondary hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden pt-16 md:pt-0">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                <div className="p-6 md:p-8 w-full max-w-7xl mx-auto z-10">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Outlet />
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
