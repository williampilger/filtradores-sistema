/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Venda na portaria (exige 'tickets.sell_manual'): lotes x quantidade + dinheiro/PIX/manual -> ingressos emitidos
 */
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { formatCpf, formatMoney, isValidCpf, LABELS, onlyDigits, type EventDetail, type TicketTypeDTO } from '@filt/shared';
import { apiGet, apiPost } from '@/api';
import { can, useSession } from '@/session';
import type { GateSaleResult, StaffEventPanel } from '@/lib/staff';
import { TicketCard } from '@/components/TicketCard';
import { Button, Card, Chip, Display, ErrorState, Input, Loading, Notice, Row, Screen, SectionTitle, Stepper, Txt } from '@/components/ui';

type GateMethod = 'CASH' | 'PIX' | 'MANUAL';

export default function GateSellScreen() {
    const { eventId, slug } = useLocalSearchParams<{ eventId: string, slug?: string }>();
    const { session } = useSession();
    const [types, setTypes] = useState<TicketTypeDTO[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [qty, setQty] = useState<Record<number, number>>({});
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [method, setMethod] = useState<GateMethod>('CASH');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sale, setSale] = useState<GateSaleResult | null>(null);

    async function load() {
        setLoadError(null);
        // painel do staff (com estoque); vendedor sem permissão de check-in usa os lotes públicos do evento
        const r = await apiGet<StaffEventPanel>(`staff/events/${eventId}`, { silent: true });
        if (r.success) { setTypes(r.data.ticketTypes); return; }
        if (slug) {
            const p = await apiGet<EventDetail>(`events/${encodeURIComponent(slug)}`);
            if (p.success) { setTypes(p.data.ticketTypes); return; }
        }
        setLoadError(r.msg);
    }
    useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!can(session, 'tickets.sell_manual')) return <ErrorState message="Você não tem permissão para vender na portaria." />;
    if (loadError) return <ErrorState message={loadError} onRetry={load} />;
    if (!types) return <Loading />;

    const lines = types.filter(t => (qty[t.id] ?? 0) > 0).map(t => ({ ticketTypeId: t.id, quantity: qty[t.id] }));
    const total = types.reduce((s, t) => s + (qty[t.id] ?? 0) * t.priceCents, 0);

    async function submit() {
        setError(null);
        if (!lines.length) return setError('Escolha ao menos um ingresso');
        if (cpf && !isValidCpf(cpf)) return setError('CPF inválido');
        setBusy(true);
        const r = await apiPost<GateSaleResult>(`staff/events/${eventId}/sell`, {
            lines, customerName: name.trim(), customerCpf: cpf ? onlyDigits(cpf) : undefined, method,
        });
        setBusy(false);
        if (!r.success) return setError(r.msg);
        setSale(r.data);
        setQty({}); setName(''); setCpf('');
        void load();
    }

    if (sale) {
        return (
            <Screen>
                <Notice tone="ok" icon="checkmark-circle" text={`Venda ${sale.orderCode} registrada: ${formatMoney(sale.totalCents)}`} />
                <Txt color="inkMuted">Mostre o QR para o torcedor fotografar ou valide a entrada direto no leitor.</Txt>
                {sale.tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                <Button title="Nova venda" variant="accent" onPress={() => setSale(null)} />
                <Button title="Voltar à portaria" variant="ghost" onPress={() => router.back()} />
            </Screen>
        );
    }

    return (
        <Screen>
            <SectionTitle>Ingressos</SectionTitle>
            {types.map(t => (
                <Card key={t.id}>
                    <Row style={{ justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                            <Txt weight="bold">{t.name}</Txt>
                            <Txt size={13} color="inkMuted">{formatMoney(t.priceCents)} · {t.available} disponíveis</Txt>
                        </View>
                        <Stepper value={qty[t.id] ?? 0} max={Math.min(50, t.available)} onChange={n => setQty(q => ({ ...q, [t.id]: n }))} />
                    </Row>
                </Card>
            ))}
            <SectionTitle>Comprador (opcional)</SectionTitle>
            <Input label="Nome" value={name} onChangeText={setName} />
            <Input label="CPF" value={cpf} onChangeText={v => setCpf(formatCpf(v))} keyboardType="number-pad" maxLength={14} />
            <SectionTitle>Pagamento</SectionTitle>
            <Row>
                {(['CASH', 'PIX', 'MANUAL'] as GateMethod[]).map(m => <Chip key={m} label={LABELS.paymentMethod[m]} selected={method === m} onPress={() => setMethod(m)} />)}
            </Row>
            {method === 'PIX' ? <Txt size={12} color="inkMuted">PIX recebido na chave do clube (confira o comprovante antes de confirmar).</Txt> : null}
            {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
            <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                    <Txt weight="bold">Total</Txt>
                    <Display size={24} color="brand">{formatMoney(total)}</Display>
                </Row>
                <Button title="Confirmar venda" variant="accent" icon="cash-outline" loading={busy} disabled={!lines.length}
                    onPress={() => Alert.alert('Confirmar venda', `${formatMoney(total)} em ${LABELS.paymentMethod[method]}. Confirmar?`, [
                        { text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => void submit() },
                    ])} />
            </Card>
        </Screen>
    );
}
