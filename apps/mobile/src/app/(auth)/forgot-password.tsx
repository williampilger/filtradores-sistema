/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Recuperar senha (o link de redefinição chega por e-mail e abre no site)
 */
import { useState } from 'react';
import { router } from 'expo-router';
import { apiPost } from '@/api';
import { Button, Display, Input, Notice, Screen, Txt } from '@/components/ui';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ ok: boolean, msg: string } | null>(null);

    async function submit() {
        if (!email.includes('@')) { setResult({ ok: false, msg: 'Informe um e-mail válido' }); return; }
        setBusy(true);
        const r = await apiPost('auth/password/forgot', { email: email.trim() }, { silent: true });
        setBusy(false);
        setResult({ ok: r.success, msg: r.msg || (r.success ? 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.' : 'Não foi possível enviar') });
    }

    return (
        <Screen>
            <Display size={24}>Esqueceu a senha?</Display>
            <Txt color="inkMuted">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</Txt>
            {result ? <Notice tone={result.ok ? 'ok' : 'danger'} text={result.msg} /> : null}
            <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Button title="Enviar link" onPress={submit} loading={busy} />
            <Button title="Voltar ao login" variant="ghost" onPress={() => router.back()} />
        </Screen>
    );
}
