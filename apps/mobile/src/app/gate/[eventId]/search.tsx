/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Busca manual na portaria (nome / CPF / nº de sócio) -> registrar entrada
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LABELS, type CheckInResponse } from '@filt/shared';
import { apiGet, apiPost } from '@/api';
import { getDeviceId } from '@/storage';
import type { AttendeeSearch } from '@/lib/staff';
import { RemoteImage } from '@/components/RemoteImage';
import { Badge, Button, Card, Input, Loading, Notice, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { spacing } from '@/theme';

export default function GateSearchScreen() {
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const [q, setQ] = useState('');
    const [res, setRes] = useState<AttendeeSearch | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [last, setLast] = useState<{ ok: boolean, text: string } | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const seq = useRef(0);

    const search = async (term: string) => {
        const my = ++seq.current;
        if (term.trim().length < 2) { setRes(null); return; }
        setLoading(true);
        const r = await apiGet<AttendeeSearch>(`staff/events/${eventId}/search?q=${encodeURIComponent(term.trim())}`);
        if (my !== seq.current) return;
        setLoading(false);
        if (r.success) { setRes(r.data); setError(null); } else setError(r.msg);
    };

    useEffect(() => {
        const t = setTimeout(() => { void search(q); }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    async function checkIn(body: { ticketId: number } | { membershipId: number }, label: string) {
        const key = 'ticketId' in body ? `t${body.ticketId}` : `m${body.membershipId}`;
        setBusyId(key);
        const r = await apiPost<CheckInResponse>(`staff/events/${eventId}/checkin`, { ...body, deviceId: await getDeviceId() });
        setBusyId(null);
        if (!r.success) { Alert.alert('Erro', r.msg); return; }
        const ok = r.data.result === 'OK';
        void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        setLast({ ok, text: ok ? `LIBERADO: ${label}` : `NEGADO: ${label} - ${r.data.message || LABELS.checkInResult[r.data.result]}` });
        void search(q);
    }

    function confirm(body: { ticketId: number } | { membershipId: number }, label: string) {
        Alert.alert('Registrar entrada', `Confirmar a entrada de ${label}? Confira o documento com foto.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Liberar', onPress: () => void checkIn(body, label) },
        ]);
    }

    return (
        <Screen>
            <Input placeholder="Nome, CPF ou nº de sócio" value={q} onChangeText={setQ} autoFocus autoCorrect={false} returnKeyType="search" />
            {last ? <Notice tone={last.ok ? 'ok' : 'danger'} icon={last.ok ? 'checkmark-circle' : 'close-circle'} text={last.text} /> : null}
            {error ? <Notice tone="danger" text={error} /> : null}
            {loading && !res ? <Loading /> : null}
            {res ? (
                <>
                    <SectionTitle>Sócios ({res.members.length})</SectionTitle>
                    {res.members.map(m => (
                        <Card key={`m${m.membershipId}`}>
                            <Row gap={spacing.md}>
                                <RemoteImage url={m.photoUrl} auth style={{ width: 54, height: 68, borderRadius: 8 }} placeholderIcon="person" />
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Txt weight="bold">{m.name}</Txt>
                                    <Txt size={13} color="inkMuted">{m.planName}{m.memberNumber ? ` · nº ${m.memberNumber}` : ''} · CPF {m.cpfMasked || '-'}</Txt>
                                    <Badge label={LABELS.membershipStatus[m.status]} tone={m.status === 'ACTIVE' ? 'ok' : 'danger'} />
                                </View>
                            </Row>
                            <Button small title="Registrar entrada" loading={busyId === `m${m.membershipId}`} onPress={() => confirm({ membershipId: m.membershipId }, m.name)} />
                        </Card>
                    ))}
                    <SectionTitle>Ingressos ({res.tickets.length})</SectionTitle>
                    {res.tickets.map(t => (
                        <Card key={`t${t.id}`}>
                            <Row style={{ justifyContent: 'space-between' }}>
                                <Txt weight="bold" style={{ flex: 1 }}>{t.holderName}</Txt>
                                <Badge label={LABELS.ticketStatus[t.status]} tone={t.status === 'VALID' ? 'ok' : t.status === 'USED' ? 'neutral' : 'danger'} />
                            </Row>
                            <Txt size={13} color="inkMuted">{t.ticketTypeName ?? LABELS.ticketOrigin[t.origin]} · CPF {t.cpfMasked || '-'}</Txt>
                            {t.status === 'VALID' ? <Button small title="Registrar entrada" loading={busyId === `t${t.id}`} onPress={() => confirm({ ticketId: t.id }, t.holderName)} /> : null}
                        </Card>
                    ))}
                </>
            ) : <Txt color="inkMuted" center>Digite ao menos 2 caracteres.</Txt>}
        </Screen>
    );
}
