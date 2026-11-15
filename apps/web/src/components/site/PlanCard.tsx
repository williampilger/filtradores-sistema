/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Card de plano de sócio-torcedor
 */
import { FaCheck, FaStar } from 'react-icons/fa6';
import { formatMoney, LABELS, type PlanDTO } from '@filt/shared';

const PERIOD_SUFFIX = { MONTHLY: '/mês', QUARTERLY: '/trimestre', SEMIANNUAL: '/semestre', YEARLY: '/ano' } as const;

export function PlanCard({ plan, featured, action }: { plan: PlanDTO, featured?: boolean, action?: React.ReactNode }) {
    const perks: string[] = [];
    if (plan.eventAccess !== 'NONE') perks.push(`Jogos em casa: ${LABELS.memberEventAccess[plan.eventAccess].toLowerCase()}`);
    if (plan.ticketDiscountPct > 0) perks.push(`${plan.ticketDiscountPct}% de desconto em ingressos`);
    if (plan.storeDiscountPct > 0) perks.push(`${plan.storeDiscountPct}% de desconto na loja`);
    return (
        <article className={`relative flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm ${featured ? 'border-club-gold ring-2 ring-club-gold' : 'border-line'}`}>
            <div className="hero-blue relative px-5 pb-5 pt-6">
                {featured && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-club-gold px-2 py-0.5 text-[11px] font-bold uppercase text-brand-deep">
                        <FaStar /> Mais escolhido
                    </span>
                )}
                <div className="text-[11px] font-bold uppercase tracking-[.2em] text-club-gold">Plano {LABELS.billingPeriod[plan.period].toLowerCase()}</div>
                <h3 className="display mt-1 text-3xl">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                    <span className="display text-4xl">{formatMoney(plan.priceCents)}</span>
                    <span className="text-sm opacity-80">{PERIOD_SUFFIX[plan.period]}</span>
                </div>
                {plan.enrollmentFeeCents > 0
                    ? <div className="mt-1 text-xs opacity-80">+ adesão de {formatMoney(plan.enrollmentFeeCents)} (uma vez)</div>
                    : <div className="mt-1 text-xs opacity-80">Sem taxa de adesão</div>}
            </div>
            <div className="club-stripes h-1.5" aria-hidden />
            <div className="flex flex-1 flex-col gap-4 p-5">
                {plan.description && <p className="text-sm text-ink-muted">{plan.description}</p>}
                <ul className="flex flex-col gap-2 text-sm">
                    {[...perks, ...plan.benefits].map((b, i) => (
                        <li key={i} className="flex gap-2"><FaCheck className="mt-0.5 shrink-0 text-ok" /><span>{b}</span></li>
                    ))}
                </ul>
                {action && <div className="mt-auto pt-2">{action}</div>}
            </div>
        </article>
    );
}
