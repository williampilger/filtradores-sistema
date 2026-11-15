/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Painel do evento (organização): contadores, lotes, origem dos ingressos, resultados e últimas entradas
 */
import { useLocalSearchParams } from 'expo-router';
import { formatDateTime, formatMoney, LABELS, type CheckInResult, type TicketOrigin } from '@filt/shared';
import { useApi } from '@/hooks/useApi';
import { can, useSession } from '@/session';
import type { CheckInLog, StaffEventPanel } from '@/lib/staff';
import { Counters } from '@/components/Counters';
import { Badge, Card, Display, ErrorState, Loading, Row, Screen, SectionTitle, Txt } from '@/components/ui';

export default function GatePanelScreen() {
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const { session } = useSession();
    const { data, loading, error, refresh, refreshing } = useApi<StaffEventPanel>(`staff/events/${eventId}`, { pollMs: 15_000 });
    const showLog = can(session, 'checkin.validate');
    const { data: log } = useApi<CheckInLog[]>(showLog ? `staff/events/${eventId}/checkins` : null, { pollMs: 15_000 });

    if (loading) return <Loading />;
    if (!data) return <ErrorState message={error ?? 'Erro ao carregar'} onRetry={refresh} />;

    const origins = Object.entries(data.ticketsByOrigin) as [TicketOrigin, number][];
    const results = Object.entries(data.checkinsByResult ?? {}) as [CheckInResult, number][];

    return (
        <Screen onRefresh={refresh} refreshing={refreshing}>
            <Display size={22}>{data.title}</Display>
            <Txt color="inkMuted">{formatDateTime(data.startsAt)}{data.venue ? ` · ${data.venue}` : ''}</Txt>
            <Counters c={data.counters} />

            <SectionTitle>Lotes</SectionTitle>
            {data.ticketTypes.map(t => (
                <Card key={t.id}>
                    <Row style={{ justifyContent: 'space-between' }}>
                        <Txt weight="bold" style={{ flex: 1 }}>{t.name}</Txt>
                        <Txt weight="semibold" color="brand">{formatMoney(t.priceCents)}</Txt>
                    </Row>
                    <Txt size={13} color="inkMuted">Emitidos {t.allocated} de {t.quantity} · disponíveis {t.available}{t.onSale ? '' : ' · fora de venda'}</Txt>
                </Card>
            ))}

            {origins.length ? (
                <>
                    <SectionTitle>Ingressos por origem</SectionTitle>
                    <Card>{origins.map(([k, n]) => <Row key={k} style={{ justifyContent: 'space-between' }}><Txt>{LABELS.ticketOrigin[k]}</Txt><Txt weight="bold">{n}</Txt></Row>)}</Card>
                </>
            ) : null}

            {results.length ? (
                <>
                    <SectionTitle>Leituras na portaria</SectionTitle>
                    <Card>{results.map(([k, n]) => <Row key={k} style={{ justifyContent: 'space-between' }}><Txt color={k === 'OK' ? 'ok' : 'ink'}>{LABELS.checkInResult[k]}</Txt><Txt weight="bold">{n}</Txt></Row>)}</Card>
                </>
            ) : null}

            {log?.length ? (
                <>
                    <SectionTitle>Últimas leituras</SectionTitle>
                    {log.slice(0, 50).map(c => (
                        <Card key={c.id}>
                            <Row style={{ justifyContent: 'space-between' }}>
                                <Txt weight="semibold" style={{ flex: 1 }}>{c.name ?? '-'}</Txt>
                                <Badge label={c.label} tone={c.result === 'OK' ? 'ok' : 'danger'} />
                            </Row>
                            <Txt size={12} color="inkMuted">{formatDateTime(c.createdAt)} · {c.kind === 'member' ? 'Sócio' : c.kind === 'ticket' ? 'Ingresso' : '-'} · {c.operator}</Txt>
                        </Card>
                    ))}
                </>
            ) : null}
        </Screen>
    );
}
