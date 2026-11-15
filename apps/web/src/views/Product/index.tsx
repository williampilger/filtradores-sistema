'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Página do produto
 *  - STOCK: compra direta; esgotado + lista habilitada -> lista de espera
 *  - ON_DEMAND + UPFRONT: "Encomendar" (checkout normal no lote aberto)
 *  - ON_DEMAND + ON_RELEASE: "Entrar na lista" (paga quando ficar pronto, ao ser chamado)
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaBagShopping, FaHourglassHalf } from 'react-icons/fa6';
import { formatDateTime, formatMoney, LABELS, type ProductDetail, type WaitlistEntryDTO } from '@filt/shared';
import API from '@/api';
import { Badge, Empty, Spinner } from '@/components/ui';
import { type CartItem, CheckoutBox, type CheckoutLine } from '@/components/site/Checkout';
import { currentPath, loginHref } from '@/components/site/helpers';
import { ProductImagePlaceholder } from '@/components/site/ProductCard';
import { QtyStepper } from '@/components/site/QtyStepper';
import { Container } from '@/components/site/Section';
import { useSession } from '@/hooks/useSession';
import { MyWaitlist } from './form.Waitlist';

type Mode = null | { kind: 'buy' } | { kind: 'waitlist', entry: WaitlistEntryDTO };

export default function Product({ slug }: { slug: string }) {
    const router = useRouter();
    const { session } = useSession();
    const [p, setP] = useState<ProductDetail | null | undefined>(undefined);
    const [img, setImg] = useState(0);
    const [variantId, setVariantId] = useState<number | null>(null);
    const [qty, setQty] = useState(1);
    const [mode, setMode] = useState<Mode>(null);
    const [busy, setBusy] = useState(false);
    const userId = session?.user.id;

    const load = useCallback(async () => {
        const r = await API.public.product(slug);
        const data = r.success ? r.data : null;
        setP(data);
        if (data) setVariantId(cur => cur ?? (data.variants.find(v => v.available > 0) ?? data.variants[0])?.id ?? null);
    }, [slug]);
    useEffect(() => { void load(); }, [load, userId]);

    const v = p?.variants.find(x => x.id === variantId) ?? null;

    const checkout = useMemo((): { items: CartItem[], lines: CheckoutLine[], title: string } | null => {
        if (!p || !mode) return null;
        if (mode.kind === 'buy') {
            if (!v) return null;
            return {
                items: [{ kind: 'PRODUCT', variantId: v.id, quantity: qty }],
                lines: [{ label: `${p.name} - ${v.name}`, quantity: qty, unitCents: v.priceCents, memberUnitCents: v.memberPriceCents }],
                title: p.fulfillment === 'ON_DEMAND' ? 'Finalizar encomenda' : 'Finalizar compra',
            };
        }
        const ev = p.variants.find(x => x.id === mode.entry.variant.id);
        return {
            items: [{ kind: 'PRODUCT', variantId: mode.entry.variant.id, quantity: mode.entry.quantity, waitlistEntryId: mode.entry.id }],
            lines: [{ label: `${p.name} - ${mode.entry.variant.name}`, quantity: mode.entry.quantity, unitCents: ev?.priceCents ?? p.fromPriceCents, memberUnitCents: ev?.memberPriceCents }],
            title: 'Comprar item reservado',
        };
    }, [p, mode, v, qty]);

    if (p === undefined) return <Spinner />;
    if (p === null) return (
        <Container className="py-16"><Empty>Produto não encontrado. <Link href="/loja" className="font-semibold text-brand hover:underline">Voltar para a loja</Link></Empty></Container>
    );

    const isStock = p.fulfillment === 'STOCK';
    const soldOut = isStock && (!v || v.available <= 0);
    const maxQty = Math.max(1, Math.min(p.maxPerOrder, isStock && v ? v.available : 20));
    const alreadyListed = !!v && p.myWaitlist.some(e => e.variant.id === v.id && (e.status === 'WAITING' || e.status === 'NOTIFIED'));

    const requireLogin = () => {
        if (session && !session.mfaPending && !session.mfaSetupRequired) return true;
        router.push(loginHref(currentPath()));
        return false;
    };

    const joinWaitlist = async () => {
        if (!v || !requireLogin()) return;
        setBusy(true);
        const r = await API.public.joinWaitlist(v.id, qty);
        setBusy(false);
        if (r.success) void load();
    };

    const startBuy = () => {
        setMode({ kind: 'buy' });
        setTimeout(() => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    // botão principal conforme o tipo de produto
    let action: React.ReactNode;
    if (!v) action = <button className="btn btn-lg w-full" disabled>Indisponível</button>;
    else if (isStock) {
        action = !soldOut
            ? <button type="button" className="btn btn-accent btn-lg w-full" onClick={startBuy}><FaBagShopping /> Comprar</button>
            : p.waitlistEnabled
                ? alreadyListed
                    ? <button className="btn btn-lg w-full" disabled>Você já está na lista desta opção</button>
                    : <button type="button" className="btn btn-primary btn-lg w-full" disabled={busy} onClick={() => void joinWaitlist()}><FaHourglassHalf /> {busy ? 'Aguarde...' : 'Entrar na lista de espera'}</button>
                : <button className="btn btn-lg w-full" disabled>Esgotado</button>;
    } else if (!p.openBatch) {
        action = <div className="rounded-lg bg-surface-alt p-3 text-center text-sm text-ink-muted">Encomendas fechadas no momento. Fique de olho: abrimos novos lotes periodicamente!</div>;
    } else if (p.waitlistPayment === 'UPFRONT') {
        action = <button type="button" className="btn btn-accent btn-lg w-full" onClick={startBuy}><FaBagShopping /> Encomendar</button>;
    } else {
        action = alreadyListed
            ? <button className="btn btn-lg w-full" disabled>Você já está na lista desta opção</button>
            : <button type="button" className="btn btn-primary btn-lg w-full" disabled={busy} onClick={() => void joinWaitlist()}><FaHourglassHalf /> {busy ? 'Aguarde...' : 'Entrar na lista (pague quando ficar pronto)'}</button>;
    }

    const images = p.imageUrls.length ? p.imageUrls : [];
    const hasMember = v && v.memberPriceCents != null && v.memberPriceCents < v.priceCents;

    return (
        <Container className="py-8">
            <nav className="mb-4 text-sm text-ink-muted"><Link href="/loja" className="hover:text-brand">Loja</Link> / <span className="text-ink">{p.name}</span></nav>
            <div className="grid gap-8 md:grid-cols-2">
                {/* GALERIA */}
                <div>
                    <div className="panel aspect-square overflow-hidden">
                        {images[img] ? <img src={images[img]} alt={p.name} className="h-full w-full object-cover" /> : <ProductImagePlaceholder className="h-full w-full" />}
                    </div>
                    {images.length > 1 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                            {images.map((u, i) => (
                                <button key={u} type="button" onClick={() => setImg(i)} aria-label={`Imagem ${i + 1}`}
                                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === img ? 'border-brand' : 'border-line'}`}>
                                    <img src={u} alt="" className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* INFO */}
                <div className="flex flex-col gap-4">
                    <div>
                        {p.category && <div className="text-xs font-bold uppercase tracking-[.2em] text-club-red">{p.category}</div>}
                        <h1 className="display mt-1 text-4xl text-brand-deep sm:text-5xl">{p.name}</h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge tone={isStock ? 'brand' : 'info'}>{LABELS.fulfillment[p.fulfillment]}</Badge>
                            {!isStock && <Badge>{LABELS.waitlistPayment[p.waitlistPayment]}</Badge>}
                        </div>
                    </div>

                    {v && (
                        <div className="flex flex-wrap items-baseline gap-2">
                            {hasMember ? (
                                <>
                                    <span className="text-3xl font-bold text-ok">{formatMoney(v.memberPriceCents)}</span>
                                    <span className="text-ink-faint line-through">{formatMoney(v.priceCents)}</span>
                                    <span className="text-sm font-semibold text-ok">preço de sócio</span>
                                </>
                            ) : <span className="text-3xl font-bold text-brand">{formatMoney(v.priceCents)}</span>}
                        </div>
                    )}

                    {p.variants.length > 0 && (
                        <div>
                            <span className="lbl">Opção</span>
                            <div className="flex flex-wrap gap-2">
                                {p.variants.map(x => {
                                    const out = isStock && x.available <= 0;
                                    return (
                                        <button key={x.id} type="button" onClick={() => { setVariantId(x.id); setQty(1); }}
                                            className={`min-w-12 rounded-lg border-2 px-3 py-2 text-sm font-semibold ${x.id === variantId ? 'border-brand bg-brand-soft text-brand-deep' : 'border-line bg-surface hover:border-line-strong'} ${out ? 'text-ink-faint line-through' : ''}`}
                                            aria-pressed={x.id === variantId} title={out ? 'Esgotado' : undefined}>
                                            {x.name}
                                        </button>
                                    );
                                })}
                            </div>
                            {isStock && v && v.available > 0 && v.available <= 5 && <div className="mt-1 text-xs font-semibold text-club-red">Últimas {v.available} unidades!</div>}
                        </div>
                    )}

                    {v && !soldOut && (isStock || p.openBatch) && (
                        <div>
                            <span className="lbl">Quantidade</span>
                            <QtyStepper value={qty} onChange={setQty} min={1} max={maxQty} />
                        </div>
                    )}
                    {soldOut && p.waitlistEnabled && v && !alreadyListed && (
                        <div>
                            <span className="lbl">Quantidade desejada</span>
                            <QtyStepper value={qty} onChange={setQty} min={1} max={Math.min(p.maxPerOrder, 20)} />
                        </div>
                    )}

                    {p.openBatch && (
                        <div className="rounded-lg border border-info bg-info-soft p-3 text-sm">
                            Lote aberto: <b>{p.openBatch.name}</b>{p.openBatch.closesAt && <> · pedidos até <b>{formatDateTime(p.openBatch.closesAt)}</b></>}
                            <div className="text-xs text-ink-muted">
                                {p.waitlistPayment === 'UPFRONT' ? 'Pague agora e receba quando o lote ficar pronto.' : 'Entre na lista sem pagar. Quando o lote ficar pronto, avisamos e você tem um prazo para comprar.'}
                            </div>
                        </div>
                    )}

                    {action}

                    <MyWaitlist entries={p.myWaitlist} buyingId={mode?.kind === 'waitlist' ? mode.entry.id : null} onBuy={e => {
                        if (!requireLogin()) return;
                        setMode({ kind: 'waitlist', entry: e });
                        setTimeout(() => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }} />

                    {p.description && <div className="whitespace-pre-line border-t border-line pt-4 text-sm">{p.description}</div>}
                </div>
            </div>

            {checkout && (
                <div id="checkout" className="mx-auto mt-8 max-w-2xl scroll-mt-24">
                    <CheckoutBox items={checkout.items} lines={checkout.lines} title={checkout.title} note={
                        <button type="button" className="self-start text-sm text-ink-muted hover:underline" onClick={() => setMode(null)}>Cancelar</button>
                    } />
                </div>
            )}
        </Container>
    );
}
