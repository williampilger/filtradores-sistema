/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Portaria de um evento: atalhos conforme as permissões (leitor, busca, painel, venda)
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useApi } from '@/hooks/useApi';
import { can, useSession } from '@/session';
import type { StaffEventPanel } from '@/lib/staff';
import { Counters } from '@/components/Counters';
import { Button, Display, Screen, Txt } from '@/components/ui';

export default function GateHubScreen() {
    const { eventId, title, slug } = useLocalSearchParams<{ eventId: string, title?: string, slug?: string }>();
    const { session } = useSession();
    const { data, refresh, refreshing } = useApi<StaffEventPanel>(`staff/events/${eventId}`, { pollMs: 15_000 });
    const params = { eventId, title: data?.title ?? title ?? '', slug: data?.slug ?? slug ?? '' };

    const validator = can(session, 'checkin.validate');
    const organizer = can(session, 'events.read', 'checkin.reports');
    const seller = can(session, 'tickets.sell_manual');

    return (
        <>
            <Stack.Screen options={{ title: 'Portaria' }} />
            <Screen onRefresh={refresh} refreshing={refreshing}>
                <Display size={24}>{params.title}</Display>
                {data ? <Counters c={data.counters} /> : null}
                {validator ? <Button title="Ler QR Code" icon="scan" variant="accent" onPress={() => router.push({ pathname: '/gate/[eventId]/scanner', params })} /> : null}
                {validator ? <Button title="Busca manual" icon="search" variant="primary" onPress={() => router.push({ pathname: '/gate/[eventId]/search', params })} /> : null}
                {organizer || validator ? <Button title="Painel do evento" icon="stats-chart" variant="outline" onPress={() => router.push({ pathname: '/gate/[eventId]/panel', params })} /> : null}
                {seller ? <Button title="Venda na portaria" icon="cash-outline" variant="outline" onPress={() => router.push({ pathname: '/gate/[eventId]/sell', params })} /> : null}
                {!validator && !seller && !organizer ? <Txt color="inkMuted">Você não tem permissões de portaria neste evento.</Txt> : null}
            </Screen>
        </>
    );
}
