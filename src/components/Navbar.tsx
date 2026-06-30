import Link from 'next/link';
import { getAuthProfile } from '@/lib/auth';

export async function Navbar() {
  const { profile } = await getAuthProfile();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-bg/80 backdrop-blur-xl border-b border-border">
      <Link href="/" className="font-heading text-3xl tracking-widest gradient-text">DRIPPY</Link>
      <div className="flex items-center gap-2">
        <Link href="/shop" className="px-4 py-2 text-sm text-text-secondary hover:text-white transition">Collection</Link>
        {profile ? (
          <>
            <Link href={profile.role === 'customer' ? '/dashboard' : '/admin'}
              className="px-4 py-2 text-sm text-text-secondary hover:text-white transition">
              Mon espace
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="btn-secondary !px-4 !py-2 !text-[13px]">Déconnexion</button>
            </form>
          </>
        ) : (
          <Link href="/login" className="btn-primary !px-4 !py-2 !text-[13px]">Se connecter</Link>
        )}
      </div>
    </nav>
  );
}
