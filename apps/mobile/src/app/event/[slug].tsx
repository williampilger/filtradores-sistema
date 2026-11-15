/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Detalhe do jogo: lotes de ingresso, benefício de sócio (resgate/entrada automática), escalação, compra
 */
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { formatDateTime, formatMoney, LABELS, type EventDetail, type LineupDTO, type TicketDTO } from '@filt/shared';
import { apiPost } from '@/api';
import { useApi } from '@/hooks/useApi';
import { useSession } from '@/session';
import { setCheckoutDraft, type CheckoutLine } from '@/lib/cart';
import { eventHeadline } from '@/components/EventCard';
import { RemoteImage } from '@/components/RemoteImage';
import { Badge, Button, Card, ClubStripes, Display, ErrorState, HeroBlue, Loading, Notice, Row, Screen, SectionTitle, Stepper, Txt } from '@/components/ui';
import { spacing } from '@/theme';

export default function EventScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const { hasToken, session } = useSession();
    const { data: ev, loading, error, refresh, refreshing, reload } = useApi<EventDetail>(`events/${encodeURIComponent(slug)}`);
    const [qty, setQty] = useState<Record<number, number>>({});
    const [claiming, setClaiming] = useState(false);

    if (loading) return <Loading />;
    if (!ev) return <ErrorState message={error ?? 'Evento não encontrado'} onRetry={refresh} />;

    const isMember = session?.membership?.status === 'ACTIVE';
    const past = new Date(ev.startsAt).getTime() < Date.now() - 6 * 3_600_000;
    const selling = ev.status === 'PUBLISHED' && !past;
    const priceFor = (t: EventDetail['ticketTypes'][number]) => (t.memberPriceCents !== null && isMember ? t.memberPriceCents : t.priceCents);
    const lines: CheckoutLine[] = ev.ticketTypes
        .filter(t => (qty[t.id] ?? 0) > 0)
        .map(t => ({ item: { kind: 'TICKET', ticketTypeId: t.id, quantity: qty[t.id] }, label: `${t.name} - ${eventHeadline(ev)}`, unitCents: priceFor(t) }));
    const total = lines.reduce((s, l) => s + l.unitCents * l.item.quantity, 0);

    function buy() {
        if (!hasToken) { router.push('/login'); return; }
        setCheckoutDraft({ title: eventHeadline(ev!), lines });
        router.push('/checkout');
    }

    async function claim() {
        setClaiming(true);
        const r = await apiPost<TicketDTO>(`events/${encodeURIComponent(slug)}/claim`);
        setClaiming(false);
        if (!r.success) { Alert.alert('Não foi possível resgatar', r.msg); return; }
        void reload();
        Alert.alert('Ingresso resgatado!', 'Seu ingresso de sócio está em Perfil › Meus ingressos.', [
            { text: 'Ver ingresso', onPress: () => router.push('/me/tickets') }, { text: 'OK' },
        ]);
    }

    const mb = ev.memberBenefit;

    return (
        <>
            <Stack.Screen options={{ title: ev.isMatch ? 'Jogo' : 'Evento' }} />
            <Screen padded={false} onRefresh={refresh} refreshing={refreshing}>
                <HeroBlue style={{ padding: spacing.xl, gap: spacing.sm }}>
                    {ev.competition ? <Badge label={ev.competition} tone="gold" /> : null}
                    <Display size={30} color="brandInk">{eventHeadline(ev)}</Display>
                    {ev.homeScore !== null && ev.awayScore !== null ? <Display size={40} color="clubGold">{ev.homeScore} x {ev.awayScore}</Display> : null}
                    <Txt color="brandInk" weight="semibold">{formatDateTime(ev.startsAt)}</Txt>
                    {ev.venue ? <Txt color="sidebarInk">{ev.venue}{ev.address ? ` · ${ev.address}` : ''}</Txt> : null}
                    {ev.gatesOpenAt ? <Txt color="sidebarInk" size={13}>Abertura dos portões: {formatDateTime(ev.gatesOpenAt)}</Txt> : null}
                    {ev.status === 'CANCELED' ? <Badge label="Evento cancelado" tone="danger" /> : null}
                </HeroBlue>
                <ClubStripes height={8} />
                <View style={{ padding: spacing.lg, gap: spacing.md }}>
                    {ev.coverUrl ? <RemoteImage url={ev.coverUrl} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 10 }} /> : null}
                    {ev.description ? <Txt>{ev.description}</Txt> : null}

                    {mb ? <MemberBenefit mb={mb} onClaim={claim} claiming={claiming} selling={selling} /> : null}

                    {selling && ev.ticketTypes.length ? (
                        <>
                            <SectionTitle>Ingressos</SectionTitle>
                            {ev.ticketTypes.map(t => {
                                const max = Math.max(0, Math.min(t.available, t.maxPerOrder));
                                const discounted = isMember && t.memberPriceCents !== null && t.memberPriceCents < t.priceCents;
                                const blocked = !t.onSale || t.available <= 0 || (t.membersOnly && !isMember);
                                return (
                                    <Card key={t.id}>
                                        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1, gap: 2 }}>
                                                <Txt weight="bold" size={16}>{t.name}</Txt>
                                                {t.description ? <Txt size={13} color="inkMuted">{t.description}</Txt> : null}
                                                <Row gap={6}>
                                                    <Txt weight="semibold" color={discounted ? 'inkMuted' : 'brand'} style={discounted ? { textDecorationLine: 'line-through' } : undefined}>{formatMoney(t.priceCents)}</Txt>
                                                    {t.memberPriceCents !== null && t.memberPriceCents < t.priceCents ? <Txt weight="bold" color="ok">{formatMoney(t.memberPriceCents)} sócio</Txt> : null}
                                                </Row>
                                                {t.membersOnly ? <Badge label="Exclusivo sócios" tone="brand" /> : null}
                                                {!t.onSale ? <Txt size={12} color="inkMuted">{t.salesStartAt && new Date(t.salesStartAt) > new Date() ? `Vendas a partir de ${formatDateTime(t.salesStartAt)}` : 'Vendas encerradas'}</Txt>
                                                    : t.available <= 0 ? <Badge label="Esgotado" /> : t.available <= 20 ? <Txt size={12} color="warn">Últimos {t.available}!</Txt> : null}
                                            </View>
                                            <Stepper value={qty[t.id] ?? 0} max={max} disabled={blocked} onChange={n => setQty(q => ({ ...q, [t.id]: n }))} />
                                        </Row>
                                    </Card>
                                );
                            })}
                            <Card>
                                <Row style={{ justifyContent: 'space-between' }}>
                                    <Txt weight="semibold">Total</Txt>
                                    <Display size={24} color="brand">{formatMoney(total)}</Display>
                                </Row>
                                <Button title={hasToken ? 'Comprar ingressos' : 'Entrar para comprar'} variant="accent" icon="ticket-outline" disabled={!lines.length && hasToken} onPress={buy} />
                            </Card>
                        </>
                    ) : null}

                    {ev.lineup ? <Lineup lineup={ev.lineup} /> : null}
                </View>
            </Screen>
        </>
    );
}

function MemberBenefit({ mb, onClaim, claiming, selling }: { mb: NonNullable<EventDetail['memberBenefit']>, onClaim: () => void, claiming: boolean, selling: boolean }) {
    if (mb.access === 'NONE') return null;
    if (!mb.eligible) return <Notice tone="neutral" icon="star-outline" text={mb.reason ?? 'Seu plano não dá acesso a este evento.'} />;
    if (mb.access === 'AUTOMATIC') return <Notice tone="ok" icon="card-outline" text="Sócio: sua entrada é com a carteirinha (QR Code na aba Carteirinha)." />;
    if (mb.claimed) return <Notice tone="ok" icon="checkmark-circle-outline" text="Ingresso de sócio já resgatado. Veja em Perfil › Meus ingressos." />;
    return (
        <Card>
            <Txt weight="bold">Benefício de sócio</Txt>
            <Txt color="inkMuted" size={13}>{LABELS.memberEventAccess.CLAIM}: resgate seu ingresso sem custo.</Txt>
            <Button title="Resgatar meu ingresso" variant="primary" icon="gift-outline" loading={claiming} disabled={!selling} onPress={onClaim} />
        </Card>
    );
}

function Lineup({ lineup }: { lineup: LineupDTO }) {
    const starters = lineup.entries.filter(e => e.starter);
    const bench = lineup.entries.filter(e => !e.starter);
    const row = (e: LineupDTO['entries'][number]) => (
        <Row key={e.playerId} gap={spacing.md} style={{ paddingVertical: 6 }}>
            <RemoteImage url={e.photoUrl} style={{ width: 40, height: 40, borderRadius: 20 }} placeholderIcon="person" />
            <Display size={20} color="brand" style={{ width: 34 }}>{e.number ?? '-'}</Display>
            <View style={{ flex: 1 }}>
                <Txt weight="semibold">{e.nickname || e.name}{e.isCaptain ? ' (C)' : ''}</Txt>
                <Txt size={12} color="inkMuted">{LABELS.playerPosition[e.position]}</Txt>
            </View>
        </Row>
    );
    return (
        <>
            <SectionTitle right={lineup.formation ? <Badge label={lineup.formation} tone="brand" /> : undefined}>Escalação</SectionTitle>
            <Card>
                <Txt weight="bold" color="brand">Titulares</Txt>
                {starters.map(row)}
                {bench.length ? <Txt weight="bold" color="brand" style={{ marginTop: spacing.sm }}>Reservas</Txt> : null}
                {bench.map(row)}
                {lineup.notes ? <Txt size={13} color="inkMuted" style={{ marginTop: spacing.sm }}>{lineup.notes}</Txt> : null}
            </Card>
        </>
    );
}
