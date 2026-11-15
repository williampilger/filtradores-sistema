/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Layout raiz: fontes, sessão e pilha de navegação (abas + telas de detalhe por cima)
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { Oswald_600SemiBold } from '@expo-google-fonts/oswald/600SemiBold';
import { Oswald_700Bold } from '@expo-google-fonts/oswald/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '@/session';
import { DemoInsets } from '@/components/DemoBanner';
import { colors, fonts } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
void SystemUI.setBackgroundColorAsync(colors.app).catch(() => undefined);

function RootStack() {
    const [fontsLoaded, fontError] = useFonts({ Oswald_600SemiBold, Oswald_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
    // não espera a sessão: sem sinal no ginásio o app precisa abrir rápido (carteirinha em cache)
    const ready = fontsLoaded || !!fontError;

    useEffect(() => { if (ready) void SplashScreen.hideAsync().catch(() => undefined); }, [ready]);
    if (!ready) return null;

    return (
        <>
            <StatusBar style="light" />
            <DemoInsets>
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.header },
                    headerTintColor: colors.headerInk,
                    headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 },
                    headerBackButtonDisplayMode: 'minimal',
                    contentStyle: { backgroundColor: colors.app },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="event/[slug]" options={{ title: 'Jogo' }} />
                <Stack.Screen name="product/[slug]" options={{ title: 'Produto' }} />
                <Stack.Screen name="checkout" options={{ title: 'Pagamento' }} />
                <Stack.Screen name="order/[code]" options={{ title: 'Pedido' }} />
                <Stack.Screen name="plans" options={{ title: 'Seja sócio' }} />
                <Stack.Screen name="me/edit" options={{ title: 'Meus dados' }} />
                <Stack.Screen name="me/tickets" options={{ title: 'Meus ingressos' }} />
                <Stack.Screen name="me/orders" options={{ title: 'Meus pedidos' }} />
                <Stack.Screen name="me/membership" options={{ title: 'Sócio e cobranças' }} />
                <Stack.Screen name="me/waitlist" options={{ title: 'Lista de espera' }} />
                <Stack.Screen name="me/notifications" options={{ title: 'Notificações' }} />
                <Stack.Screen name="me/security" options={{ title: 'Segurança' }} />
                <Stack.Screen name="me/delete-account" options={{ title: 'Excluir conta' }} />
                <Stack.Screen name="gate/[eventId]/index" options={{ title: 'Portaria' }} />
                <Stack.Screen name="gate/[eventId]/scanner" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                <Stack.Screen name="gate/[eventId]/search" options={{ title: 'Busca manual' }} />
                <Stack.Screen name="gate/[eventId]/panel" options={{ title: 'Painel do evento' }} />
                <Stack.Screen name="gate/[eventId]/sell" options={{ title: 'Venda na portaria' }} />
            </Stack>
            </DemoInsets>
        </>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <SessionProvider>
                <RootStack />
            </SessionProvider>
        </SafeAreaProvider>
    );
}
