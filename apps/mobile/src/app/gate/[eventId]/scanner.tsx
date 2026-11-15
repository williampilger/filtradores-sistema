/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Leitor de QR da portaria (ingressos FT1.* e carteirinhas rotativas FM1.*)
 *  - ignora o mesmo código enquanto ele continuar na frente da câmera (janela de 3 s)
 *  - resultado em tela cheia + vibração; liberado some sozinho em 2,5 s
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CheckInResponse, EventCounters } from '@filt/shared';
import { apiPost } from '@/api';
import { getDeviceId } from '@/storage';
import { DEMO_MODE } from '@/config';
import { DemoBanner } from '@/components/DemoBanner';
import { CheckInOverlay, type CheckInOutcome } from '@/components/CheckInOverlay';
import { Button, Display, Ionicons, Loading, Txt } from '@/components/ui';
import { alpha, colors, radius, spacing } from '@/theme';

const SAME_CODE_MS = 3000;
const OK_DISMISS_MS = 2500;

export default function ScannerScreen() {
    const { eventId, title } = useLocalSearchParams<{ eventId: string, title?: string }>();
    const [permission, requestPermission] = useCameraPermissions();
    const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
    const [busy, setBusy] = useState(false);
    const [torch, setTorch] = useState(false);
    const [counters, setCounters] = useState<EventCounters | null>(null);
    const deviceId = useRef<string | undefined>(undefined);
    const last = useRef<{ code: string, at: number } | null>(null);
    const lock = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // insets do contexto (topo = 0 quando a faixa de demonstração do layout raiz já ocupa a área segura)
    const insets = useSafeAreaInsets();
    // iOS: o modal em tela cheia cobre o layout raiz -> desenha a própria faixa de demonstração
    const ownBanner = DEMO_MODE && Platform.OS === 'ios';
    const topPad = ownBanner ? 0 : insets.top;

    useEffect(() => { void getDeviceId().then(id => { deviceId.current = id; }); }, []);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    const dismiss = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setOutcome(null);
    }, []);

    const onScan = useCallback(async ({ data }: BarcodeScanningResult) => {
        if (lock.current) return;
        const now = Date.now();
        if (last.current && last.current.code === data && now - last.current.at < SAME_CODE_MS) {
            last.current.at = now; // continua na frente da câmera: segue ignorando
            return;
        }
        last.current = { code: data, at: now };
        lock.current = true;
        setBusy(true);
        const r = await apiPost<CheckInResponse>(`staff/events/${eventId}/checkin`, { qr: data, deviceId: deviceId.current }, { timeoutMs: 10_000 });
        setBusy(false);
        const res: CheckInOutcome = r.success ? { ok: r.data.result === 'OK', response: r.data } : { ok: false, response: null, error: r.msg };
        if (r.success) setCounters(r.data.counters);
        setOutcome(res);
        void Haptics.notificationAsync(res.ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        if (res.ok) timer.current = setTimeout(() => setOutcome(null), OK_DISMISS_MS);
        lock.current = false;
    }, [eventId]);

    if (!permission) return <Loading />;
    if (!permission.granted) {
        return (
            <View style={[s.permission, { paddingTop: topPad + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
                <Ionicons name="camera-outline" size={56} color={colors.brandInk} />
                <Display size={24} color="brandInk" center>Permita o uso da câmera</Display>
                <Txt color="sidebarInk" center>A câmera é usada para ler o QR Code dos ingressos e das carteirinhas.</Txt>
                {permission.canAskAgain
                    ? <Button title="Permitir câmera" variant="accent" onPress={requestPermission} />
                    : <Button title="Abrir configurações" variant="accent" onPress={() => void Linking.openSettings()} />}
                <Button title="Voltar" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.brandDeep }}>
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={outcome ? undefined : onScan}
            />
            <View style={[StyleSheet.absoluteFill, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
                {ownBanner ? <DemoBanner topInset={initialWindowMetrics?.insets.top ?? 0} /> : null}
                <View style={[s.top, { paddingTop: topPad + spacing.md }]}>
                    <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} accessibilityLabel="Fechar">
                        <Ionicons name="close" size={26} color={colors.brandInk} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Txt color="brandInk" weight="bold" numberOfLines={1}>{title ?? 'Portaria'}</Txt>
                        {counters ? <Txt color="sidebarInk" size={12}>Entraram {counters.ticketsUsed} · Sócios {counters.memberEntries} · Vendidos {counters.ticketsSold}</Txt> : null}
                    </View>
                    <Pressable onPress={() => setTorch(t => !t)} hitSlop={12} style={s.iconBtn} accessibilityLabel="Lanterna">
                        <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color={torch ? colors.clubGold : colors.brandInk} />
                    </Pressable>
                </View>
                <View style={s.center} pointerEvents="none">
                    <View style={s.frame} />
                    <Txt color="brandInk" weight="semibold" center style={s.hint}>{busy ? 'Validando...' : 'Aponte para o QR Code do ingresso ou da carteirinha'}</Txt>
                </View>
            </View>
            {outcome ? <CheckInOverlay outcome={outcome} onClose={dismiss} /> : null}
        </View>
    );
}

const s = StyleSheet.create({
    permission: { flex: 1, backgroundColor: colors.brandDeep, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: alpha('brandDeep', 0.75) },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    frame: { width: 250, height: 250, borderRadius: radius.lg, borderWidth: 4, borderColor: colors.clubGold },
    hint: { backgroundColor: alpha('brandDeep', 0.75), paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, overflow: 'hidden' },
});
