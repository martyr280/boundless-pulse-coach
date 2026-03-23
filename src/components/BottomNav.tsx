import { NavLink } from 'react-router-dom';
import { Home, Target, Camera, Brain, BarChart3, MessageCircle, Users } from 'lucide-react';

const tabs = [
  { to: '/', icon: Home, label: 'Pulse' },
  { to: '/checkin', icon: Target, label: 'Check-in' },
  { to: '/scanner', icon: Camera, label: 'Bridge' },
  { to: '/coach', icon: Brain, label: 'Coach' },
  { to: '/correlations', icon: BarChart3, label: 'Insights' },
  { to: '/nudges', icon: MessageCircle, label: 'Nudges' },
  { to: '/coaches', icon: Users, label: 'Coaches' },
];

const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50">
    <div className="max-w-lg mx-auto flex">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
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
