export type ApiResponse<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

export interface PrintArea { top: number; left: number; width: number; }

export type ProductCategory = 'tshirts' | 'polos' | 'hoodies_sweats' | 'vestes' | 'sacs_accessoires';
export type ProductCollection = 'ete' | 'automne' | 'hiver' | 'printemps';

export interface ProductColor { name: string; hex: string; image: string; available: boolean; }

export interface Product {
  id: string; slug: string; name: string; description: string | null;
  price_dzd: number; status: 'available' | 'out_of_stock' | 'archived';
  badge: string | null; images: string[]; print_area: PrintArea | null;
  category: ProductCategory | null; collection: ProductCollection | null; colors: ProductColor[];
  dimensions_image: string | null;
  characteristics_fr: string | null; characteristics_en: string | null; characteristics_ar: string | null;
  product_variants?: { id: string; size: string; available: boolean; unavailable_colors?: string[] }[];
}

export interface Profile {
  id: string; dropix_id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; role: 'customer' | 'admin' | 'super_admin';
  account_status: 'pending' | 'active' | 'disabled'; language: string;
}

export interface Order {
  id: string; order_number: string; status: string; customer_name: string;
  customer_phone: string; customer_email: string; wilaya_code: string;
  commune: string; address: string; total_dzd: number; created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string; product_name: string; size: string; quantity: number;
  qr_preset: string; text_enabled: boolean; text_content: string | null;
  text_position: 'above' | 'below' | 'none';
  logo_choice: 'badge' | 'wordmark' | null;
  logo_position: 'center' | 'top_left' | null;
}
