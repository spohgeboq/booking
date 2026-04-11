import { useState } from 'react';
import { useBookingStore } from '../../../store/useBookingStore';
import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export function ClientDetails() {
    const { setClientDetails } = useBookingStore();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && phone.trim()) {
            setClientDetails({ name, phone });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
        >
            <div>
                <h3 className="text-2xl font-serif text-white mb-2">Ваши данные</h3>
                <p className="text-sm text-text-secondary">Для подтверждения записи и оперативной связи</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label htmlFor="name" className="text-sm font-medium text-text-secondary">Имя</label>
                    <Input
                        id="name"
                        placeholder="Как к вам обращаться?"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="phone" className="text-sm font-medium text-text-secondary">Номер телефона</label>
                    <Input
                        id="phone"
                        type="tel"
                        placeholder="+7 (___) ___-__-__"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                    />
                </div>

                <div className="mt-8">
                    <Button type="submit" className="w-full" size="lg" disabled={!name || !phone}>
                        Подтвердить запись
                    </Button>
                    <p className="text-xs text-text-muted text-center mt-4">
                        Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных.
                    </p>
                </div>
            </form>
        </motion.div>
    );
}
