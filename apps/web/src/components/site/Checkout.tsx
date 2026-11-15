'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Checkout (usado nas páginas de evento e de produto)
 *  - exige login (o pedido e os ingressos ficam na conta do torcedor)
 *  - CPF obrigatório (exigência dos meios de pagamento)
 *  - se o pagamento não iniciar, o pedido continua reservado: o torcedor tenta outro método em /pedido/<code>
 */
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaBarcode, FaCreditCard, FaLock, FaQrcode, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { formatCpf, formatMoney, isValidCpf, LABELS, onlyDigits, type PaymentMethod } from '@filt/shared';
import API, { cleanMsg } from '@/api';
import { Field, Input, Spinner } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { CLUB_INSTAGRAM, currentPath, loginHref } from './helpers';

export type CartItem = Parameters<typeof API.checkout.create>[0]['items'][number];
export type CheckoutLine = { label: string, quantity: number, unitCents: number, memberUnitCents?: number | null };

const METHOD_ICON: Record<string, React.ReactNode> = {
    PIX: <FaQrcode />, CARD: <FaCreditCard />, BOLETO: <FaBarcode />, CHECKOUT: <FaArrowUpRightFromSquare />,
};
const METHOD_HINT: Record<string, string> = {
    PIX: 'Aprovação na hora',
    CARD: 'Crédito, em ambiente seguro',
    BOLETO: 'Compensa em até 3 dias úteis',
    CHECKOUT: 'Escolha a forma no site do pagamento',
};

export function CheckoutBox({ items, lines, title = 'Finalizar compra', note }: { items: CartItem[], lines: CheckoutLine[], title?: string, note?: React.ReactNode }) {
    const router = useRouter();
    const { session, loading } = useSession();
    const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [customer, setCustomer] = useState({ name: '', email: '', cpf: '', phone: '' });
    const [busy, setBusy] = useState(false);
    const ready = !!session && !session.mfaPending && !session.mfaSetupRequired;

    useEffect(() => {
        if (!ready) return;
        API.public.paymentMethods().then(r => {
            const list = r.success ? r.data : [];
            setMethods(list);
            setMethod(m => m ?? list[0] ?? null);
        });
    }, [ready]);

    useEffect(() => {
        if (!session) return;
        setCustomer(c => ({
            name: c.name || session.user.name,
            email: c.email || session.user.email,
            cpf: c.cpf || formatCpf(session.user.cpf),
            phone: c.phone || (session.user.phone ?? ''),
        }));
    }, [session]);

    const totalCents = lines.reduce((s, l) => s + l.quantity * (l.memberUnitCents ?? l.unitCents), 0);
    const hasMemberPrice = lines.some(l => l.memberUnitCents != null && l.memberUnitCents < l.unitCents);

    const summary = (
        <div className="rounded-lg bg-surface-alt p-3 text-sm">
            {lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-2 py-0.5">
                    <span className="min-w-0 truncate">{l.quantity}× {l.label}</span>
                    <span className="num">{formatMoney(l.quantity * (l.memberUnitCents ?? l.unitCents))}</span>
                </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-bold">
                <span>Total</span><span className="num text-brand">{formatMoney(totalCents)}</span>
            </div>
            {hasMemberPrice && <div className="mt-1 text-xs text-ok">Preço de sócio aplicado</div>}
        </div>
    );

    if (loading) return <Spinner />;

    if (!ready) {
        return (
            <section className="panel flex flex-col gap-3 p-5">
                <h3 className="display text-2xl text-brand-deep">{title}</h3>
                {summary}
                <p className="text-sm text-ink-muted">Entre na sua conta para concluir a compra. Seus ingressos e pedidos ficam guardados nela.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" className="btn btn-primary btn-lg flex-1" onClick={() => router.push(session ? `/2fa?next=${encodeURIComponent(currentPath())}` : loginHref(currentPath()))}>
                        {session ? 'Concluir verificação' : 'Entrar para comprar'}
                    </button>
                    {!session && <button type="button" className="btn btn-lg flex-1" onClick={() => router.push(`/cadastro?next=${encodeURIComponent(currentPath())}`)}>Criar conta</button>}
                </div>
            </section>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!method) return;
        if (customer.name.trim().length < 2) return void toast.error('Informe o nome completo');
        if (!isValidCpf(customer.cpf)) return void toast.error('CPF inválido');
        const phone = onlyDigits(customer.phone);
        if (phone && (phone.length < 10 || phone.length > 13)) return void toast.error('Telefone inválido (DDD + número)');
        setBusy(true);
        const r = await API.checkout.create({
            items, method,
            customer: { name: customer.name.trim(), email: customer.email.trim(), cpf: onlyDigits(customer.cpf), phone: phone || undefined },
        });
        if (!r.success) { setBusy(false); return; }
        if (r.data.paymentError) toast.warn(`Pedido reservado, mas o pagamento não iniciou: ${cleanMsg(r.data.paymentError)}. Tente outro método na página do pedido.`, { autoClose: 8000 });
        router.push(`/pedido/${r.data.order.code}`);
    };

    return (
        <form onSubmit={submit} className="panel flex flex-col gap-4 p-5">
            <h3 className="display text-2xl text-brand-deep">{title}</h3>
            {summary}
            {note}

            {methods === null ? <Spinner label="Carregando formas de pagamento..." /> : methods.length === 0 ? (
                <div className="rounded-lg border border-warn bg-warn-soft p-4 text-sm text-ink">
                    <b>Pagamentos online indisponíveis no momento.</b><br />
                    Compre na portaria do ginásio ou fale com a diretoria pelo Instagram <a href={`https://instagram.com/${CLUB_INSTAGRAM}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">@{CLUB_INSTAGRAM}</a>.
                </div>
            ) : (
                <>
                    <fieldset className="grid gap-3 sm:grid-cols-2">
                        <legend className="lbl mb-2">Seus dados</legend>
                        <Field label="Nome completo"><Input value={customer.name} onChange={v => setCustomer({ ...customer, name: v })} required autoComplete="name" /></Field>
                        <Field label="E-mail"><Input type="email" value={customer.email} onChange={v => setCustomer({ ...customer, email: v })} required autoComplete="email" /></Field>
                        <Field label="CPF" hint={customer.cpf && !isValidCpf(customer.cpf) ? <span className="text-danger">CPF inválido</span> : undefined}>
                            <Input value={customer.cpf} onChange={v => setCustomer({ ...customer, cpf: v })} onBlur={() => setCustomer(c => ({ ...c, cpf: formatCpf(c.cpf) }))} inputMode="numeric" required placeholder="000.000.000-00" />
                        </Field>
                        <Field label="Celular (opcional)"><Input type="tel" value={customer.phone} onChange={v => setCustomer({ ...customer, phone: v })} autoComplete="tel" placeholder="(51) 99999-9999" /></Field>
                    </fieldset>

                    <fieldset>
                        <legend className="lbl mb-2">Forma de pagamento</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {methods.map(m => (
                                <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${method === m ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-hover'}`}>
                                    <input type="radio" name="method" className="accent-brand" checked={method === m} onChange={() => setMethod(m)} />
                                    <span className="text-lg text-brand">{METHOD_ICON[m]}</span>
                                    <span>
                                        <span className="block font-semibold">{LABELS.paymentMethod[m]}</span>
                                        <span className="block text-xs text-ink-muted">{METHOD_HINT[m]}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <button type="submit" className="btn btn-accent btn-lg w-full" disabled={busy || !method}>
                        <FaLock /> {busy ? 'Reservando...' : `Pagar ${formatMoney(totalCents)}`}
                    </button>
                    <p className="text-center text-xs text-ink-muted">Os itens ficam reservados por alguns minutos enquanto você paga.</p>
                </>
            )}
        </form>
    );
}
