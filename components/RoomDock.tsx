"use client";
import { useRouter } from 'next/navigation';
import { Home, Sprout, Armchair, Package, Music2, ChartNoAxesCombined, ShieldCheck } from 'lucide-react';
import styles from './room-dock.module.css';

const sections = [
  { id: 'room', label: 'Комната', icon: Home },
  { id: 'progress', label: 'Развитие', icon: Sprout },
  { id: 'shop', label: 'Магазин', icon: Armchair },
  { id: 'inventory', label: 'Мои вещи', icon: Package },
  { id: 'music', label: 'Музыка', icon: Music2 },
  { id: 'stats', label: 'Статистика', icon: ChartNoAxesCombined },
  { id: 'admin', label: 'Мастерская', icon: ShieldCheck },
];

export default function RoomDock({ active, onNavigate, showAdmin = true }: { active: string; onNavigate?: (section: string) => void; showAdmin?: boolean }) {
  const router = useRouter();
  return <nav className={styles.dock} aria-label="Основное меню">
    {sections.filter(section => showAdmin || section.id !== 'admin').map(({ id, label, icon: Icon }) => <button key={id} type="button" className={styles.item}
      aria-label={label} aria-current={active === id ? 'page' : undefined}
      onClick={() => {
        if (id === 'admin') router.push('/admin');
        else if (onNavigate) onNavigate(id);
        else router.push(id === 'room' ? '/room' : `/room?view=${id}`);
      }}>
      <Icon aria-hidden="true" size={20} strokeWidth={1.75}/>
      <span className={styles.label}>{label}</span>
      <span className={styles.tooltip} aria-hidden="true">{label}</span>
    </button>)}
  </nav>;
}
