import { PageTransition } from '../components/layout/AppShell';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { MasterProfileModal } from '../components/team/MasterProfileModal';
import { useDataStore, Employee } from '../store/useDataStore';

export default function Team() {
    const { employees } = useDataStore();
    const [selectedMaster, setSelectedMaster] = useState<Employee | null>(null);
    return (
        <PageTransition>
            <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl"
                >
                    <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">Мастера</h1>
                    <p className="text-lg text-text-secondary">
                        Люди — главный актив L'AURA. Истинные профессионалы, визионеры и перфекционисты, преданные своему делу.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {employees.map((master, i) => (
                        <motion.div
                            key={master.id}
                            layoutId={`master-card-${master.id}`}
                            onClick={() => setSelectedMaster(master)}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="group cursor-pointer text-center flex flex-col items-center gap-6"
                        >
                            <motion.div
                                layoutId={`master-img-container-${master.id}`}
                                className="relative w-full aspect-square md:w-64 md:h-64 rounded-[2rem] overflow-hidden border border-border group-hover:border-brand-light transition-colors p-2"
                            >
                                <div className="w-full h-full rounded-[1.5rem] overflow-hidden">
                                    <motion.img
                                        layoutId={`master-img-${master.id}`}
                                        src={master.avatar_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop'}
                                        alt={`${master.first_name} ${master.last_name}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 grayscale group-hover:grayscale-0"
                                    />
                                </div>
                            </motion.div>
                            <div>
                                <h3 className="text-2xl font-serif text-white mb-2">{master.first_name} {master.last_name}</h3>
                                <p className="text-sm font-medium tracking-wide uppercase text-brand-light">{master.specialization}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Выезжающая панель профиля (Shared Layout Animation) */}
            <MasterProfileModal
                master={selectedMaster}
                onClose={() => setSelectedMaster(null)}
            />
        </PageTransition>
    );
}
