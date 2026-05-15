import { ComponentType } from 'react';
import { AppRole } from '@/contexts/AuthContext';
import Index from '@/pages/Index';
import CheckIn from '@/pages/CheckIn';
import Scanner from '@/pages/Scanner';
import Coach from '@/pages/Coach';
import Correlations from '@/pages/Correlations';
import Nudges from '@/pages/Nudges';
import CoachDashboard from '@/pages/CoachDashboard';
import LCI from '@/pages/LCI';
import LCINew from '@/pages/LCINew';
import LCIGuided from '@/pages/LCIGuided';
import Actions from '@/pages/Actions';
import Weekly from '@/pages/Weekly';
import Guide from '@/pages/Guide';
import Onboarding from '@/pages/Onboarding';
import Profile from '@/pages/Profile';
import Partner from '@/pages/Partner';

export interface ProtectedRouteConfig {
  path: string;
  component: ComponentType;
  /** If omitted, route only requires authentication. */
  allowedRoles?: AppRole[];
  /** Optional human label (used by nav / debugging). */
  label?: string;
}

/**
 * Single source of truth for every authenticated route.
 * Add a new entry here instead of editing <Routes> directly so that
 * permission checks stay consistent across the app.
 */
export const protectedRoutes: ProtectedRouteConfig[] = [
  { path: '/',            component: Index,          label: 'Pulse' },
  { path: '/onboarding',  component: Onboarding,     label: 'Onboarding' },
  { path: '/profile',     component: Profile,        label: 'Profile' },
  { path: '/partner',     component: Partner,        label: 'Partner' },
  { path: '/weekly',      component: Weekly,         label: 'Weekly' },
  { path: '/checkin',     component: CheckIn,        label: 'Your Now' },
  { path: '/guide',       component: Guide,          label: 'Guide' },
  { path: '/scanner',     component: Scanner,        label: 'Scanner' },
  { path: '/coach',       component: Coach,          label: 'AI Coach' },
  { path: '/correlations',component: Correlations,   label: 'Correlations' },
  { path: '/nudges',      component: Nudges,         label: 'Nudges' },
  { path: '/lci',         component: LCI,            label: 'LCI' },
  { path: '/lci/new',         component: LCINew,         label: 'New LCI' },
  { path: '/lci/guided',      component: LCIGuided,      label: 'Guided LCI' },
  { path: '/lci/guided/:id',  component: LCIGuided,      label: 'Guided LCI' },
  { path: '/actions',     component: Actions,        label: 'Actions' },

  // Coach / admin only
  {
    path: '/coaches',
    component: CoachDashboard,
    allowedRoles: ['coach', 'admin'],
    label: 'Coach Dashboard',
  },
];
