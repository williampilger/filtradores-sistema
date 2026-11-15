/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Carteirinha
 *  - sócio ATIVO: carteirinha com QR rotativo (cache no SecureStore -> funciona OFFLINE no ginásio)
 *  - PENDENTE/INADIMPLENTE: situação + pagar a cobrança em aberto
 *  - não sócio: planos com "Quero ser sócio"
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { formatDate, formatMoney, LABELS, type MemberCard } from '@filt/shared';
import { apiGet } from '@/api';
import { useSession } from '@/session';
import { getCachedCard, setCachedCard } from '@/storage';
import { MEMBERSHIP_IN_APP, payCharge } from '@/lib/membership';
import { MemberCardView } from '@/components/MemberCardView';
import { PlansList } from '@/components/PlansList';
import { Button, Card, ClubMark, Display, HeroBlue, Loading, Notice, Screen, SectionTitle, Txt } from '@/components/ui';
import { spacing } from '@/theme';

export default function CardScreen() {
    const { session, hasToken, status, refresh: refreshSession } = useSession();
    const [card, setCard] = useState<MemberCard | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [offline, setOffline] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [paying, setPaying] = useState(false);

    // mostra o cache na hora (sem sinal no ginásio)
    useEffect(() => { void getCachedCard().then(c => { if (c) setCard(prev => prev ?? c); }); }, []);

    const load = useCallback(async () => {
        if (!hasToken) { setCard(null); setLoaded(true); return; }
        const r = await apiGet<MemberCard>('me/card', { silent: true, timeoutMs: 8000 });
        if (r.success) { setCard(r.data); setOffline(false); await setCachedCard(r.data); }
        else if (r.status === 0) setOffline(true);
        else if (r.status === 404 || r.status === 401) { setCard(null); setOffline(false); await setCachedCard(null); }
        setLoaded(true);
    }, [hasToken]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    async function onRefresh() {
        setRefreshing(true);
        await Promise.all([load(), refreshSession()]);
        setRefreshing(false);
    }

    async function pay(chargeId: number) {
        setPaying(true);
        const err = await payCharge(chargeId);
        setPaying(false);
        if (err) Alert.alert('Não foi possível gerar o pagamento', err);
    }

    if (!loaded && !card) return <Loading />;

    // ─── sem login ───
    if (!hasToken) {
        return (
            <Screen>
                <HeroBlue style={{ borderRadius: 16, padding: spacing.xl, alignItems: 'center', gap: spacing.md }}>
                    <ClubMark size={64} />
                    <Display size={26} color="brandInk" center>Sua carteirinha no celular</Display>
                    <Txt color="sidebarInk" center>Entre na sua conta para ver a carteirinha de sócio e entrar nos jogos com o QR Code.</Txt>
                    <Button title="Entrar" variant="accent" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
                </HeroBlue>
                <SectionTitle>Seja sócio</SectionTitle>
                <PlansList />
            </Screen>
        );
    }

    const m = session?.membership ?? null;
    const charge = m?.openCharge ?? null;

    const payBox = charge ? (
        <Card>
            <Txt weight="semibold">Cobrança em aberto: {formatMoney(charge.amountCents)}</Txt>
            <Txt size={13} color="inkMuted">Vencimento: {formatDate(charge.dueDate)}</Txt>
            <Button title={MEMBERSHIP_IN_APP ? 'Pagar agora' : 'Pagar no site'} icon={MEMBERSHIP_IN_APP ? 'card-outline' : 'open-outline'} variant="accent" loading={paying} onPress={() => pay(charge.id)} />
        </Card>
    ) : null;

    // ─── sócio ativo ───
    if (card && card.status === 'ACTIVE') {
        return (
            <Screen onRefresh={onRefresh} refreshing={refreshing}>
                {offline || status === 'offline' ? <Notice tone="warn" icon="cloud-offline-outline" text="Sem conexão: carteirinha salva no aparelho. O QR Code continua válido." /> : null}
                <MemberCardView card={card} />
                <Txt size={13} color="inkMuted" center>Apresente o QR Code na portaria do Ginásio do Morangão. Aumente o brilho da tela para facilitar a leitura.</Txt>
                {payBox}
            </Screen>
        );
    }

    // ─── inadimplente / cancelado / expirado (tem carteirinha, mas sem QR) ───
    if (card) {
        const overdue = card.status === 'OVERDUE';
        return (
            <Screen onRefresh={onRefresh} refreshing={refreshing}>
                <MemberCardView card={card} showQr={false} />
                <Notice tone={overdue ? 'warn' : 'danger'} icon="alert-circle-outline"
                    text={overdue ? 'Seu plano está com pagamento em atraso. Regularize para voltar a usar a carteirinha.' : `Seu plano está ${LABELS.membershipStatus[card.status].toLowerCase()}. Escolha um plano para voltar a ser sócio.`} />
                {payBox}
                <Button title="Ver cobranças" variant="outline" onPress={() => router.push('/me/membership')} />
                {!overdue ? <><SectionTitle>Planos</SectionTitle><PlansList /></> : null}
            </Screen>
        );
    }

    // ─── adesão aguardando pagamento ───
    if (m && m.status === 'PENDING') {
        return (
            <Screen onRefresh={onRefresh} refreshing={refreshing}>
                <Display size={24}>Quase lá!</Display>
                <Notice tone="warn" icon="time-outline" text={`Sua adesão ao plano ${m.plan.name} está aguardando pagamento. Assim que for confirmado, a carteirinha aparece aqui.`} />
                {payBox}
                <Button title="Ver cobranças" variant="outline" onPress={() => router.push('/me/membership')} />
            </Screen>
        );
    }

    // ─── não é sócio ───
    return (
        <Screen onRefresh={onRefresh} refreshing={refreshing}>
            {offline ? <Notice tone="warn" icon="cloud-offline-outline" text="Sem conexão com o servidor." /> : null}
            <HeroBlue style={{ borderRadius: 16, padding: spacing.xl, gap: spacing.sm }}>
                <Display size={30} color="brandInk">Seja sócio</Display>
                <Txt color="sidebarInk">Entre nos jogos com a carteirinha no celular, ganhe descontos e acesse conteúdo exclusivo.</Txt>
            </HeroBlue>
            <View style={{ gap: spacing.md }}>
                <PlansList />
            </View>
        </Screen>
    );
}
