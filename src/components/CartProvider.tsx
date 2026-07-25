'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface CartItem {
  id: string;
  product_id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  size: string;
  qty: number;
  garment_color?: string;
  preset: string;
  qrColor?: string;
  text?: { enabled: boolean; content?: string; position: 'above' | 'below' | 'none'; font?: string; color?: string; size?: number };
  logo: { choice: 'badge' | 'wordmark'; position?: 'center' | 'top_left' };
}

const CART_STORAGE_KEY = 'dropix_cart_v1';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

// No customer account is required to buy (guest checkout, DRP-WF-VIS-007),
// so the cart lives in localStorage rather than a server-side table —
// it only needs to survive across page navigations on this device.
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* corrupt/unavailable storage — start with an empty cart */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(50, qty)) } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clear, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
