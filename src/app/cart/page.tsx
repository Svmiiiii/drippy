import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartClient } from './CartClient';

export default function CartPage() {
  return (
    <>
      <Navbar />
      <CartClient />
      <Footer />
    </>
  );
}
