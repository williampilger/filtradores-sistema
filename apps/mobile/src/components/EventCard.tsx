/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Card de jogo/evento (lista de jogos e destaque "próximo jogo")
 */
import { View } from 'react-native';
import { router } from 'expo-router';
import { formatDateTime, formatMoney, type EventListItem } from '@filt/shared';
import { Badge, Button, Card, ClubMark, Display, HeroBlue, Row, Txt } from './ui';
import { colors, radius, spacing } from '@/theme';

/** "ACEF x ADVERSÁRIO" para jogos; título do evento para os demais */
export const eventHeadline = (e: Pick<EventListItem, 'isMatch' | 'opponent' | 'title'>) => (e.isMatch && e.opponent ? `ACEF x ${e.opponent}` : e.title);

const open = (slug: string) => router.push({ pathname: '/event/[slug]', params: { slug } });

export function EventCard({ event }: { event: EventListItem }) {
    const past = new Date(event.startsAt).getTime() < Date.now() - 6 * 3_600_000;
    const hasScore = event.homeScore !== null && event.awayScore !== null;
    return (
        <Card onPress={() => open(event.slug)}>
            <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={13} color="brand" weight="semibold">{formatDateTime(event.startsAt)}</Txt>
                {event.competition ? <Badge label={event.competition} tone="brand" /> : null}
            </Row>
            <Display size={21}>{eventHeadline(event)}</Display>
            {event.venue ? <Txt size={13} color="inkMuted">{event.venue}</Txt> : null}
            <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
                {hasScore ? <Display size={24} color="brandDeep">{event.homeScore} x {event.awayScore}</Display>
                    : event.status === 'CANCELED' ? <Badge label="Cancelado" tone="danger" />
                    : past ? <Badge label="Encerrado" />
                    : event.fromPriceCents !== null ? <Txt weight="semibold">A partir de {formatMoney(event.fromPriceCents)}</Txt>
                    : <Txt color="inkMuted">Entrada franca / sócios</Txt>}
                <Txt color="brand" weight="bold">Ver detalhes ›</Txt>
            </Row>
        </Card>
    );
}

/** Destaque azul do próximo jogo (Início) */
export function NextMatch({ event }: { event: EventListItem }) {
    return (
        <HeroBlue style={{ borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm }}>
            <Badge label="Próximo jogo" tone="gold" />
            <Row gap={spacing.md}>
                <ClubMark size={48} />
                <Display size={18} color="brandInk">x</Display>
                <View style={{ flex: 1 }}>
                    <Display size={22} color="brandInk" numberOfLines={2}>{event.isMatch && event.opponent ? event.opponent : event.title}</Display>
                </View>
            </Row>
            <Txt color="brandInk" weight="semibold">{formatDateTime(event.startsAt)}</Txt>
            {event.venue ? <Txt color="sidebarInk" size={13}>{event.venue}{event.competition ? ` · ${event.competition}` : ''}</Txt> : null}
            <Button title="Garanta seu ingresso" variant="accent" icon="ticket-outline" onPress={() => open(event.slug)} style={{ marginTop: spacing.sm }} />
            <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, borderWidth: 14, borderColor: colors.brand, opacity: 0.5 }} />
        </HeroBlue>
    );
}
