/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Cadastro de torcedor
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { formatCpf, isValidCpf, onlyDigits, type LoginResponse } from '@filt/shared';
import { apiPost } from '@/api';
import { useSession } from '@/session';
import { leaveAuth } from '@/lib/nav';
import { Button, Display, Input, Notice, Screen, Txt } from '@/components/ui';

export default function RegisterScreen() {
    const { signIn } = useSession();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setError(null);
        if (name.trim().length < 2) return setError('Informe seu nome completo');
        if (!email.includes('@')) return setError('E-mail inválido');
        if (cpf && !isValidCpf(cpf)) return setError('CPF inválido');
        if (password.length < 8) return setError('A senha deve ter ao menos 8 caracteres');
        if (password !== confirm) return setError('As senhas não conferem');
        setBusy(true);
        const r = await apiPost<LoginResponse>('auth/register', {
            name: name.trim(), email: email.trim(), password, client: 'app',
            cpf: cpf ? onlyDigits(cpf) : undefined, phone: onlyDigits(phone) || undefined,
        }, { silent: true });
        if (!r.success) { setBusy(false); return setError(r.msg); }
        await signIn(r.data);
        setBusy(false);
        if (r.data.mfaPending || r.data.mfaSetupRequired) router.replace('/two-factor');
        else leaveAuth();
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Screen>
                <Display size={26}>Vem pro Filtradores!</Display>
                <Txt color="inkMuted">Crie sua conta para comprar ingressos, produtos e virar sócio.</Txt>
                {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
                <Input label="Nome completo" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
                <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
                <Input label="CPF (necessário para comprar)" value={cpf} onChangeText={v => setCpf(formatCpf(v))} keyboardType="number-pad" maxLength={14} />
                <Input label="Celular (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
                <Input label="Senha (mín. 8 caracteres)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
                <Input label="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
                <Button title="Criar conta" onPress={submit} loading={busy} />
            </Screen>
        </KeyboardAvoidingView>
    );
}
