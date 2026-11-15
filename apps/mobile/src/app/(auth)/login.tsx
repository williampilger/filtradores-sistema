/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Tela de login
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Link, router } from 'expo-router';
import type { LoginResponse } from '@filt/shared';
import { apiPost } from '@/api';
import { useSession } from '@/session';
import { leaveAuth } from '@/lib/nav';
import { Button, ClubMark, Display, HeroBlue, Input, Notice, Screen, Txt } from '@/components/ui';
import { spacing } from '@/theme';

export default function LoginScreen() {
    const { signIn } = useSession();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setError(null);
        if (!email.trim() || !password) { setError('Informe o e-mail e a senha'); return; }
        setBusy(true);
        const r = await apiPost<LoginResponse>('auth/login', { email: email.trim(), password, client: 'app' }, { silent: true });
        if (!r.success) { setBusy(false); setError(r.msg); return; }
        await signIn(r.data);
        setBusy(false);
        if (r.data.mfaPending || r.data.mfaSetupRequired) router.replace('/two-factor');
        else leaveAuth();
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Screen padded={false}>
                <HeroBlue style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.md }}>
                    <ClubMark size={72} />
                    <Display color="brandInk" size={30} center>Seu lugar no Filtradores começa aqui!</Display>
                </HeroBlue>
                <View style={{ padding: spacing.lg, gap: spacing.md }}>
                    {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
                    <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
                    <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
                    <Button title="Entrar" onPress={submit} loading={busy} />
                    <Link href="/forgot-password" asChild><Button title="Esqueci minha senha" variant="ghost" /></Link>
                    <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg }}>
                        <Txt color="inkMuted">Ainda não tem conta?</Txt>
                        <Link href="/register" asChild><Button title="Criar conta" variant="outline" style={{ alignSelf: 'stretch' }} /></Link>
                    </View>
                </View>
            </Screen>
        </KeyboardAvoidingView>
    );
}
