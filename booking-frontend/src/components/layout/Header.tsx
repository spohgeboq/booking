import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Menu, User, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookingStore } from '../../store/useBookingStore';
import { useDataStore } from '../../store/useDataStore';
import { supabase } from '../../lib/supabase';

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

        const { data, error } = await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword,
        });

        setIsLoading(false);

        if (error) {
            setAdminError('Неверный логин или пароль');
        } else {
            setShowAdminLogin(false);
            // Перенаправляем в админку с передачей токена через хэш (раз мы используем Supabase, мы можем просто перейти. 
            // Но чтобы админка поймала сессию на другом домене/порту нужны доп. меры.
            // Для локальной разработки перенаправляем на адрес админки:
            const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5173/';
            // Передача access_token в URL хэше позволяет админке подхватить сессию (PKCE предпочтительней, но для локалки сойдет)
            window.location.href = `${adminUrl}#access_token=${data.session?.access_token}&refresh_token=${data.session?.refresh_token}&expires_in=${data.session?.expires_in}&token_type=bearer&type=recovery`;
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
                        <Button variant="ghost" size="icon" className="rounded-full">
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

            {/* Мобильное меню на весь экран */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: '-100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '-100%' }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 z-[60] bg-neutral-bg1 flex flex-col pt-6 px-6 pb-12"
                    >
                        <div className="flex justify-between items-center mb-12">
                            <span className="text-2xl font-serif font-bold text-white tracking-wide">{settings?.company_name || "L'AURA"}</span>
                            <button
                                className="touch-target text-white bg-white/5 rounded-full"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <nav className="flex flex-col gap-6 flex-1 text-center mt-12">
                            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className={`text-3xl font-serif transition-colors ${location.pathname === '/about' ? 'text-brand-light' : 'text-white hover:text-brand-light'}`}>О нас</Link>
                            <Link to="/services" onClick={() => setMobileMenuOpen(false)} className={`text-3xl font-serif transition-colors ${location.pathname === '/services' ? 'text-brand-light' : 'text-white hover:text-brand-light'}`}>Услуги</Link>
                            <Link to="/team" onClick={() => setMobileMenuOpen(false)} className={`text-3xl font-serif transition-colors ${location.pathname === '/team' ? 'text-brand-light' : 'text-white hover:text-brand-light'}`}>Мастера</Link>
                        </nav>

                        <div className="flex flex-col gap-4 mt-auto">
                            <Button size="lg" className="w-full text-lg" onClick={() => { setMobileMenuOpen(false); openBooking(); }}>Записаться онлайн</Button>
                            <Button variant="outline" size="lg" className="w-full text-lg" onClick={() => { setMobileMenuOpen(false); openAppointments(); }}>Мои записи</Button>
                        </div>
                    </motion.div>
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
