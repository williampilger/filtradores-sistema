/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Componentes básicos de interface (todas as cores vêm de src/theme.ts)
 */
import { type ComponentProps, type ReactNode, useId } from 'react';
import {
    ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
    type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Svg, { Defs, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, displayText, fonts, radius, spacing, type ColorToken } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export { Ionicons };

// ─── Texto ──────────────────────────────────────────────────────────────────

type TxtProps = TextProps & { color?: ColorToken, size?: number, weight?: 'regular' | 'medium' | 'semibold' | 'bold', center?: boolean };

export function Txt({ color = 'ink', size = 15, weight = 'regular', center, style, ...rest }: TxtProps) {
    return <Text {...rest} style={[{ color: colors[color], fontSize: size, fontFamily: fonts[weight], textAlign: center ? 'center' : undefined }, style]} />;
}

/** Título no estilo das artes do clube (Oswald, itálico, caixa alta) */
export function Display({ color = 'ink', size = 26, center, style, ...rest }: Omit<TxtProps, 'weight'>) {
    return <Text {...rest} style={[displayText, { color: colors[color], fontSize: size, lineHeight: Math.round(size * 1.18), textAlign: center ? 'center' : undefined }, style]} />;
}

export function SectionTitle({ children, right, color = 'ink' }: { children: ReactNode, right?: ReactNode, color?: ColorToken }) {
    return (
        <View style={s.sectionTitle}>
            <Display size={20} color={color}>{children}</Display>
            {right}
        </View>
    );
}

// ─── Layout ─────────────────────────────────────────────────────────────────

type ScreenProps = {
    children: ReactNode;
    scroll?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    padded?: boolean;
    edges?: Edge[];
    background?: ColorToken;
    contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, refreshing, onRefresh, padded = true, edges = ['left', 'right'], background = 'app', contentStyle }: ScreenProps) {
    const pad = padded ? { padding: spacing.lg, gap: spacing.md } : null;
    return (
        <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors[background] }}>
            {scroll ? (
                <ScrollView
                    contentContainerStyle={[pad, { paddingBottom: spacing.xxl * 2 }, contentStyle]}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined}
                >
                    {children}
                </ScrollView>
            ) : <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>}
        </SafeAreaView>
    );
}

export function Card({ children, style, onPress }: { children: ReactNode, style?: StyleProp<ViewStyle>, onPress?: () => void }) {
    if (onPress) {
        return <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { backgroundColor: colors.surfaceHover }, style]}>{children}</Pressable>;
    }
    return <View style={[s.card, style]}>{children}</View>;
}

export const Row = ({ children, gap = spacing.sm, style }: { children: ReactNode, gap?: number, style?: StyleProp<ViewStyle> }) => (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: spacing.sm }} />;

// ─── Botões ─────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'accent' | 'red' | 'outline' | 'danger' | 'ghost' | 'light';

const BTN: Record<ButtonVariant, { bg: ColorToken, fg: ColorToken, border: ColorToken }> = {
    primary: { bg: 'brand', fg: 'brandInk', border: 'brandStrong' },
    accent: { bg: 'clubGold', fg: 'brandDeep', border: 'clubGold' },
    red: { bg: 'clubRed', fg: 'inkInverse', border: 'clubRed' },
    outline: { bg: 'surface', fg: 'brand', border: 'lineStrong' },
    danger: { bg: 'surface', fg: 'danger', border: 'danger' },
    ghost: { bg: 'transparent', fg: 'brand', border: 'transparent' },
    light: { bg: 'surface', fg: 'brandDeep', border: 'surface' },
};

type ButtonProps = {
    title: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    icon?: IconName;
    loading?: boolean;
    disabled?: boolean;
    small?: boolean;
    style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style }: ButtonProps) {
    const v = BTN[variant];
    const off = disabled || loading;
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            disabled={off}
            style={({ pressed }) => [
                s.btn, small && s.btnSmall,
                { backgroundColor: colors[v.bg], borderColor: colors[v.border] },
                pressed && { opacity: 0.85 }, off && { opacity: 0.55 }, style,
            ]}
        >
            {loading ? <ActivityIndicator color={colors[v.fg]} /> : (
                <>
                    {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={colors[v.fg]} /> : null}
                    <Text style={{ color: colors[v.fg], fontFamily: fonts.bold, fontSize: small ? 13 : 15 }}>{title}</Text>
                </>
            )}
        </Pressable>
    );
}

// ─── Formulários ────────────────────────────────────────────────────────────

export function Input({ label, error, style, ...rest }: TextInputProps & { label?: string, error?: string | null }) {
    const id = useId();
    return (
        <View style={{ gap: 4 }}>
            {label ? <Txt nativeID={id} size={13} color="inkMuted" weight="medium">{label}</Txt> : null}
            <TextInput
                accessibilityLabelledBy={label ? id : undefined}
                placeholderTextColor={colors.inkFaint}
                {...rest}
                style={[s.input, error ? { borderColor: colors.danger } : null, style]}
            />
            {error ? <Txt size={12} color="danger">{error}</Txt> : null}
        </View>
    );
}

export function Stepper({ value, onChange, min = 0, max = 99, disabled }: { value: number, onChange: (n: number) => void, min?: number, max?: number, disabled?: boolean }) {
    const btn = (icon: IconName, next: number, enabled: boolean) => (
        <Pressable
            accessibilityRole="button"
            disabled={!enabled || disabled}
            onPress={() => onChange(next)}
            style={[s.stepBtn, (!enabled || disabled) && { opacity: 0.35 }]}
            hitSlop={6}
        >
            <Ionicons name={icon} size={18} color={colors.brandInk} />
        </Pressable>
    );
    return (
        <Row gap={10}>
            {btn('remove', value - 1, value > min)}
            <Txt size={17} weight="bold" style={{ minWidth: 24, textAlign: 'center' }}>{value}</Txt>
            {btn('add', value + 1, value < max)}
        </Row>
    );
}

export function Chip({ label, selected, onPress, disabled }: { label: string, selected?: boolean, onPress?: () => void, disabled?: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={[s.chip, selected && { backgroundColor: colors.brand, borderColor: colors.brand }, disabled && { opacity: 0.45 }]}
        >
            <Txt size={14} weight="semibold" color={selected ? 'brandInk' : 'ink'}>{label}</Txt>
        </Pressable>
    );
}

// ─── Estados ────────────────────────────────────────────────────────────────

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'brand' | 'neutral' | 'gold';
const TONE: Record<Tone, { bg: ColorToken, fg: ColorToken }> = {
    ok: { bg: 'okSoft', fg: 'ok' },
    warn: { bg: 'warnSoft', fg: 'warn' },
    danger: { bg: 'dangerSoft', fg: 'danger' },
    info: { bg: 'infoSoft', fg: 'info' },
    brand: { bg: 'brandSoft', fg: 'brand' },
    neutral: { bg: 'surfaceAlt', fg: 'inkMuted' },
    gold: { bg: 'clubGold', fg: 'brandDeep' },
};

export function Badge({ label, tone = 'neutral', style }: { label: string, tone?: Tone, style?: StyleProp<ViewStyle> }) {
    const t = TONE[tone];
    return (
        <View style={[s.badge, { backgroundColor: colors[t.bg] }, style]}>
            <Txt size={11} weight="bold" color={t.fg} style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Txt>
        </View>
    );
}

export function Notice({ text, tone = 'info', icon }: { text: string, tone?: Tone, icon?: IconName }) {
    const t = TONE[tone];
    return (
        <View style={[s.notice, { backgroundColor: colors[t.bg] }]}>
            {icon ? <Ionicons name={icon} size={18} color={colors[t.fg]} /> : null}
            <Txt size={14} color={t.fg === 'inkMuted' ? 'ink' : t.fg} weight="medium" style={{ flex: 1 }}>{text}</Txt>
        </View>
    );
}

export function Loading({ label }: { label?: string }) {
    return (
        <View style={s.center}>
            <ActivityIndicator size="large" color={colors.brand} />
            {label ? <Txt color="inkMuted">{label}</Txt> : null}
        </View>
    );
}

export function ErrorState({ message, onRetry }: { message: string, onRetry?: () => void }) {
    return (
        <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.inkFaint} />
            <Txt center color="inkMuted">{message}</Txt>
            {onRetry ? <Button title="Tentar novamente" variant="outline" small onPress={onRetry} /> : null}
        </View>
    );
}

export function Empty({ icon = 'albums-outline', text, children }: { icon?: IconName, text: string, children?: ReactNode }) {
    return (
        <View style={s.center}>
            <Ionicons name={icon} size={40} color={colors.inkFaint} />
            <Txt center color="inkMuted">{text}</Txt>
            {children}
        </View>
    );
}

// ─── Itens de menu ──────────────────────────────────────────────────────────

export function MenuItem({ icon, label, detail, onPress, tone = 'ink', badge }: { icon: IconName, label: string, detail?: string, onPress: () => void, tone?: ColorToken, badge?: number }) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [s.menuItem, pressed && { backgroundColor: colors.surfaceHover }]}>
            <Ionicons name={icon} size={21} color={tone === 'ink' ? colors.brand : colors[tone]} />
            <View style={{ flex: 1 }}>
                <Txt weight="semibold" color={tone}>{label}</Txt>
                {detail ? <Txt size={12} color="inkMuted">{detail}</Txt> : null}
            </View>
            {badge ? <View style={s.dot}><Txt size={11} weight="bold" color="inkInverse">{badge > 99 ? '99+' : badge}</Txt></View> : null}
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </Pressable>
    );
}

// ─── Elementos da marca ─────────────────────────────────────────────────────

/** Fundo azul radial (royal -> profundo) - `.hero-blue` do web */
export function HeroBlue({ children, style }: { children: ReactNode, style?: StyleProp<ViewStyle> }) {
    return (
        <View style={[{ backgroundColor: colors.brandStrong, overflow: 'hidden' }, style]}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
                <Defs>
                    <RadialGradient id="hero" cx="85%" cy="0%" rx="120%" ry="140%" fx="85%" fy="0%">
                        <Stop offset="0" stopColor={colors.brand} />
                        <Stop offset="0.55" stopColor={colors.brandStrong} />
                        <Stop offset="1" stopColor={colors.brandDeep} />
                    </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#hero)" />
            </Svg>
            {children}
        </View>
    );
}

/** Faixa de listras diagonais azul/branco/vermelho (uniforme) - `.club-stripes` do web */
export function ClubStripes({ height = 10 }: { height?: number }) {
    return (
        <Svg width="100%" height={height} viewBox="0 0 100 10" preserveAspectRatio="none">
            <Rect x="0" y="0" width="100" height="10" fill={colors.brand} />
            <Polygon points="62,10 66,10 70,0 66,0" fill={colors.surface} />
            <Polygon points="66,10 72,10 76,0 70,0" fill={colors.clubRed} />
            <Polygon points="72,10 75,10 79,0 76,0" fill={colors.surface} />
            <Polygon points="75,10 100,10 100,0 79,0" fill={colors.brandStrong} />
        </Svg>
    );
}

/**
 * Marca do clube. Enquanto o escudo OFICIAL não for enviado, mostra a sigla "ACEF" no estilo de título
 * dentro de um círculo branco (docs/identidade-visual.md). TODO(escudo): trocar pelo arquivo oficial em assets/.
 */
export function ClubMark({ size = 56 }: { size?: number }) {
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Display size={size * 0.3} color="brandDeep">ACEF</Display>
        </View>
    );
}

export const textStyles = StyleSheet.create({
    mono: { fontFamily: fonts.semibold, letterSpacing: 1 } as TextStyle,
});

const s = StyleSheet.create({
    sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
    btn: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    btnSmall: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.sm },
    input: {
        minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md,
        backgroundColor: colors.surface, color: colors.ink, fontFamily: fonts.regular, fontSize: 16,
    },
    stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, minHeight: 220 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14, paddingHorizontal: spacing.lg, backgroundColor: colors.surface },
    dot: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.clubRed, alignItems: 'center', justifyContent: 'center' },
});
