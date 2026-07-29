import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAuthProfile } from '@/lib/auth';
import { logout } from '@/lib/actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await getAuthProfile();
  if (!profile) redirect('/login');
  if (!['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard');
  const t = await getTranslations('admin.nav');

  const { count: pendingCount } = await supabase
    .from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending_confirmation');

  const links: { href: string; label: string; icon: string; badge?: number }[] = [
    { href: '/admin', label: t('dashboard'), icon: '📊' },
    { href: '/admin/orders', label: t('orders'), icon: '📋', badge: pendingCount ?? 0 },
    { href: '/admin/customers', label: t('customers'), icon: '👥' },
    { href: '/admin/products', label: t('products'), icon: '👕' },
    { href: '/admin/production', label: t('production'), icon: '⚙' },
    { href: '/admin/shipping', label: t('shipping'), icon: '🚚' },
    { href: '/admin/analytics', label: t('analytics'), icon: '📈' },
    { href: '/admin/promos', label: t('promos'), icon: '🎟' },
    { href: '/admin/settings', label: t('settings'), icon: '⚙️' },
    ...(profile.role === 'super_admin' ? [{ href: '/admin/admins', label: t('admins'), icon: '🔑' }] : []),
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-bg border-e border-border p-6 hidden md:flex flex-col fixed h-screen">
        <Link href="/" className="font-heading text-3xl gradient-text">DROPIX</Link>
        <p className="text-[11px] text-primary mb-8 font-semibold tracking-wide">{t('admin').toUpperCase()}</p>
        <nav className="flex flex-col gap-1 flex-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-white hover:bg-surface-hover transition">
              <span>{l.icon}</span> {l.label}
              {!!l.badge && (
                <span className="ms-auto bg-gradient-neon text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <div className="text-sm">
            <div className="text-white font-semibold">{profile.first_name ?? t('admin')}</div>
            <div className="text-text-secondary text-xs">{profile.email}</div>
            <div className="text-primary text-xs mt-0.5">{profile.role === 'super_admin' ? t('superAdminRole') : t('adminRole')}</div>
          </div>
          <form action={logout}><button className="text-red-400 text-sm mt-2 hover:underline">{t('logout')}</button></form>
        </div>
      </aside>
      <main className="flex-1 md:ms-60 p-8">{children}</main>
    </div>
  );
}
