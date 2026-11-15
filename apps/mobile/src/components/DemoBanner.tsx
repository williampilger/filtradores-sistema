/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Faixa "AMBIENTE DE DEMONSTRAÇÃO" (EXPO_PUBLIC_DEMO_MODE=true)
 *
 * Fica no layout raiz, acima da pilha de navegação, ocupando a área segura do topo; os cabeçalhos abaixo
 * recebem inset superior 0 (ver DemoInsets). No iOS, os modais nativos (login, leitor de QR) cobrem o layout
 * raiz, então eles também desenham a faixa.
 */
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_MODE } from '@/config';
import { colors, displayText } from '@/theme';

export function DemoBanner({ topInset = 0 }: { topInset?: number }) {
    if (!DEMO_MODE) return null;
    return (
        <View style={{ backgroundColor: colors.clubGold, paddingTop: topInset, alignItems: 'center' }} accessibilityRole="header">
            <Text style={[displayText, { color: colors.brandDeep, fontSize: 11, lineHeight: 14, paddingVertical: 3 }]} numberOfLines={1}>
                Ambiente de demonstração · dados fictícios
            </Text>
        </View>
    );
}

/** Faixa no topo + inset superior zerado para o conteúdo (evita espaço duplicado nos cabeçalhos) */
export function DemoInsets({ children }: { children: ReactNode }) {
    const insets = useSafeAreaInsets();
    if (!DEMO_MODE) return <>{children}</>;
    return (
        <View style={{ flex: 1 }}>
            <DemoBanner topInset={insets.top} />
            <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
                <View style={{ flex: 1 }}>{children}</View>
            </SafeAreaInsetsContext.Provider>
        </View>
    );
}
