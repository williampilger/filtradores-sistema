/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Ingresso com QR grande (apresentado na portaria)
 */
import { View } from 'react-native';
import { formatDateTime, LABELS, type TicketDTO, type TicketStatus } from '@filt/shared';
import { Badge, Card, ClubStripes, Display, Row, Txt, textStyles } from './ui';
import { QrCode } from './QrCode';
import { spacing } from '@/theme';

const TONE: Record<TicketStatus, 'ok' | 'neutral' | 'danger' | 'info'> = { VALID: 'ok', USED: 'neutral', CANCELED: 'danger', REFUNDED: 'info' };

export function TicketCard({ ticket, compact }: { ticket: TicketDTO, compact?: boolean }) {
    const valid = ticket.status === 'VALID';
    return (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
            <ClubStripes height={8} />
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                <Row style={{ justifyContent: 'space-between' }}>
                    <Txt size={13} color="brand" weight="semibold">{formatDateTime(ticket.event.startsAt)}</Txt>
                    <Badge label={LABELS.ticketStatus[ticket.status]} tone={TONE[ticket.status]} />
                </Row>
                <Display size={20}>{ticket.event.title}</Display>
                {ticket.event.venue ? <Txt size={13} color="inkMuted">{ticket.event.venue}</Txt> : null}
                <Txt><Txt weight="semibold">{ticket.ticketTypeName ?? LABELS.ticketOrigin[ticket.origin]}</Txt> · {ticket.holderName}</Txt>
                {valid && !compact ? (
                    <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
                        <QrCode value={ticket.qr} size={240} />
                        <Txt size={12} color="inkMuted" style={textStyles.mono}>{ticket.code}</Txt>
                    </View>
                ) : null}
                {ticket.usedAt ? <Txt size={12} color="inkMuted">Entrada registrada em {formatDateTime(ticket.usedAt)}</Txt> : null}
            </View>
        </Card>
    );
}
