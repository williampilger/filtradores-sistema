/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Carteirinha de sócio com QR ROTATIVO (gerado no aparelho, funciona offline)
 *  - QR = buildMemberQr(cardKey, membershipId) -> muda a cada QR_WINDOW_SECONDS (30 s): print/foto não funciona
 *  - relógio de 1 s só roda com a tela em foco; a tela fica acesa enquanto a carteirinha está aberta
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { buildMemberQr, formatDate, LABELS, QR_WINDOW_SECONDS, qrWindow, type MemberCard } from '@filt/shared';
import { Badge, ClubMark, ClubStripes, Display, HeroBlue, Row, Txt } from './ui';
import { QrCode } from './QrCode';
import { RemoteImage } from './RemoteImage';
import { colors, radius, spacing } from '@/theme';

const KEEP_AWAKE_TAG = 'member-card';

export function MemberCardView({ card, showQr = true }: { card: MemberCard, showQr?: boolean }) {
    const focused = useIsFocused();
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!focused || !showQr) return;
        setNow(Date.now());
        const t = setInterval(() => setNow(Date.now()), 1000);
        void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
        return () => { clearInterval(t); void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined); };
    }, [focused, showQr]);

    const win = qrWindow(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula só quando a janela de 30 s muda
    const qr = useMemo(() => buildMemberQr(card.cardKey, card.membershipId, now), [card.cardKey, card.membershipId, win]);
    const remaining = QR_WINDOW_SECONDS - (Math.floor(now / 1000) % QR_WINDOW_SECONDS);

    return (
        <HeroBlue style={s.card}>
            <ClubStripes height={12} />
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                    <ClubMark size={52} />
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        <Txt size={11} color="sidebarInk" weight="semibold" style={{ letterSpacing: 1 }}>SÓCIO TORCEDOR</Txt>
                        <Display size={24} color="clubGold" numberOfLines={1}>{card.planName}</Display>
                    </View>
                </Row>
                <Row gap={spacing.md}>
                    <RemoteImage url={card.photoUrl} auth style={s.photo} placeholderIcon="person" />
                    <View style={{ flex: 1, gap: 2 }}>
                        <Txt color="brandInk" size={18} weight="bold" numberOfLines={2}>{card.name}</Txt>
                        <Txt color="sidebarInk" size={13}>Nº {card.memberNumber ?? '-'}</Txt>
                        <Txt color="sidebarInk" size={13}>{card.validUntil ? `Válida até ${formatDate(card.validUntil)}` : 'Validade indeterminada'}</Txt>
                        {card.status !== 'ACTIVE' ? <Badge label={LABELS.membershipStatus[card.status]} tone="danger" style={{ marginTop: 4 }} /> : null}
                    </View>
                </Row>
                {showQr ? (
                    <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                        <QrCode value={qr} size={210} />
                        <View style={s.barTrack}>
                            <View style={[s.barFill, { width: `${(remaining / QR_WINDOW_SECONDS) * 100}%` }]} />
                        </View>
                        <Txt size={12} color="sidebarInk" center>O código muda em {remaining}s · print não vale!</Txt>
                    </View>
                ) : null}
            </View>
        </HeroBlue>
    );
}

const s = StyleSheet.create({
    card: { borderRadius: radius.lg },
    photo: { width: 76, height: 96, borderRadius: radius.md, borderWidth: 2, borderColor: colors.surface },
    barTrack: { width: 238, height: 6, borderRadius: 3, backgroundColor: colors.brandDeep, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: colors.clubGold },
});
