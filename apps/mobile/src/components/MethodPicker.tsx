/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Escolha do meio de pagamento (métodos disponíveis vêm de GET payment-methods)
 */
import { Pressable, View } from 'react-native';
import { LABELS, type PaymentMethod } from '@filt/shared';
import { METHOD_ICON } from '@/lib/payments';
import { Ionicons, Txt } from './ui';
import { colors, radius, spacing } from '@/theme';

const HINT: Partial<Record<PaymentMethod, string>> = {
    PIX: 'Aprovação na hora. Pague com o app do seu banco.',
    CARD: 'Você será levado à página segura do pagamento.',
    BOLETO: 'Compensação em até 3 dias úteis.',
    CHECKOUT: 'Pague na página segura do gateway (PIX, cartão...).',
};

export function MethodPicker({ methods, value, onChange }: { methods: PaymentMethod[], value: PaymentMethod | null, onChange: (m: PaymentMethod) => void }) {
    return (
        <View style={{ gap: spacing.sm }}>
            {methods.map(m => {
                const sel = m === value;
                return (
                    <Pressable
                        key={m}
                        onPress={() => onChange(m)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: sel }}
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md,
                            borderWidth: sel ? 2 : 1, borderColor: sel ? colors.brand : colors.line, backgroundColor: sel ? colors.brandSoft : colors.surface,
                        }}
                    >
                        <Ionicons name={METHOD_ICON[m]} size={24} color={colors.brand} />
                        <View style={{ flex: 1 }}>
                            <Txt weight="bold">{LABELS.paymentMethod[m]}</Txt>
                            {HINT[m] ? <Txt size={12} color="inkMuted">{HINT[m]}</Txt> : null}
                        </View>
                        <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? colors.brand : colors.inkFaint} />
                    </Pressable>
                );
            })}
        </View>
    );
}
