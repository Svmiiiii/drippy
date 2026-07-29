'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatDZD } from '@/lib/utils';
import { ProductQrPreview, DEFAULT_PRINT_AREA } from '@/components/ProductQrPreview';
import { PRODUCT_CATEGORIES, PRODUCT_COLLECTIONS } from '@/lib/validation';
import { sortSizes } from '@/lib/design';
import type { PrintArea } from '@/types';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function ProductModal({ product, onClose }: { product?: any; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations('admin.products');
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price_dzd: product ? String(product.price_dzd) : '',
    status: product?.status ?? 'available',
    category: product?.category ?? '',
    collection: product?.collection ?? '',
  });

  const existingSizes: string[] = sortSizes(product?.product_variants?.map((v: any) => v.size) ?? []);
  const startsMultiple = existingSizes.length > 1 || (existingSizes.length === 1 && existingSizes[0] !== 'Unique');
  const [sizeType, setSizeType] = useState<'unique' | 'multiple'>(startsMultiple ? 'multiple' : 'unique');
  const [sizes, setSizes] = useState<string[]>(startsMultiple ? existingSizes : ['M', 'L', 'XL']);
  const [unavailableCombos, setUnavailableCombos] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const v of product?.product_variants ?? []) {
      for (const color of v.unavailable_colors ?? []) set.add(`${v.size}|${color}`);
    }
    return set;
  });
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [printArea, setPrintArea] = useState<PrintArea>(product?.print_area ?? DEFAULT_PRINT_AREA);
  const [dimensionsImage, setDimensionsImage] = useState<string | null>(product?.dimensions_image ?? null);
  const [uploadingDimensions, setUploadingDimensions] = useState(false);
  const [characteristicsFr, setCharacteristicsFr] = useState(product?.characteristics_fr ?? '');
  const [colors, setColors] = useState<{ name: string; hex: string; image: string; available: boolean }[]>(
    (product?.colors ?? []).map((c: any) => ({ available: true, ...c })),
  );
  const [previewColor, setPreviewColor] = useState<string | null>(product?.colors?.[0]?.name ?? null);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newColorImage, setNewColorImage] = useState<string | null>(null);
  const [uploadingColorImage, setUploadingColorImage] = useState(false);
  const [replacingColorImage, setReplacingColorImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleSize(s: string) {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function uploadNewColorImage(file: File | undefined) {
    if (!file) return;
    setUploadingColorImage(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/products/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) setNewColorImage(json.data.url);
      else setError(json.error?.message ?? t('error'));
    } catch {
      setError(t('networkError'));
    } finally {
      setUploadingColorImage(false);
    }
  }

  function addColor() {
    const name = newColorName.trim();
    if (!name || !newColorImage || colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    setColors((prev) => [...prev, { name, hex: newColorHex, image: newColorImage, available: true }]);
    setPreviewColor((prev) => prev ?? name);
    setNewColorName('');
    setNewColorImage(null);
  }

  async function replaceColorImage(name: string, file: File | undefined) {
    if (!file) return;
    setReplacingColorImage(name);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/products/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) setColors((prev) => prev.map((c) => (c.name === name ? { ...c, image: json.data.url } : c)));
      else setError(json.error?.message ?? t('error'));
    } catch {
      setError(t('networkError'));
    } finally {
      setReplacingColorImage(null);
    }
  }

  function removeColor(name: string) {
    setColors((prev) => prev.filter((c) => c.name !== name));
    setPreviewColor((prev) => (prev === name ? null : prev));
  }

  function toggleColorAvailability(name: string) {
    setColors((prev) => prev.map((c) => (c.name === name ? { ...c, available: !c.available } : c)));
  }

  function toggleCombo(size: string, colorName: string) {
    const key = `${size}|${colorName}`;
    setUnavailableCombos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const previewImageUrl = colors.find((c) => c.name === previewColor)?.image ?? images[0] ?? null;

  const MAX_PHOTOS = 8;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(files.length > remaining ? t('maxPhotosReached', { max: MAX_PHOTOS }) : '');
    try {
      for (const file of toUpload) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/products/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) setImages((prev) => [...prev, json.data.url]);
        else {
          setError(json.error?.message ?? t('error'));
          break;
        }
      }
    } catch {
      setError(t('networkError'));
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function uploadDimensionsImage(file: File | undefined) {
    if (!file) return;
    setUploadingDimensions(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/products/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) setDimensionsImage(json.data.url);
      else setError(json.error?.message ?? t('error'));
    } catch {
      setError(t('networkError'));
    } finally {
      setUploadingDimensions(false);
    }
  }

  async function submit() {
    const price = parseInt(form.price_dzd, 10);
    if (!form.name.trim()) { setError(t('nameRequired')); return; }
    if (!price || price < 0) { setError(t('invalidPrice')); return; }
    if (sizeType === 'multiple' && sizes.length === 0) { setError(t('selectSize')); return; }
    if (images.length > MAX_PHOTOS) { setError(t('maxPhotosReached', { max: MAX_PHOTOS })); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, description: form.description || undefined, price_dzd: price, status: form.status,
          category: form.category || null, collection: form.collection || null, colors,
          images, sizes: sizeType === 'unique' ? ['Unique'] : sizes,
          ...(images.length > 0 || colors.length > 0 ? { print_area: printArea } : {}),
          dimensions_image: dimensionsImage, characteristics_fr: characteristicsFr || null,
          size_color_availability: sizeType === 'multiple' && colors.length > 0
            ? sizes.map((size) => ({
                size,
                unavailable_colors: colors.filter((c) => unavailableCombos.has(`${size}|${c.name}`)).map((c) => c.name),
              }))
            : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) { router.refresh(); onClose(); }
      else setError(json.error?.message ?? t('error'));
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold">{isEdit ? t('editProduct') : t('newProductTitle')}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white">✕</button>
        </div>

        <label className="text-sm text-text-secondary mb-1.5 block">{t('name')} *</label>
        <input className="input mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dropix Tee Black" />

        <label className="text-sm text-text-secondary mb-1.5 block">{t('description')}</label>
        <textarea className="input mb-4" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description du produit..." />

        <label className="text-sm text-text-secondary mb-1.5 block">{t('price')} *</label>
        <input className="input mb-4" type="number" min="0" value={form.price_dzd} onChange={(e) => setForm({ ...form, price_dzd: e.target.value })} placeholder="4500" />

        <label className="text-sm text-text-secondary mb-1.5 block">{t('status')}</label>
        <select className="input mb-4" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="available">{t('available')}</option>
          <option value="out_of_stock">{t('outOfStock')}</option>
          <option value="archived">{t('archived')}</option>
        </select>

        <label className="text-sm text-text-secondary mb-1.5 block">{t('category')}</label>
        <select className="input mb-4" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="">{t('noCategory')}</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`category_${c}`)}</option>
          ))}
        </select>

        <label className="text-sm text-text-secondary mb-1.5 block">{t('collection')}</label>
        <select className="input mb-4" value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })}>
          <option value="">{t('noCollection')}</option>
          {PRODUCT_COLLECTIONS.map((c) => (
            <option key={c} value={c}>{t(`collection_${c}`)}</option>
          ))}
        </select>

        <label className="text-sm text-text-secondary mb-2 block">{t('colors')}</label>
        <p className="text-xs text-text-secondary mb-2">{t('colorsHint')}</p>
        {colors.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {colors.map((c) => (
              <div key={c.name}
                className={`relative rounded-xl border p-2 transition ${previewColor === c.name ? 'border-secondary bg-secondary/10' : 'border-border'} ${!c.available ? 'opacity-60' : ''}`}>
                <button type="button" onClick={() => removeColor(c.name)}
                  className="absolute top-1 end-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center z-10">✕</button>
                <label title={t('replaceImage')}
                  className={`absolute top-1 start-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center z-10 ${replacingColorImage === c.name ? 'opacity-60' : 'cursor-pointer hover:bg-black/70'}`}>
                  {replacingColorImage === c.name ? '…' : '📷'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                    disabled={replacingColorImage === c.name} onChange={(e) => replaceColorImage(c.name, e.target.files?.[0])} />
                </label>
                <button type="button" onClick={() => setPreviewColor(c.name)} className="w-full text-start">
                  <img src={c.image} alt="" className="w-full h-16 rounded-lg object-cover mb-1.5" />
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-3 h-3 rounded-full border border-border shrink-0" style={{ background: c.hex }} />
                    <span className="text-xs font-medium truncate">{c.name}</span>
                  </div>
                </button>
                <button type="button" onClick={() => toggleColorAvailability(c.name)}
                  className={`w-full text-[11px] font-semibold py-1 rounded-lg transition ${c.available ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'}`}>
                  {c.available ? `✓ ${t('available')}` : `✕ ${t('outOfStock')}`}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center mb-6">
          <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent shrink-0" />
          <input className="input flex-1" value={newColorName} onChange={(e) => setNewColorName(e.target.value)}
            placeholder={t('colorNamePlaceholder')} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }} />
          {newColorImage ? (
            <img src={newColorImage} alt="" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
          ) : (
            <label className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border text-text-secondary hover:text-white transition shrink-0 ${uploadingColorImage ? 'opacity-60' : 'cursor-pointer'}`} title={t('colorImage')}>
              {uploadingColorImage ? '…' : '📷'}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                disabled={uploadingColorImage} onChange={(e) => uploadNewColorImage(e.target.files?.[0])} />
            </label>
          )}
          <button type="button" onClick={addColor} disabled={!newColorName.trim() || !newColorImage} className="btn-secondary !px-4 shrink-0 disabled:opacity-50">{t('addColor')}</button>
        </div>

        <label className="text-sm text-text-secondary mb-2 block">{t('photos')} ({images.length}/{MAX_PHOTOS})</label>
        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {images.map((url) => (
              <div key={url} className="relative w-16 h-16">
                <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                <button type="button" onClick={() => removeImage(url)}
                  className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
              </div>
            ))}
          </div>
        )}
        {images.length < MAX_PHOTOS ? (
          <label className={`inline-block px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-white transition mb-6 ${uploading ? 'opacity-60' : 'cursor-pointer'}`}>
            {uploading ? t('uploading') : t('addPhotos')}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden"
              disabled={uploading} onChange={(e) => handleFiles(e.target.files)} />
          </label>
        ) : (
          <p className="text-text-secondary text-xs mb-6">{t('maxPhotosReached', { max: MAX_PHOTOS })}</p>
        )}

        {previewImageUrl && (
          <>
            <label className="text-sm text-text-secondary mb-2 block">{t('printZone')}</label>
            {colors.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {colors.map((c) => (
                  <button key={c.name} type="button" onClick={() => setPreviewColor(c.name)}
                    className={`w-7 h-7 rounded-full border-2 transition ${previewColor === c.name ? 'border-secondary scale-110' : 'border-border'}`}
                    style={{ background: c.hex }} title={t('previewColor', { color: c.name })} />
                ))}
              </div>
            )}
            <div className="max-w-[260px] mb-3">
              <ProductQrPreview
                imageUrl={previewImageUrl?.startsWith('http') ? previewImageUrl : null} printArea={printArea} editable onPrintAreaChange={setPrintArea}
                preset="NEON" text="Exemple" textPosition="below" font="Anton" textColor="#FFFFFF"
              />
            </div>
            <label className="text-xs text-text-secondary mb-1.5 block">{t('qrSize')} : {printArea.width}%</label>
            <input type="range" min={10} max={60} value={printArea.width}
              onChange={(e) => setPrintArea({ ...printArea, width: Number(e.target.value) })}
              className="w-full mb-6" />
          </>
        )}

        <label className="text-sm text-text-secondary mb-2 block">{t('sizes')}</label>
        <div className="flex gap-2 mb-3">
          {(['unique', 'multiple'] as const).map((st) => (
            <button key={st} type="button" onClick={() => setSizeType(st)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${sizeType === st ? 'border-primary bg-primary/15 text-white' : 'border-border text-text-secondary'}`}>
              {st === 'unique' ? t('uniqueSize') : t('multipleSizes')}
            </button>
          ))}
        </div>
        {sizeType === 'multiple' ? (
          <div className="flex gap-2 flex-wrap mb-6">
            {SIZES.map((s) => (
              <button key={s} type="button" onClick={() => toggleSize(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${sizes.includes(s) ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary'}`}>
                {s}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary mb-6">{t('noSizeChoice')}</p>
        )}

        {sizeType === 'multiple' && sizes.length > 0 && colors.length > 0 && (
          <>
            <label className="text-sm text-text-secondary mb-2 block">{t('stockBySize')}</label>
            <p className="text-xs text-text-secondary mb-2">{t('stockBySizeHint')}</p>
            <div className="overflow-x-auto mb-6">
              <table className="text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-start pe-3 pb-2 text-xs text-text-secondary"></th>
                    {sortSizes(sizes).map((size) => (
                      <th key={size} className="px-2 pb-2 text-xs text-text-secondary font-semibold">{size}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colors.map((c) => (
                    <tr key={c.name}>
                      <td className="pe-3 py-1 text-xs whitespace-nowrap">
                        <span className="inline-block w-2.5 h-2.5 rounded-full border border-border me-1.5" style={{ background: c.hex }} />
                        {c.name}
                      </td>
                      {sortSizes(sizes).map((size) => {
                        const unavailable = unavailableCombos.has(`${size}|${c.name}`);
                        return (
                          <td key={size} className="px-1 py-1 text-center">
                            <button type="button" onClick={() => toggleCombo(size, c.name)}
                              className={`w-7 h-7 rounded-lg text-xs transition ${unavailable ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                              {unavailable ? '✕' : '✓'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <label className="text-sm text-text-secondary mb-2 block">{t('dimensions')}</label>
        {dimensionsImage ? (
          <div className="relative w-24 h-24 mb-3">
            <img src={dimensionsImage} alt="" className="w-24 h-24 object-cover rounded-lg border border-border" />
            <button type="button" onClick={() => setDimensionsImage(null)}
              className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
          </div>
        ) : (
          <label className={`inline-block px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-white transition mb-3 ${uploadingDimensions ? 'opacity-60' : 'cursor-pointer'}`}>
            {uploadingDimensions ? t('uploading') : t('addDimensionsImage')}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
              disabled={uploadingDimensions} onChange={(e) => uploadDimensionsImage(e.target.files?.[0])} />
          </label>
        )}
        <p className="text-xs text-text-secondary mb-6">{t('dimensionsHint')}</p>

        <label className="text-sm text-text-secondary mb-2 block">{t('characteristics')}</label>
        <textarea className="input mb-1.5" rows={4} value={characteristicsFr} onChange={(e) => setCharacteristicsFr(e.target.value)} placeholder={t('characteristicsPlaceholder')} />
        <p className="text-xs text-text-secondary mb-6">{t('characteristicsHint')}</p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="flex gap-3">
          <button onClick={submit} disabled={loading || uploading} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {loading ? t('creating') : isEdit ? t('save') : t('create')}
          </button>
          <button onClick={onClose} className="btn-secondary">{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const t = useTranslations('admin.products');
  const [products, setProducts] = useState<any[]>([]);
  const [modalProduct, setModalProduct] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetch('/api/admin/products').then((r) => r.json()).then((j) => { if (j.success) setProducts(j.data); });
  }, [showNew, modalProduct, refresh]);

  async function toggleStock(p: any) {
    const newStatus = p.status === 'available' ? 'out_of_stock' : 'available';
    await fetch(`/api/admin/products/${p.id}/stock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setRefresh((x) => x + 1);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-extrabold">{t('title')}</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">{t('newProduct')}</button>
      </div>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {[t('colProduct'), t('colCategory'), t('colCollection'), t('colPrice'), t('colStock'), t('colActions')].map((h) => (
              <th key={h} className="text-start px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {(p.images?.[0] ?? p.colors?.[0]?.image)?.startsWith('http') ? (
                      <img src={p.images?.[0] ?? p.colors?.[0]?.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : <span className="text-2xl">👕</span>}
                    <div>
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-text-secondary text-xs">{sortSizes([...new Set((p.product_variants ?? []).map((v: any) => v.size))] as string[]).join(', ')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary text-sm">{p.category ? t(`category_${p.category}`) : '—'}</td>
                <td className="px-4 py-3 text-text-secondary text-sm">{p.collection ? t(`collection_${p.collection}`) : '—'}</td>
                <td className="px-4 py-3 font-heading text-secondary">{formatDZD(p.price_dzd)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${p.status === 'available' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {p.status === 'available' ? t('available') : p.status === 'out_of_stock' ? t('outOfStock') : t('archived')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setModalProduct(p)}
                      className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition">
                      {t('edit')}
                    </button>
                    <button onClick={() => toggleStock(p)}
                      className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition">
                      {p.status === 'available' ? t('markOutOfStock') : t('markAvailable')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-secondary">{t('noProducts')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {showNew && <ProductModal onClose={() => setShowNew(false)} />}
      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />}
    </div>
  );
}
