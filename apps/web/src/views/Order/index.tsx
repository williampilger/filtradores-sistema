'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Página do pedido: status, itens, reserva (contagem regressiva), pagamento (PIX/checkout/boleto),
 *              troca de método, cancelamento, ingressos com QR e acompanhamento da entrega.
 *              Enquanto aguarda pagamento, consulta o pedido a cada 5 s.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCircleCheck, FaCircleXmark, FaHourglassHalf, FaIdCard } from 'react-icons/fa6';
import { formatDateTime, formatMoney, LABELS, type OrderDTO, type PaymentMethod } from '@filt/shared';
import API from '@/api';
import { Badge, confirmAction, Empty, Spinner, statusTone } from '@/components/ui';
import { Countdown } from '@/components/site/Countdown';
import { loginHref } from '@/components/site/helpers';
import { PaymentPanel } from '@/components/site/PaymentPanel';
import { Container } from '@/components/site/Section';
import { TicketCard } from '@/components/site/TicketQr';
import { useSession } from '@/hooks/useSession';

export default function Order({ code }: { code: string }) {
    const { session, loading: sessionLoading, refresh } = useSession();
    const [order, setOrder] = useState<OrderDTO | null | undefined>(undefined);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [method, setMethod] = useState<PaymentMethod | ''>('');
    const [busy, setBusy] = useState(false);
    const [celebrate, setCelebrate] = useState(false);
    const prevStatus = useRef<string | null>(null);

    const load = useCallback(async (silent = false) => {
        const r = await API.checkout.order(code, { alertError: !silent });
        if (r.success) setOrder(r.data);
        else if (!silent) setOrder(null);
    }, [code]);

    useEffect(() => { void load(); }, [load, session?.user.id]);
    useEffect(() => { API.public.paymentMethods().then(r => { if (r.success) setMethods(r.data); }); }, []);

    // polling enquanto aguarda pagamento
    const pending = order?.status === 'PENDING_PAYMENT';
    useEffect(() => {
        if (!pending) return;
        const t = setInterval(() => void load(true), 5000);
        return () => clearInterval(t);
    }, [pending, load]);

    // comemoração na virada para PAGO
    useEffect(() => {
        if (!order) return;
        if (prevStatus.current === 'PENDING_PAYMENT' && order.status === 'PAID') {
            setCelebrate(true);
            toast.success('Pagamento confirmado! Vamos, Filtradores!');
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([80, 60, 80]);
            void refresh(); // situação de sócio pode ter mudado
        }
        prevStatus.current = order.status;
    }, [order, refresh]);

    if (order === undefined || (order === null && sessionLoading)) return <Spinner />;
    if (order === null && !session) return (
        <Container className="py-16">
            <Empty>Entre na sua conta para ver este pedido. <Link href={loginHref(`/pedido/${code}`)} className="font-semibold text-brand hover:underline">Entrar</Link></Empty>
        </Container>
    );
    if (order === null) return (
        <Container className="py-16"><Empty>Pedido não encontrado. Confira o código ou acesse <Link href="/minha-conta?aba=pedidos" className="font-semibold text-brand hover:underline">Meus pedidos</Link>.</Empty></Container>
    );

    const payment = [...order.payments].sort((a, b) => b.id - a.id)[0] ?? null;
    const paid = order.status === 'PAID' || order.status === 'PARTIALLY_REFUNDED';
    const hasMembership = order.items.some(i => i.kind === 'MEMBERSHIP');
    const hasGoods = order.items.some(i => i.kind === 'PRODUCT' || i.kind === 'PREORDER');
    const otherMethods = methods.filter(m => m !== payment?.method || payment?.status !== 'PENDING');
    const isOwner = !!session;

    const payWith = async () => {
        if (!method) return;
        setBusy(true);
        const r = await API.checkout.pay(order.code, method);
        setBusy(false);
        if (r.success) { setMethod(''); void load(); }
    };

    const cancel = async () => {
        if (!confirmAction('Cancelar este pedido? Os itens reservados serão liberados.')) return;
        setBusy(true);
        const r = await API.checkout.cancel(order.code);
        setBusy(false);
        if (r.success) { toast.info('Pedido cancelado'); void load(); }
    };

    return (
        <>
            {/* STATUS */}
            <section className={paid ? 'hero-blue' : 'bg-brand-deep text-brand-ink'}>
                <Container className="py-10 text-center">
                    <div className="text-xs font-bold uppercase tracking-[.25em] text-club-gold">Pedido {order.code}</div>
                    {paid ? (
                        <>
                            <FaCircleCheck className={`mx-auto mt-4 text-club-gold ${celebrate ? 'animate-bounce' : ''}`} size={56} />
                            <h1 className="display mt-3 text-5xl sm:text-6xl">{celebrate ? 'É gol! Pago!' : 'Pagamento confirmado'}</h1>
                            <p className="mt-2 opacity-90">{order.tickets.length ? 'Seus ingressos estão logo abaixo e também em Minha conta.' : hasMembership ? 'Bem-vindo ao time de sócios do Filtradores!' : 'Obrigado por apoiar o Filtradores!'}</p>
                        </>
                    ) : pending ? (
                        <>
                            <FaHourglassHalf className="mx-auto mt-4 text-club-gold" size={44} />
                            <h1 className="display mt-3 text-5xl">Aguardando pagamento</h1>
                            {order.expiresAt && (
                                <p className="mt-2 text-lg">Reserva válida por <b className="display text-2xl text-club-gold"><Countdown until={order.expiresAt} onExpire={() => void load(true)} /></b></p>
                            )}
                            <p className="mt-1 text-sm opacity-80">A confirmação aparece aqui automaticamente.</p>
                        </>
                    ) : (
                        <>
                            <FaCircleXmark className="mx-auto mt-4 text-club-gold" size={44} />
                            <h1 className="display mt-3 text-5xl">{LABELS.orderStatus[order.status]}</h1>
                            {order.status === 'EXPIRED' && <p className="mt-2 opacity-90">O prazo de pagamento acabou e a reserva foi liberada. Você pode fazer um novo pedido.</p>}
                        </>
                    )}
                </Container>
                <div className="club-stripes h-2" aria-hidden />
            </section>

            <Container className="grid max-w-5xl gap-6 py-8 md:grid-cols-[1fr_380px]">
                <div className="flex flex-col gap-6">
                    {/* ITENS */}
                    <section className="panel p-5">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="display text-2xl text-brand-deep">Itens</h2>
                            <Badge tone={statusTone(order.status)}>{LABELS.orderStatus[order.status]}</Badge>
                        </div>
                        <ul className="divide-y divide-line">
                            {order.items.map(i => (
                                <li key={i.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                                    <div className="min-w-0">
                                        <div className="font-semibold">{i.quantity}× {i.name}</div>
                                        <div className="text-xs text-ink-muted">{formatMoney(i.unitPriceCents)} cada{i.discountCents > 0 && <> · <span className="text-ok">-{formatMoney(i.discountCents)}</span></>}</div>
                                        {paid && (i.kind === 'PRODUCT' || i.kind === 'PREORDER') && i.deliveryStatus !== 'NOT_APPLICABLE' && (
                                            <div className="mt-1"><Badge tone={statusTone(i.deliveryStatus)}>{LABELS.deliveryStatus[i.deliveryStatus]}</Badge></div>
                                        )}
                                    </div>
                                    <span className="num font-semibold">{formatMoney(i.totalCents)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
                            <div className="flex justify-between"><span className="text-ink-muted">Subtotal</span><span className="num">{formatMoney(order.subtotalCents)}</span></div>
                            {order.discountCents > 0 && <div className="flex justify-between text-ok"><span>Desconto</span><span className="num">-{formatMoney(order.discountCents)}</span></div>}
                            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="num text-brand">{formatMoney(order.totalCents)}</span></div>
                        </div>
                        <div className="mt-3 text-xs text-ink-faint">
                            Criado em {formatDateTime(order.createdAt)} · {LABELS.orderChannel[order.channel]}{order.paidAt && <> · Pago em {formatDateTime(order.paidAt)}</>}
                        </div>
                        {paid && hasGoods && <p className="mt-3 rounded-lg bg-surface-alt p-3 text-sm text-ink-muted">Avisaremos quando seus produtos estiverem prontos para retirada.</p>}
                        {paid && hasMembership && (
                            <Link href="/minha-conta?aba=carteirinha" className="btn btn-accent btn-lg mt-4 w-full"><FaIdCard /> Ver minha carteirinha</Link>
                        )}
                    </section>

                    {/* INGRESSOS */}
                    {order.tickets.length > 0 && (
                        <section>
                            <h2 className="display mb-3 text-2xl text-brand-deep">Ingressos</h2>
                            {paid ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {order.tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                                </div>
                            ) : <Empty>Os ingressos com QR aparecem aqui assim que o pagamento for confirmado.</Empty>}
                        </section>
                    )}
                </div>

                {/* PAGAMENTO */}
                <aside className="flex flex-col gap-4">
                    {payment && (
                        <section className="panel p-5">
                            <h2 className="display mb-3 text-2xl text-brand-deep">Pagamento</h2>
                            <PaymentPanel payment={payment} />
                        </section>
                    )}
                    {pending && isOwner && (
                        <section className="panel flex flex-col gap-3 p-5">
                            <h3 className="font-bold">{payment ? 'Pagar com outro método' : 'Escolha como pagar'}</h3>
                            {otherMethods.length === 0 ? (
                                <p className="text-sm text-ink-muted">{methods.length === 0 ? 'Pagamentos online indisponíveis no momento. Fale com a diretoria.' : 'Nenhum outro método disponível.'}</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        {otherMethods.map(m => (
                                            <button key={m} type="button" onClick={() => setMethod(m)}
                                                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${method === m ? 'border-brand bg-brand-soft text-brand-deep' : 'border-line hover:bg-surface-hover'}`}>
                                                {LABELS.paymentMethod[m]}
                                            </button>
                                        ))}
                                    </div>
                                    <button type="button" className="btn btn-primary" disabled={!method || busy} onClick={() => void payWith()}>{busy ? 'Aguarde...' : 'Gerar pagamento'}</button>
                                </>
                            )}
                            <button type="button" className="btn btn-danger btn-sm self-start" disabled={busy} onClick={() => void cancel()}>Cancelar pedido</button>
                        </section>
                    )}
                    <Link href="/minha-conta?aba=pedidos" className="text-center text-sm font-semibold text-brand hover:underline">Ver todos os meus pedidos</Link>
                </aside>
            </Container>
        </>
    );
}
