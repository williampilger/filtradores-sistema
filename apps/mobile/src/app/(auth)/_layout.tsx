/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Pilha de autenticação (login, cadastro, recuperar senha, 2FA) - aberta como modal
 */
import { Stack } from 'expo-router';
import { colors, fonts } from '@/theme';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.header },
                headerTintColor: colors.headerInk,
                headerTitleStyle: { fontFamily: fonts.semibold },
                headerBackButtonDisplayMode: 'minimal',
                contentStyle: { backgroundColor: colors.app },
            }}
        >
            <Stack.Screen name="login" options={{ title: 'Entrar' }} />
            <Stack.Screen name="register" options={{ title: 'Criar conta' }} />
            <Stack.Screen name="forgot-password" options={{ title: 'Recuperar senha' }} />
            <Stack.Screen name="two-factor" options={{ title: 'Verificação em duas etapas', gestureEnabled: false }} />
        </Stack>
    );
}
