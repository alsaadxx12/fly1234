import {
  Building2,
  Users,
  Wallet,
  Box,
  Megaphone,
  Settings,
  LayoutDashboard,
  Link as LinkIcon,
  DollarSign,
  CheckSquare,
  AlertTriangle,
  CreditCard,
  MapPin,
  FileClock,
  UserCheck,
  Briefcase,
  Shield,
  LayoutGrid
} from 'lucide-react';

export const menuItems = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    textKey: 'dashboard',
  },
  {
    path: '/attendance',
    icon: UserCheck,
    textKey: 'تسجيل الحضور',
  },
  {
    textKey: 'الموظفين',
    icon: Users,
    subItems: [
      {
        path: '/employees',
        icon: Users,
        textKey: 'employees',
      },
      {
        path: '/departments',
        icon: Briefcase,
        textKey: 'الأقسام',
      },
      {
        path: '/branches',
        icon: MapPin,
        textKey: 'الفروع',
      },
      {
        path: '/attendance-reports',
        icon: FileClock,
        textKey: 'تقارير الحضور',
      },
      {
        path: '/leaves',
        icon: CheckSquare,
        textKey: 'الإجازات',
      },
    ]
  },
  {
    textKey: 'الحسابات',
    icon: Wallet,
    subItems: [
      {
        path: '/accounts',
        icon: Wallet,
        textKey: 'accounts',
        permissions: ['view', 'add', 'edit', 'delete', 'print', 'currency', 'settlement', 'confirm', 'read'],
      },
      {
        path: '/balances',
        icon: DollarSign,
        textKey: 'الأرصدة',
      },
      {
        path: '/safes',
        icon: Box,
        textKey: 'safes',
      }
    ]
  },
  {
    textKey: 'الشركات والإعلانات',
    icon: Building2,
    subItems: [
      {
        path: '/companies',
        icon: Building2,
        textKey: 'companies',
      },
      {
        path: '/announcements',
        icon: Megaphone,
        textKey: 'announcements',
      },
    ]
  },
  {
    textKey: 'المشاكل والتقارير',
    icon: AlertTriangle,
    subItems: [
      {
        path: '/pending-issues',
        icon: AlertTriangle,
        textKey: 'المشاكل المعلقة',
      },
      {
        path: '/mastercard-issues',
        icon: CreditCard,
        textKey: 'مشاكل بوابة الماستر',
      },
      {
        path: '/reports',
        icon: Megaphone,
        textKey: 'التبليغات',
      },
    ]
  },
  {
    textKey: 'الإعدادات والربط',
    icon: Settings,
    subItems: [
      {
        path: '/settings',
        icon: Settings,
        textKey: 'settings',
      },
      {
        path: '/security',
        icon: Shield,
        textKey: 'الأمان والحماية',
      },
      {
        path: '/api-integrations',
        icon: LinkIcon,
        textKey: 'ربط API',
      },
      {
        path: '/data-fly',
        textKey: 'داتا فلاي (Data Fly)',
        icon: LayoutGrid,
        permissions: { page: 'الإعدادات والربط', actions: ['view'] }
      }
    ]
  }
];
