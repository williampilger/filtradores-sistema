/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Contadores do evento (portaria / painel)
 */
import { View } from 'react-native';
import type { EventCounters } from '@filt/shared';
import { Display, Txt } from './ui';
import { colors, radius, spacing, type ColorToken } from '@/theme';

function Box({ label, value, tone = 'brand' }: { label: string, value: string, tone?: ColorToken }) {
    return (
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.line, gap: 2 }}>
            <Display size={24} color={tone}>{value}</Display>
            <Txt size={11} color="inkMuted" weight="semibold">{label}</Txt>
        </View>
    );
}

export function Counters({ c }: { c: EventCounters }) {
    return (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Box label="Ingressos" value={String(c.ticketsSold)} />
            <Box label="Entraram" value={String(c.ticketsUsed)} tone="ok" />
            <Box label="Sócios" value={String(c.memberEntries)} tone="brandDeep" />
            {c.capacity ? <Box label="Capacidade" value={String(c.capacity)} tone="inkMuted" /> : null}
        </View>
    );
}
