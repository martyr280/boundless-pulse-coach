import { NavLink } from 'react-router-dom';
import { Home, Target, ClipboardList, ListChecks, Brain } from 'lucide-react';

const tabs = [
  { to: '/', icon: Home, label: 'Pulse' },
  { to: '/checkin', icon: Target, label: 'Your Now' },
  { to: '/lci', icon: ClipboardList, label: 'LCI' },
  { to: '/actions', icon: ListChecks, label: 'Actions' },
  { to: '/coach', icon: Brain, label: 'Coach' },
];

const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50">
    <div className="max-w-lg mx-auto flex">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          <Icon className="h-5 w-5 mb-0.5" />
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default BottomNav;
