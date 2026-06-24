import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthProfile } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getAuthProfile();
  if (!profile) redirect('/login');
  if (!['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard');

  const links = [
    { href: '/admin', label: 'Commandes', icon: '📋' },
    { href: '/admin/customers', label: 'Clients', icon: '👥' },
    { href: '/admin/products', label: 'Produits', icon: '👕' },
    { href: '/admin/production', label: 'Production', icon: '⚙' },
    { href: '/admin/analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-bg border-r border-border p-6 hidden md:flex flex-col fixed h-screen">
        <Link href="/" className="font-heading text-3xl gradient-text">DRIPPY</Link>
        <p className="text-[11px] text-primary mb-8 font-semibold tracking-wide">ADMIN</p>
        <nav className="flex flex-col gap-1 flex-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-white hover:bg-surface-hover transition">
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <div className="text-sm"><div className="text-white font-semibold">Admin</div><div className="text-text-secondary">{profile.email}</div></div>
          <form action="/api/auth/logout" method="post"><button className="text-red-400 text-sm mt-2 hover:underline">Déconnexion</button></form>
        </div>
      </aside>
      <main className="flex-1 md:ml-60 p-8">{children}</main>
    </div>
  );
}
