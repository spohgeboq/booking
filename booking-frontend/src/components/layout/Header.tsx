import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Menu, User, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookingStore } from '../../store/useBookingStore';
import { useDataStore } from '../../store/useDataStore';
import { api } from '../../lib/api';

export function Header() {
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { openBooking, openAppointments } = useBookingStore();
    const { settings } = useDataStore();

    // Админский доступ (пасхалка 5 кликов)
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogoClick = () => {
        const now = Date.now();
        // Сбросить, если между кликами больше 2 секунд
        if (now - lastClickTime > 2000) {
            setClickCount(1);
        } else {
            const newCount = clickCount + 1;
            setClickCount(newCount);
            if (newCount >= 5) {
                setShowAdminLogin(true);
                setClickCount(0);
            }
        }
        setLastClickTime(now);
    };

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setAdminError('');

        try {
            const data = await api.auth.login({
                email: adminEmail,
                password: adminPassword,
            });

            setIsLoading(false);

            if (data?.token) {
                setShowAdminLogin(false);
                const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5173/';
                // Передаем JWT токен в админку через хеш
                window.location.href = `${adminUrl}#access_token=${data.token}`;
            } else {
                setAdminError('Неверный логин или пароль');
            }
        } catch (err: any) {
            setIsLoading(false);
            setAdminError(err.message || 'Ошибка входа');
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <header
                className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-panel py-3' : 'bg-transparent py-5'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
                    <Link
                        to="/"
                        onClick={handleLogoClick}
                        className="text-2xl font-serif font-bold text-white tracking-wide select-none"
                    >
                        {settings?.company_name || "L'AURA"}
                    </Link>

                    {/* Десктопная навигация */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link to="/about" className={`text-sm font-medium transition-all ${location.pathname === '/about' ? 'text-brand-light drop-shadow-[0_0_8px_rgba(130,81,238,0.5)]' : 'text-text-secondary hover:text-brand-light'}`}>О нас</Link>
                        <Link to="/services" className={`text-sm font-medium transition-all ${location.pathname === '/services' ? 'text-brand-light drop-shadow-[0_0_8px_rgba(130,81,238,0.5)]' : 'text-text-secondary hover:text-brand-light'}`}>Услуги</Link>
                        <Link to="/team" className={`text-sm font-medium transition-all ${location.pathname === '/team' ? 'text-brand-light drop-shadow-[0_0_8px_rgba(130,81,238,0.5)]' : 'text-text-secondary hover:text-brand-light'}`}>Мастера</Link>
                    </nav>

                    <div className="hidden lg:flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={openAppointments}>
                            <User className="w-5 h-5" />
                        </Button>
                        <Button onClick={openBooking}>
                            Записаться
                        </Button>
                    </div>

                    {/* Мобильная кнопка бургера */}
                    <div className="md:hidden flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={openAppointments}>
                            <User className="w-5 h-5" />
                        </Button>
                        <button
                            className="touch-target text-white"
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Мобильное меню — боковая панель */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            initial={{ opacity: 0, x: '100%' }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 z-[60] w-[80%] max-w-sm bg-black/40 backdrop-blur-xl border-l border-white/5 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] flex flex-col pt-6 px-6 pb-8 md:hidden overflow-hidden"
                        >
                            {/* Скрытые неоновые блики на заднем фоне меню */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/2 pointer-events-none" />

                            {/* Контент */}
                            <div className="relative z-10 flex justify-between items-center mb-12">
                                <span className="text-xl font-serif font-bold text-white tracking-wide">{settings?.company_name || "L'AURA"}</span>
                                <button
                                    className="touch-target text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all flex items-center justify-center p-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <nav className="relative z-10 flex flex-col gap-8 flex-1 mt-4">
                                {[
                                    { path: '/about', label: 'О нас' },
                                    { path: '/services', label: 'Услуги' },
                                    { path: '/team', label: 'Мастера' },
                                ].map((item, index) => (
                                    <motion.div
                                        key={item.path}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                                    >
                                        <Link
                                            to={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`text-2xl font-serif font-medium transition-all duration-300 relative inline-block ${
                                                location.pathname === item.path
                                                    ? 'text-white drop-shadow-[0_0_12px_rgba(130,81,238,0.8)]'
                                                    : 'text-white/60 hover:text-white hover:drop-shadow-[0_0_8px_rgba(130,81,238,0.5)]'
                                            }`}
                                        >
                                            {item.label}
                                            {/* Неоновая линия под активным пунктом */}
                                            {location.pathname === item.path && (
                                                <motion.div 
                                                    layoutId="mobileActiveNav" 
                                                    className="absolute -bottom-3 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" 
                                                />
                                            )}
                                        </Link>
                                    </motion.div>
                                ))}
                            </nav>

                            <div className="relative z-10 flex flex-col mt-auto pt-6">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.4 }}
                                >
                                    <button
                                        onClick={() => { setMobileMenuOpen(false); openBooking(); }}
                                        className="w-full relative group overflow-hidden rounded-xl font-medium text-base py-4"
                                    >
                                        {/* Неоновая обводка кнопки */}
                                        <div className="absolute inset-0 rounded-xl border border-primary/40 transition-colors group-hover:border-primary/80"></div>
                                        {/* Глубокий, слегка светящийся фон */}
                                        <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors backdrop-blur-sm"></div>
                                        
                                        <span className="relative z-10 text-white font-medium group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] transition-all">
                                            Записаться онлайн
                                        </span>
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Секретное окно входа для администратора */}
            <AnimatePresence>
                {showAdminLogin && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowAdminLogin(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-neutral-bg2 border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl relative z-10 w-full max-w-md"
                        >
                            <button
                                className="absolute top-4 right-4 text-text-secondary hover:text-white"
                                onClick={() => setShowAdminLogin(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-serif font-bold text-white mb-2">Вход для администратора</h2>
                            <p className="text-text-secondary mb-6 text-sm">Введите данные учетной записи для доступа к системе управления.</p>

                            <form onSubmit={handleAdminLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand transition-colors"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Пароль</label>
                                    <input
                                        type="password"
                                        required
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {adminError && (
                                    <div className="text-error text-sm bg-error/10 p-3 rounded-lg">
                                        {adminError}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full mt-2"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Вход...' : 'Войти в админ-панель'}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
