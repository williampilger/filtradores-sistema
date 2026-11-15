/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Sócio: plano, situação e cobranças (pagar em aberto)
 */
import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { formatDate, formatMoney, LABELS, type ChargeDTO, type MembershipStatus, type PlanDTO } from '@filt/shared';
import { useApi } from '@/hooks/useApi';
import { MEMBERSHIP_IN_APP, payCharge } from '@/lib/membership';
import { Badge, Button, Card, Display, Empty, ErrorState, Loading, Row, Screen, SectionTitle, Txt } from '@/components/ui';

type MembershipResponse = {
    membership: { id: number, status: MembershipStatus, memberNumber: number | null, startedAt: string | null, currentPeriodEnd: string | null, plan: PlanDTO } | null;
    charges: ChargeDTO[];
};

const STATUS_TONE: Record<MembershipStatus, 'ok' | 'warn' | 'danger' | 'neutral'> = { ACTIVE: 'ok', PENDING: 'warn', OVERDUE: 'danger', CANCELED: 'neutral', EXPIRED: 'neutral' };

export default function MembershipScreen() {
    const { data, loading, error, refresh, refreshing, reload } = useApi<MembershipResponse>('me/membership');
    const [paying, setPaying] = useState<number | null>(null);

    if (loading) return <Loading />;
    if (!data) return <ErrorState message={error ?? 'Erro ao carregar'} onRetry={refresh} />;

    const m = data.membership;
    if (!m) {
        return <Empty icon="star-outline" text="Você ainda não é sócio."><Button title="Conheça os planos" variant="accent" onPress={() => router.push('/plans')} /></Empty>;
    }

    async function pay(c: ChargeDTO) {
        setPaying(c.id);
        const err = await payCharge(c.id);
        setPaying(null);
        if (err) Alert.alert('Não foi possível gerar o pagamento', err);
        void reload();
    }

    return (
        <Screen onRefresh={refresh} refreshing={refreshing}>
            <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                    <Display size={22} color="brandDeep" style={{ flex: 1 }}>{m.plan.name}</Display>
                    <Badge label={LABELS.membershipStatus[m.status]} tone={STATUS_TONE[m.status]} />
                </Row>
                <Txt>{formatMoney(m.plan.priceCents)} / {LABELS.billingPeriod[m.plan.period].toLowerCase()}</Txt>
                {m.memberNumber ? <Txt color="inkMuted">Sócio nº {m.memberNumber}</Txt> : null}
                {m.startedAt ? <Txt color="inkMuted">Desde {formatDate(m.startedAt)}</Txt> : null}
                {m.currentPeriodEnd ? <Txt color="inkMuted">Período atual até {formatDate(m.currentPeriodEnd)}</Txt> : null}
            </Card>
            {(m.status === 'CANCELED' || m.status === 'EXPIRED') ? <Button title="Voltar a ser sócio" variant="accent" onPress={() => router.push('/plans')} /> : null}

            <SectionTitle>Cobranças</SectionTitle>
            {data.charges.length === 0 ? <Txt color="inkMuted">Nenhuma cobrança.</Txt> : data.charges.map(c => {
                const open = c.status === 'OPEN' || c.status === 'OVERDUE';
                return (
                    <Card key={c.id}>
                        <Row style={{ justifyContent: 'space-between' }}>
                            <Txt weight="bold">{formatMoney(c.amountCents)}</Txt>
                            <Badge label={LABELS.chargeStatus[c.status]} tone={c.status === 'PAID' ? 'ok' : c.status === 'OVERDUE' ? 'danger' : open ? 'warn' : 'neutral'} />
                        </Row>
                        <Txt size={13} color="inkMuted">Vencimento {formatDate(c.dueDate)}{c.periodStart && c.periodEnd ? ` · período ${formatDate(c.periodStart)} a ${formatDate(c.periodEnd)}` : ''}</Txt>
                        {c.paidAt ? <Txt size={13} color="ok">Paga em {formatDate(c.paidAt)}</Txt> : null}
                        {open ? <Button title={MEMBERSHIP_IN_APP ? 'Pagar' : 'Pagar no site'} variant="accent" small icon={MEMBERSHIP_IN_APP ? 'card-outline' : 'open-outline'} loading={paying === c.id} disabled={paying !== null} onPress={() => pay(c)} /> : null}
                    </Card>
                );
            })}
        </Screen>
    );
}
