import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthProfile } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getAuthProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'customer') redirect('/admin');

  const links = [
    { href: '/dashboard', label: 'Mon QR', icon: '◈' },
    { href: '/dashboard/orders', label: 'Mes commandes', icon: '📦' },
    { href: '/dashboard/stats', label: 'Mes statistiques', icon: '📊' },
    { href: '/dashboard/settings', label: 'Paramètres', icon: '⚙' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-bg border-r border-border p-6 hidden md:flex flex-col fixed h-screen">
        <Link href="/" className="font-heading text-3xl gradient-text">DRIPPY</Link>
        <p className="text-xs text-text-secondary mb-8">Espace client</p>
        <nav className="flex flex-col gap-1 flex-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-white hover:bg-surface-hover transition">
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
          <Link href="/shop" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-white hover:bg-surface-hover transition">
            <span>🛒</span> Commander à nouveau
          </Link>
        </nav>
        <div className="border-t border-border pt-4">
          <div className="text-sm"><div className="text-white font-semibold">{profile.first_name ?? 'Client'}</div>
          <div className="text-text-secondary">{profile.drippy_id}</div></div>
          <form action="/api/auth/logout" method="post">
            <button className="text-red-400 text-sm mt-2 hover:underline">Déconnexion</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 md:ml-60 p-8">{children}</main>
    </div>
  );
}
