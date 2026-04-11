import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Calendar,
    Settings,
    Briefcase,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const NAVIGATION = [
    { name: 'Расписание', path: '/schedule', icon: Calendar },
    { name: 'Сотрудники', path: '/employees', icon: Users },
    { name: 'Услуги', path: '/services', icon: Briefcase },
    { name: 'Настройки', path: '/settings', icon: Settings },
];

export function Layout() {
    const location = useLocation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const SidebarContent = () => (
        <>
            <div className="flex items-center justify-between h-16 px-6">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-light to-brand">
                    Admin CRM
                </h1>
            </div>
            <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {NAVIGATION.map((item) => {
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
                <h1 className="text-lg font-bold text-brand-light">Admin CRM</h1>
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
