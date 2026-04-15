import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Scissors, Plus, Edit, Trash2, Loader2, Search, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Service {
    id: string;
    name: string;
    category: string;
    price: number;
    duration_minutes: number;
    description: string;
    image_url?: string;
}

export function Services() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // For creating/editing
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<Partial<Service>>({
        name: '',
        category: '',
        price: 0,
        duration_minutes: 30,
        description: '',
        image_url: ''
    });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const data = await api.services.getAll();
            setServices(data || []);
        } catch (error: any) {
            toast.error('Ошибка при загрузке услуг: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingService) {
                await api.services.update(editingService.id, formData);
                toast.success('Услуга обновлена');
            } else {
                await api.services.create(formData);
                toast.success('Услуга добавлена');
            }
            setIsModalOpen(false);
            fetchServices();
        } catch (error: any) {
            toast.error('Ошибка при сохранении: ' + error.message);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Вы уверены, что хотите удалить услугу "${name}"?`)) return;
        try {
            await api.services.delete(id);
            toast.success('Услуга удалена');
            fetchServices();
        } catch (error: any) {
            toast.error('Ошибка при удалении: ' + error.message);
        }
    };

    const openCreateModal = () => {
        setEditingService(null);
        setFormData({
            name: '',
            category: '',
            price: 0,
            duration_minutes: 30,
            description: '',
            image_url: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (service: Service) => {
        setEditingService(service);
        setFormData(service);
        setIsModalOpen(true);
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const categories = Array.from(new Set(filteredServices.map(s => s.category || 'Без категории')));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-text1">Услуги</h1>
                    <p className="text-neutral-text2 mt-1">Прайс-лист и управление меню услуг</p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Добавить услугу
                </button>
            </div>

            <div className="bg-neutral-bg2/80 backdrop-blur-xl rounded-2xl border border-neutral-border p-6 shadow-xl relative min-h-[400px]">
                {/* Search */}
                <div className="mb-6 relative max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-neutral-text3" />
                    </div>
                    <input
                        type="text"
                        placeholder="Поиск по названию или категории..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-neutral-border bg-neutral-bg3/50 rounded-xl text-neutral-text1 placeholder-neutral-text3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                {loading ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-neutral-text3">
                        <Scissors className="w-12 h-12 mb-4 opacity-20" />
                        <p>Услуги не найдены</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {categories.map(category => (
                            <div key={category}>
                                <h3 className="text-lg font-semibold text-neutral-text1 border-b border-neutral-border pb-2 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary/80"></span>
                                    {category}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredServices.filter(s => (s.category || 'Без категории') === category).map((service) => (
                                        <div key={service.id} className="bg-neutral-bg3/30 border border-neutral-border hover:border-primary/30 rounded-xl p-4 transition-all group relative overflow-hidden flex flex-col h-full">
                                            {service.image_url && (
                                                <div className="w-full h-32 rounded-lg overflow-hidden mb-4 border border-neutral-border shrink-0">
                                                    <img src={service.image_url.startsWith('http') ? service.image_url : `${import.meta.env.VITE_BACKEND_URL}${service.image_url}`} alt={service.name} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start mb-2 relative z-10">
                                                <h4 className="font-semibold text-neutral-text1 text-base leading-tight pr-12">{service.name}</h4>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0">
                                                    <button
                                                        onClick={() => openEditModal(service)}
                                                        className="p-1.5 bg-neutral-bg2 hover:bg-primary hover:text-white rounded-md transition-colors text-neutral-text3 shadow-sm"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id, service.name)}
                                                        className="p-1.5 bg-neutral-bg2 hover:bg-red-500 hover:text-white rounded-md transition-colors text-neutral-text3 shadow-sm"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-sm text-neutral-text3 mb-4 line-clamp-2 min-h-[40px] relative z-10">
                                                {service.description || 'Описание не заполнено'}
                                            </p>

                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-neutral-border/50 relative z-10">
                                                <span className="text-lg font-bold text-white tracking-tight">
                                                    {service.price.toLocaleString()} ₸
                                                </span>
                                                <span className="flex items-center text-sm font-medium text-neutral-text2 bg-neutral-bg2 px-2.5 py-1 rounded-md border border-neutral-border/50">
                                                    <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                    {service.duration_minutes} мин
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Drawer */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-neutral-bg2 border border-neutral-border rounded-2xl shadow-2xl p-6 w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <h2 className="text-xl font-bold text-neutral-text1 mb-4">
                                {editingService ? 'Редактировать услугу' : 'Новая услуга'}
                            </h2>
                            <form onSubmit={handleSaveService} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-text2 mb-1">Название услуги</label>
                                    <input
                                        type="text" required
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-text2 mb-1">Категория (например: Волосы, Ногти, Барбер)</label>
                                    <input
                                        type="text" required
                                        value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                        placeholder="Стрижки"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-text2 mb-1">Цена (₸)</label>
                                        <input
                                            type="number" required min="0" step="100"
                                            value={formData.price} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-text2 mb-1">Длительность (мин)</label>
                                        <input
                                            type="number" required min="5" step="5"
                                            value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-text2 mb-1">Описание</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-text2 mb-1">Фото услуги</label>
                                    <div className="flex items-center gap-4">
                                        {formData.image_url && (
                                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-neutral-border bg-neutral-bg3 shrink-0">
                                                <img src={formData.image_url.startsWith('http') ? formData.image_url : `${import.meta.env.VITE_BACKEND_URL}${formData.image_url}`} alt="Услуга" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <input
                                                type="file" accept="image/*"
                                                disabled={uploadingImage}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setUploadingImage(true);
                                                    try {
                                                        const data = await api.upload(file);
                                                        setFormData({ ...formData, image_url: data.url });
                                                        toast.success('Фото загружено');
                                                    } catch (error: any) {
                                                        toast.error('Ошибка загрузки: ' + error.message);
                                                    } finally {
                                                        setUploadingImage(false);
                                                    }
                                                }}
                                                className="w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light disabled:opacity-50"
                                            />
                                            {uploadingImage && <div className="text-xs text-primary mt-2 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Загрузка...</div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-neutral-text2 hover:text-white transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                                    >
                                        Сохранить
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
