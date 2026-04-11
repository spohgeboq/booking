import { Link } from 'react-router-dom';
import { useDataStore } from '../../store/useDataStore';

export function Footer() {
    const { settings } = useDataStore();
    return (
        <footer className="border-t border-border bg-neutral-bg1/50 backdrop-blur-md pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="md:col-span-1">
                    <Link to="/" className="text-3xl font-serif font-bold text-white tracking-wide block mb-4">
                        {settings?.company_name || "L'AURA"}
                    </Link>
                    <p className="text-text-secondary text-sm">
                        Премиальный сервис красота и стиля. Ваше время бесценно, наш профессионализм безупречен.
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold text-white mb-6">Навигация</h4>
                    <ul className="flex flex-col gap-3">
                        <li><Link to="/about" className="text-sm text-text-secondary hover:text-brand-light transition-colors">О нас</Link></li>
                        <li><Link to="/services" className="text-sm text-text-secondary hover:text-brand-light transition-colors">Услуги и Цены</Link></li>
                        <li><Link to="/team" className="text-sm text-text-secondary hover:text-brand-light transition-colors">Наши Мастера</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-white mb-6">Контакты</h4>
                    <ul className="flex flex-col gap-3 text-sm text-text-secondary">
                        <li>{settings?.address || 'г. Москва, ул. Премиальная, 1'}</li>
                        <li>{settings?.phone || '+7 (999) 000-00-00'}</li>
                        <li>{settings?.working_hours || 'Ежедневно с 10:00 до 22:00'}</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-white mb-6">Соцсети</h4>
                    <ul className="flex flex-col gap-3">
                        <li><a href="#" className="text-sm text-text-secondary hover:text-brand-light transition-colors">Instagram</a></li>
                        <li><a href="#" className="text-sm text-text-secondary hover:text-brand-light transition-colors">WhatsApp</a></li>
                        <li><a href="#" className="text-sm text-text-secondary hover:text-brand-light transition-colors">Telegram</a></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between text-xs text-text-muted">
                <p>© {new Date().getFullYear()} {settings?.company_name || "L'AURA Studio"}. Все права защищены.</p>
                <div className="flex gap-4 mt-4 md:mt-0">
                    <a href="#" className="hover:text-text-secondary transition-colors">Политика конфиденциальности</a>
                    <a href="#" className="hover:text-text-secondary transition-colors">Договор оферты</a>
                </div>
            </div>
        </footer>
    );
}
