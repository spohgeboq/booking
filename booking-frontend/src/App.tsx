import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Team from './pages/Team';
import { useDataStore } from './store/useDataStore';

export default function App() {
    const { fetchData } = useDataStore();

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <AppShell>
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/team" element={<Team />} />
                </Routes>
            </AnimatePresence>
        </AppShell>
    );
}
