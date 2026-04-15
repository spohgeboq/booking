import { useState, useEffect } from 'react';
import { Save, Building2, Phone, Mail, MapPin, Loader2, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

interface SettingsData {
    company_name: string;
    phone: string;
    email: string;
    address: string;
    about_us_image: string;
    gallery: string[];
}

export function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAboutUs, setUploadingAboutUs] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);

    const [settings, setSettings] = useState<SettingsData | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await api.settings.get();

            if (data) {
                setSettings({
                    company_name: data.company_name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    about_us_image: data.about_us_image || '',
                    gallery: data.gallery || []
                });
            } else {
                // Если настроек нет, инициализируем пустой объект. 
                // Бэкенд создаст запись при первом сохранении.
                setSettings({
                    company_name: '',
                    phone: '',
                    email: '',
                    address: '',
                    about_us_image: '',
                    gallery: []
                });
            }
        } catch (error: any) {
            toast.error('Ошибка загрузки настроек: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        const { name, value } = e.target;
        setSettings({
            ...settings,
            [name]: value
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setSaving(true);
        try {
            await api.settings.update(settings);
            toast.success('Настройки успешно сохранены');
        } catch (error: any) {
            toast.error('Не удалось сохранить настройки: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (file: File, type: 'about_us' | 'gallery') => {
        if (type === 'about_us') setUploadingAboutUs(true);
        else setUploadingGallery(true);

        try {
            const { url } = await api.upload(file);

            if (type === 'about_us') {
                setSettings(prev => prev ? { ...prev, about_us_image: url } : prev);
            } else {
                setSettings(prev => prev ? { ...prev, gallery: [...(prev.gallery || []), url] } : prev);
            }
            toast.success('Фото загружено');
        } catch (error: any) {
            toast.error('Ошибка загрузки: ' + error.message);
        } finally {
            if (type === 'about_us') setUploadingAboutUs(false);
            else setUploadingGallery(false);
        }
    };

    const removeGalleryImage = (indexToRemove: number) => {
        setSettings(prev => prev ? {
            ...prev,
            gallery: prev.gallery.filter((_, idx) => idx !== indexToRemove)
        } : prev);
    };

    const removeAboutUsImage = () => {
        setSettings(prev => prev ? { ...prev, about_us_image: '' } : prev);
    };

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-text1">Настройки</h1>
                    <p className="text-neutral-text2 mt-1">Информация о компании — отображается на клиентском сайте</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Информация о компании */}
                <div className="bg-neutral-bg2/80 backdrop-blur-xl rounded-2xl border border-neutral-border overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-neutral-border bg-neutral-bg3/30 flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-neutral-text1">Информация о компании</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-text2 mb-1">Название салона / компании</label>
                            <input
                                type="text" name="company_name" value={settings.company_name} onChange={handleChange} required
                                className="w-full px-4 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            />
                            <p className="text-xs text-neutral-text3 mt-1">Отображается в шапке и подвале клиентского сайта</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-text2 mb-1">Номер телефона</label>
                            <div className="relative">
                                <Phone className="w-4 h-4 absolute pl-3 inset-y-0 my-auto text-neutral-text3" />
                                <input
                                    type="text" name="phone" value={settings.phone} onChange={handleChange}
                                    className="w-full pl-9 pr-4 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-text2 mb-1">Электронная почта</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute pl-3 inset-y-0 my-auto text-neutral-text3" />
                                <input
                                    type="email" name="email" value={settings.email} onChange={handleChange}
                                    className="w-full pl-9 pr-4 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-text2 mb-1">Адрес</label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 absolute pl-3 inset-y-0 my-auto text-neutral-text3" />
                                <input
                                    type="text" name="address" value={settings.address} onChange={handleChange}
                                    className="w-full pl-9 pr-4 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                />
                            </div>
                            <p className="text-xs text-neutral-text3 mt-1">Отображается в подвале сайта и в записи</p>
                        </div>
                    </div>
                </div>

                {/* Изображения для клиентского сайта */}
                <div className="bg-neutral-bg2/80 backdrop-blur-xl rounded-2xl border border-neutral-border overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-neutral-border bg-neutral-bg3/30 flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-neutral-text1">Изображения для клиентского сайта</h2>
                    </div>
                    <div className="p-6 space-y-8">
                        {/* Главное фото */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-text2 mb-2">Главное фото (Секция "О нас")</label>
                            <div className="flex items-center gap-4">
                                {settings.about_us_image && (
                                    <div className="relative group w-32 h-20 rounded-xl overflow-hidden border border-neutral-border bg-neutral-bg3 shrink-0">
                                        <img src={settings.about_us_image} alt="О нас" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={removeAboutUsImage}
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-5 h-5 text-red-400" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file" accept="image/*"
                                        disabled={uploadingAboutUs}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload(file, 'about_us');
                                        }}
                                        className="w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light disabled:opacity-50"
                                    />
                                    {uploadingAboutUs && <div className="text-xs text-primary mt-2 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Загрузка...</div>}
                                </div>
                            </div>
                            <p className="text-xs text-neutral-text3 mt-2">Это фото отображается на странице "О нас" на клиентском сайте</p>
                        </div>

                        {/* Галерея */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-text2 mb-2">Галерея</label>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                                {settings.gallery?.map((url, idx) => (
                                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-neutral-border aspect-square bg-neutral-bg3">
                                        <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage(idx)}
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-8 h-8 text-red-400 hover:text-red-500" />
                                        </button>
                                    </div>
                                ))}
                                <label className="flex flex-col items-center justify-center cursor-pointer rounded-xl border border-dashed border-neutral-border hover:border-primary/50 hover:bg-neutral-bg3/30 transition-colors aspect-square text-neutral-text3 hover:text-primary">
                                    {uploadingGallery ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 mb-2" />
                                            <span className="text-sm font-medium">Добавить фото</span>
                                        </>
                                    )}
                                    <input
                                        type="file" accept="image/*" className="hidden"
                                        disabled={uploadingGallery}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload(file, 'gallery');
                                        }}
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-neutral-text3">Эти фото отображаются в галерее на странице "О нас"</p>
                        </div>
                    </div>
                </div>

                {/* Кнопка сохранения */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit" disabled={saving}
                        className="flex items-center px-6 py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        {saving ? 'Сохранение...' : 'Сохранить настройки'}
                    </button>
                </div>
            </form>
        </div>
    );
}
