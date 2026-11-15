/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Resultado da validação em tela cheia: VERDE liberado / VERMELHO negado (legibilidade acima da marca)
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { LABELS, type CheckInResponse } from '@filt/shared';
import { Display, Ionicons, Txt } from './ui';
import { RemoteImage } from './RemoteImage';
import { colors, radius, spacing } from '@/theme';

export type CheckInOutcome = { ok: boolean, response: CheckInResponse | null, error?: string };

export function CheckInOverlay({ outcome, onClose }: { outcome: CheckInOutcome, onClose: () => void }) {
    const { ok, response: r } = outcome;
    const name = r?.ticket?.holderName ?? r?.member?.name ?? null;
    const detail = r?.member
        ? `Sócio ${r.member.planName}${r.member.memberNumber ? ` · nº ${r.member.memberNumber}` : ''}`
        : r?.ticket ? `${r.ticket.ticketTypeName ?? LABELS.ticketOrigin[r.ticket.origin]}` : null;
    const reason = r ? (ok ? null : (r.message || LABELS.checkInResult[r.result])) : (outcome.error ?? 'Sem conexão com o servidor');

    return (
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, s.wrap, { backgroundColor: ok ? colors.ok : colors.danger }]}>
            <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={110} color={colors.inkInverse} />
            <Display size={56} color="inkInverse" center>{ok ? 'Liberado' : r ? 'Negado' : 'Erro'}</Display>
            {r && !ok ? <Txt size={20} weight="bold" color="inkInverse" center>{LABELS.checkInResult[r.result]}</Txt> : null}
            {r?.member ? <RemoteImage url={r.member.photoUrl} auth style={s.photo} placeholderIcon="person" /> : null}
            {name ? <Txt size={24} weight="bold" color="inkInverse" center>{name}</Txt> : null}
            {detail ? <Txt size={17} color="inkInverse" center>{detail}</Txt> : null}
            {r?.member?.cpfMasked ? <Txt size={15} color="inkInverse" center>CPF {r.member.cpfMasked}</Txt> : null}
            {reason && reason !== LABELS.checkInResult[r?.result ?? 'OK'] ? <Txt size={16} color="inkInverse" center>{reason}</Txt> : null}
            <View style={{ marginTop: spacing.xl }}>
                <Txt size={13} color="inkInverse" center>{ok ? 'Toque para continuar' : 'Toque para ler o próximo'}</Txt>
            </View>
        </Pressable>
    );
}

const s = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm, zIndex: 10 },
    photo: { width: 150, height: 190, borderRadius: radius.md, borderWidth: 4, borderColor: colors.surface, marginVertical: spacing.sm },
});
