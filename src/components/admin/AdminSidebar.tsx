/**
 * Admin Sidebar Navigation
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Palette, 
  Languages, 
  Video, 
  Users, 
  Download,
  Home,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Thème', href: '/admin/theme', icon: Palette },
  { name: 'Traductions', href: '/admin/translations', icon: Languages },
  { name: 'Sessions', href: '/admin/sessions', icon: Video },
  { name: 'Accès', href: '/admin/access', icon: ShieldCheck },
  { name: 'Paiements', href: '/admin/payments', icon: CreditCard },
  { name: 'Utilisateurs', href: '/admin/users', icon: Users },
  { name: 'Export', href: '/admin/export', icon: Download },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-800">
          <Link href="/admin/dashboard" className="text-2xl font-bold">
            🎵 Tribeat Admin
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                        data-testid={`admin-nav-${item.name.toLowerCase().replace(/ /g, '-')}`}
                      >
                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Retour accueil */}
            <li className="mt-auto">
              <Link
                href="/"
                className="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid="admin-nav-home"
              >
                <Home className="h-6 w-6 shrink-0" aria-hidden="true" />
                Retour Accueil
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
