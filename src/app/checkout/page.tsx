import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckoutInner } from './CheckoutInner';

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <CheckoutInner />
      <Footer />
    </>
  );
}
