/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Planos de sócio com o CTA "Quero ser sócio"
 *  (iOS: abre o site - ver src/lib/membership.ts e o README sobre a revisão da App Store)
 */
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { formatMoney, LABELS, type PlanDTO } from '@filt/shared';
import { useApi } from '@/hooks/useApi';
import { useSession } from '@/session';
import { joinPlan, MEMBERSHIP_IN_APP } from '@/lib/membership';
import { Badge, Button, Card, Display, ErrorState, Ionicons, Loading, Row, Txt } from './ui';
import { colors, spacing } from '@/theme';

export function PlansList() {
    const { session, hasToken } = useSession();
    const { data, loading, error, refresh } = useApi<PlanDTO[]>('plans', { refetchOnFocus: false });
    const [busy, setBusy] = useState<number | null>(null);

    async function join(plan: PlanDTO) {
        if (MEMBERSHIP_IN_APP && !hasToken) { router.push('/login'); return; }
        setBusy(plan.id);
        const err = await joinPlan(plan.id);
        setBusy(null);
        if (err) Alert.alert('Não foi possível continuar', err);
    }

    if (loading) return <Loading />;
    if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
    if (!data?.length) return <Txt color="inkMuted" center>Nenhum plano disponível no momento.</Txt>;

    const current = session?.membership;
    return (
        <View style={{ gap: spacing.md }}>
            {data.map(p => (
                <Card key={p.id}>
                    <Row style={{ justifyContent: 'space-between' }}>
                        <Display size={22} color="brandDeep" style={{ flex: 1 }}>{p.name}</Display>
                        {current?.plan.id === p.id ? <Badge label="Seu plano" tone="ok" /> : null}
                    </Row>
                    <Row gap={4} style={{ alignItems: 'baseline' }}>
                        <Display size={28} color="brand">{formatMoney(p.priceCents)}</Display>
                        <Txt color="inkMuted">/ {LABELS.billingPeriod[p.period].toLowerCase()}</Txt>
                    </Row>
                    {p.enrollmentFeeCents > 0 ? <Txt size={13} color="inkMuted">+ taxa de adesão de {formatMoney(p.enrollmentFeeCents)}</Txt> : null}
                    {p.description ? <Txt color="inkMuted">{p.description}</Txt> : null}
                    <View style={{ gap: 6, marginVertical: 4 }}>
                        {p.eventAccess !== 'NONE' ? <Benefit text={LABELS.memberEventAccess[p.eventAccess]} /> : null}
                        {p.ticketDiscountPct > 0 ? <Benefit text={`${p.ticketDiscountPct}% de desconto nos ingressos`} /> : null}
                        {p.storeDiscountPct > 0 ? <Benefit text={`${p.storeDiscountPct}% de desconto na loja`} /> : null}
                        {p.benefits.map(b => <Benefit key={b} text={b} />)}
                    </View>
                    <Button
                        title="Quero ser sócio"
                        variant="accent"
                        icon={MEMBERSHIP_IN_APP ? 'star' : 'open-outline'}
                        loading={busy === p.id}
                        disabled={busy !== null || (current?.status === 'ACTIVE' && current.plan.id === p.id)}
                        onPress={() => join(p)}
                    />
                </Card>
            ))}
            {!MEMBERSHIP_IN_APP ? <Txt size={12} color="inkMuted" center>A adesão é concluída no site do clube.</Txt> : null}
        </View>
    );
}

function Benefit({ text }: { text: string }) {
    return (
        <Row gap={8} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="checkmark-circle" size={18} color={colors.ok} />
            <Txt style={{ flex: 1 }}>{text}</Txt>
        </Row>
    );
}
