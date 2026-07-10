'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QrCode } from '@/components/QrCode';
import { formatDZD } from '@/lib/utils';
import { WILAYAS, QR_PRESETS, QR_FONTS } from '@/lib/design';

const CONTACT_LOCKED_STATUSES = ['delivered', 'cancelled'];
const TEXT_COLORS = ['#FFFFFF', '#000000', '#7C3AED', '#EC4899', '#22D3EE', '#F97316', '#EF4444', '#22C55E'];

function CallLogSection({ orderId, logs, onLogged }: { orderId: string; logs: any[]; onLogged: (log: any) => void }) {
  const t = useTranslations('admin.orders');
  const CALL_RESULTS = [
    { value: 'not_answered', label: t('noAnswer') },
    { value: 'reached', label: t('reached') },
    { value: 'call_later', label: t('callLater') },
    { value: 'wrong_number', label: t('wrongNumber') },
  ];
  const RESULT_LABELS: Record<string, string> = {
    not_answered: t('noAnswer'), reached: t('reached'), call_later: t('callLater'), wrong_number: t('wrongNumber'),
  };
  const [result, setResult] = useState('not_answered');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function logCall() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/call-log`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, notes: notes || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        onLogged({ id: `local-${Date.now()}`, result, notes: notes || null, created_at: new Date().toISOString(), admin: null });
        setNotes('');
      } else {
        setError(json.error?.message ?? t('error'));
      }
    } catch {
      setError(t('networkError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border pt-3 mt-1">
      <div className="text-xs text-text-secondary mb-2 font-semibold uppercase tracking-wide">{t('callLog')}</div>
      {logs.length > 0 && (
        <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
          {[...logs].reverse().map((l) => (
            <div key={l.id} className="text-xs bg-bg rounded-lg px-2.5 py-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{RESULT_LABELS[l.result] ?? l.result}</span>
                <span className="text-text-secondary">{new Date(l.created_at).toLocaleString()}{l.admin?.first_name ? ` · ${l.admin.first_name}` : ''}</span>
              </div>
              {l.notes && <div className="text-text-secondary mt-0.5">{l.notes}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 mb-2">
        <select value={result} onChange={(e) => setResult(e.target.value)}
          className="input text-sm flex-1 !py-1.5">
          {CALL_RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={logCall} disabled={busy}
          className="px-3 py-1.5 rounded-xl border border-border text-sm text-text-secondary hover:text-white transition disabled:opacity-50">
          {busy ? '…' : t('logCall')}
        </button>
      </div>
      <input className="input text-sm !py-1.5" placeholder={t('notesOptional')} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

export function OrdersTable({ orders }: { orders: any[] }) {
  const router = useRouter();
  const t = useTranslations('admin.orders');
  const [sel, setSel] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', wilaya_code: '', commune: '', address: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [itemsForm, setItemsForm] = useState<any[]>([]);
  const [savingItems, setSavingItems] = useState(false);

  function startEditItems() {
    setItemsForm((sel.order_items ?? []).map((it: any) => ({ ...it })));
    setEditingItems(true);
  }

  function removeItemRow(itemId: string) {
    setItemsForm((prev) => prev.filter((it) => it.id !== itemId));
  }

  function updateItemRow(itemId: string, field: string, value: string | number | null) {
    setItemsForm((prev) => prev.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)));
  }

  const itemsFormTotal = sel
    ? Math.max(0, itemsForm.reduce((sum, it) => sum + it.unit_price_dzd * it.quantity, 0) + (sel.shipping_fee_dzd ?? 0) - (sel.discount_dzd ?? 0))
    : 0;

  async function saveItems() {
    setSavingItems(true);
    try {
      const originalIds = new Set((sel.order_items ?? []).map((it: any) => it.id));
      const keptIds = new Set(itemsForm.map((it) => it.id));
      const removedIds = [...originalIds].filter((id) => !keptIds.has(id));
      const res = await fetch(`/api/admin/orders/${sel.id}/items`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsForm.map((it) => ({
            id: it.id, size: it.size, quantity: it.quantity, garment_color: it.garment_color || null,
            qr_preset: it.qr_preset, text_content: it.text_content || null,
            text_position: it.text_position ?? 'none', text_font: it.text_font, text_color: it.text_color,
          })),
          removed_item_ids: removedIds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSel({ ...sel, order_items: itemsForm, total_dzd: itemsFormTotal });
        setEditingItems(false);
        setToast(t('itemsUpdated'));
        router.refresh();
      } else {
        setToast(json.error?.message ?? t('error'));
      }
    } catch {
      setToast(t('networkError'));
    } finally {
      setSavingItems(false);
      setTimeout(() => setToast(''), 3500);
    }
  }

  function startEditContact() {
    setContactForm({
      customer_name: sel.customer_name, customer_phone: sel.customer_phone, customer_email: sel.customer_email,
      wilaya_code: sel.wilaya_code, commune: sel.commune, address: sel.address,
    });
    setEditingContact(true);
  }

  async function saveContact() {
    setSavingContact(true);
    try {
      const res = await fetch(`/api/admin/orders/${sel.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const json = await res.json();
      if (json.success) {
        setSel({ ...sel, ...contactForm });
        setEditingContact(false);
        setToast(t('contactUpdated'));
        router.refresh();
      } else {
        setToast(json.error?.message ?? t('error'));
      }
    } catch {
      setToast(t('networkError'));
    } finally {
      setSavingContact(false);
      setTimeout(() => setToast(''), 3500);
    }
  }

  const LABELS: Record<string, string> = {
    pending_confirmation: t('statusPending'), confirmed: t('statusConfirmed'), in_production: t('statusInProduction'),
    shipped: t('statusShipped'), delivered: t('statusDelivered'), cancelled: t('statusCancelled'),
  };

  async function confirm(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/confirm`, { method: 'POST' });
      const json = await res.json();
      if (json.success) { setSel(null); setToast(t('confirmedToast')); router.refresh(); }
      else setToast(json.error?.message ?? t('error'));
    } catch {
      setToast(t('networkError'));
    } finally {
      setBusy(false);
      setTimeout(() => setToast(''), 3500);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: t('rejectedReason') }),
      });
      const json = await res.json();
      if (json.success) { setSel(null); setToast(t('cancelledToast')); router.refresh(); }
      else setToast(json.error?.message ?? t('error'));
    } catch {
      setToast(t('networkError'));
    } finally {
      setBusy(false);
      setTimeout(() => setToast(''), 3500);
    }
  }

  return (
    <>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {[t('colOrder'), t('colClient'), t('colWilaya'), t('colTotal'), t('colStatus'), ''].map((h) => (
              <th key={h} className="text-start px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3 font-heading text-secondary">{o.order_number}</td>
                <td className="px-4 py-3"><div className="font-semibold text-sm">{o.customer_name}</div><div className="text-text-secondary text-xs">{o.customer_phone}</div></td>
                <td className="px-4 py-3 text-text-secondary text-sm">{o.wilaya_code}</td>
                <td className="px-4 py-3 font-heading text-secondary">{formatDZD(o.total_dzd)}</td>
                <td className="px-4 py-3"><span className="badge bg-primary/20 text-purple-300">{LABELS[o.status] ?? o.status}</span></td>
                <td className="px-4 py-3"><button onClick={() => { setSel(o); setEditingContact(false); setEditingItems(false); }} className="text-text-secondary hover:text-white text-sm">{t('view')} →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => { setSel(null); setEditingContact(false); setEditingItems(false); }}>
          <div className={`card w-full max-h-[90vh] overflow-y-auto ${editingItems ? 'max-w-2xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-5">
              <div><div className="font-heading text-2xl text-secondary">{sel.order_number}</div>
                <span className="badge bg-primary/20 text-purple-300 mt-1">{LABELS[sel.status]}</span></div>
              <button onClick={() => { setSel(null); setEditingContact(false); setEditingItems(false); }} className="text-text-secondary">✕</button>
            </div>

            {editingContact ? (
              <div className="mb-5">
                <h3 className="font-bold text-sm mb-3">{t('editContactTitle')}</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <div><label className="text-xs text-text-secondary mb-1 block">{t('client')}</label>
                    <input className="input" value={contactForm.customer_name} onChange={(e) => setContactForm({ ...contactForm, customer_name: e.target.value })} /></div>
                  <div><label className="text-xs text-text-secondary mb-1 block">{t('phone')}</label>
                    <input className="input" value={contactForm.customer_phone} onChange={(e) => setContactForm({ ...contactForm, customer_phone: e.target.value })} /></div>
                  <div><label className="text-xs text-text-secondary mb-1 block">{t('email')}</label>
                    <input type="email" className="input" value={contactForm.customer_email} onChange={(e) => setContactForm({ ...contactForm, customer_email: e.target.value })} /></div>
                  <div><label className="text-xs text-text-secondary mb-1 block">{t('wilaya')}</label>
                    <select className="input" value={contactForm.wilaya_code} onChange={(e) => setContactForm({ ...contactForm, wilaya_code: e.target.value })}>
                      {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select></div>
                  <div><label className="text-xs text-text-secondary mb-1 block">{t('commune')}</label>
                    <input className="input" value={contactForm.commune} onChange={(e) => setContactForm({ ...contactForm, commune: e.target.value })} /></div>
                  <div><label className="text-xs text-text-secondary mb-1 block">{t('address')}</label>
                    <input className="input" value={contactForm.address} onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })} /></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveContact} disabled={savingContact} className="btn-primary !py-2 disabled:opacity-60">{savingContact ? t('saving') : t('save')}</button>
                  <button onClick={() => setEditingContact(false)} className="btn-secondary !py-2">{t('cancelEdit')}</button>
                </div>
              </div>
            ) : (
              <div className="mb-5">
                <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                  {[[t('client'), sel.customer_name], [t('phone'), sel.customer_phone], [t('email'), sel.customer_email], [t('wilaya'), sel.wilaya_code], [t('commune'), sel.commune], [t('address'), sel.address]].map(([l, v]) => (
                    <div key={l}><div className="text-text-secondary text-xs">{l}</div><div className="font-medium">{v}</div></div>
                  ))}
                </div>
                {CONTACT_LOCKED_STATUSES.includes(sel.status) ? (
                  <p className="text-text-secondary text-xs">{t('contactLocked')}</p>
                ) : (
                  <button onClick={startEditContact} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-white transition">
                    ✎ {t('editContact')}
                  </button>
                )}
              </div>
            )}
            {editingItems ? (
              <div className="bg-bg rounded-2xl p-4 mb-5">
                <h3 className="font-bold text-sm mb-3">{t('editItemsTitle')}</h3>
                <div className="space-y-4 mb-4">
                  {itemsForm.map((it) => (
                    <div key={it.id} className="bg-surface rounded-xl p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <QrCode preset={it.qr_preset} text={it.text_content} textPosition={it.text_content ? it.text_position : 'none'} font={it.text_font} textColor={it.text_color} size={56} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{it.product_name}</div>
                          <div className="text-text-secondary text-xs">{formatDZD(it.unit_price_dzd)} / {t('unit')}</div>
                        </div>
                        <input className="input !py-1.5 !px-2 w-20 text-sm" value={it.size} onChange={(e) => updateItemRow(it.id, 'size', e.target.value)} placeholder={t('size')} />
                        <input className="input !py-1.5 !px-2 w-24 text-sm" value={it.garment_color ?? ''} onChange={(e) => updateItemRow(it.id, 'garment_color', e.target.value)} placeholder={t('color')} />
                        <input type="number" min={1} max={50} className="input !py-1.5 !px-2 w-16 text-sm" value={it.quantity} onChange={(e) => updateItemRow(it.id, 'quantity', Math.max(1, Number(e.target.value)))} />
                        {itemsForm.length > 1 && (
                          <button onClick={() => removeItemRow(it.id)} className="text-red-400 hover:text-red-300 text-lg leading-none px-1" title={t('removeItem')}>✕</button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary mb-1.5 block">{t('qrStyle')}</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {QR_PRESETS.map((p) => (
                            <button key={p.id} onClick={() => updateItemRow(it.id, 'qr_preset', p.id)}
                              className={`w-8 h-8 rounded-lg border-2 transition ${it.qr_preset === p.id ? 'border-secondary scale-110' : 'border-border'}`}
                              style={{ background: `linear-gradient(135deg, ${p.colors.join(', ')})` }} title={p.label} />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary mb-1.5 block">{t('text')}</label>
                        <input className="input !py-1.5 text-sm" placeholder={t('textPlaceholder')} value={it.text_content ?? ''}
                          onChange={(e) => updateItemRow(it.id, 'text_content', e.target.value.slice(0, 80))} />
                        <div className="text-[11px] text-text-secondary mt-1">{(it.text_content ?? '').length}/80</div>
                      </div>

                      {it.text_content && (
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-text-secondary mb-1.5 block">{t('position')}</label>
                            <div className="flex gap-1.5">
                              {(['above', 'below'] as const).map((v) => (
                                <button key={v} onClick={() => updateItemRow(it.id, 'text_position', v)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${it.text_position === v ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary'}`}>
                                  {v === 'above' ? t('above') : t('below')}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary mb-1.5 block">{t('textColor')}</label>
                            <div className="flex gap-1.5 flex-wrap items-center">
                              {TEXT_COLORS.map((c) => (
                                <button key={c} onClick={() => updateItemRow(it.id, 'text_color', c)}
                                  className={`w-6 h-6 rounded-full border-2 transition ${it.text_color === c ? 'border-white scale-110' : 'border-border'}`}
                                  style={{ background: c }} title={c} />
                              ))}
                              <input type="color" value={it.text_color ?? '#FFFFFF'} onChange={(e) => updateItemRow(it.id, 'text_color', e.target.value)}
                                className="w-6 h-6 rounded-full border-2 border-border cursor-pointer bg-transparent" title={t('customColor')} />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary mb-1.5 block">{t('font')}</label>
                            <select className="input !py-1.5 text-xs" value={it.text_font ?? QR_FONTS[0].id} onChange={(e) => updateItemRow(it.id, 'text_font', e.target.value)}>
                              {QR_FONTS.map((f) => <option key={f.id} value={f.id}>{f.id}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm font-semibold mb-4 px-1">
                  <span className="text-text-secondary">{t('colTotal')}</span>
                  <span className="font-heading text-secondary">{formatDZD(itemsFormTotal)}</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveItems} disabled={savingItems} className="btn-primary !py-2 disabled:opacity-60">{savingItems ? t('saving') : t('save')}</button>
                  <button onClick={() => setEditingItems(false)} className="btn-secondary !py-2">{t('cancelEdit')}</button>
                </div>
              </div>
            ) : (
              <div className="bg-bg rounded-2xl p-4 mb-5">
                <div className="space-y-4">
                  {(sel.order_items ?? []).map((it: any) => (
                    <div key={it.id} className="flex items-center gap-4">
                      <QrCode preset={it.qr_preset} size={64} text={it.text_content} textPosition={it.text_position} font={it.text_font} textColor={it.text_color} />
                      <div><div className="font-semibold">{it.product_name}</div>
                        <div className="text-text-secondary text-sm">{t('size')} {it.size}{it.garment_color ? ` · ${t('color')} ${it.garment_color}` : ''} · {t('qty')} {it.quantity} · {it.qr_preset}</div>
                        {it.text_content && <div className="text-secondary text-xs mt-1">&quot;{it.text_content}&quot;</div>}</div>
                    </div>
                  ))}
                </div>
                {sel.status === 'pending_confirmation' && (
                  <button onClick={startEditItems} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-white transition mt-4">
                    ✎ {t('editItems')}
                  </button>
                )}
              </div>
            )}
            {sel.status === 'pending_confirmation' ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button onClick={() => confirm(sel.id)} disabled={busy} className="btn-primary flex-1 justify-center disabled:opacity-60">✓ {t('validate')}</button>
                  <button onClick={() => cancel(sel.id)} disabled={busy} className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold flex-1 disabled:opacity-60">✗ {t('reject')}</button>
                </div>
                <CallLogSection orderId={sel.id} logs={sel.order_call_logs ?? []} onLogged={(log) => {
                  setSel({ ...sel, order_call_logs: [...(sel.order_call_logs ?? []), log] });
                  setToast(t('callLogged'));
                  setTimeout(() => setToast(''), 3500);
                  router.refresh();
                }} />
              </div>
            ) : (
              <p className="text-text-secondary text-center text-sm">{t('alreadyProcessed')}</p>
            )}
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 end-6 bg-surface border border-border px-5 py-3 rounded-2xl text-sm z-50">{toast}</div>}
    </>
  );
}
