/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Excluir conta (exigência da App Store / Google Play)
 */
import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { apiDelete } from '@/api';
import { useSession } from '@/session';
import { setCachedCard, setToken } from '@/storage';
import { Button, Display, Input, Notice, Screen, Txt } from '@/components/ui';

export default function DeleteAccountScreen() {
    const { refresh } = useSession();
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function confirm() {
        setError(null);
        if (!password) { setError('Digite sua senha para confirmar'); return; }
        Alert.alert('Excluir conta', 'Esta ação não pode ser desfeita. Deseja realmente excluir sua conta?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: () => void run() },
        ]);
    }

    async function run() {
        setBusy(true);
        const r = await apiDelete('me/account', { password });
        setBusy(false);
        if (!r.success) { setError(r.msg); return; }
        await setToken(null);
        await setCachedCard(null);
        await refresh();
        Alert.alert('Conta excluída', r.msg || 'Sua conta foi excluída.');
        router.replace('/');
    }

    return (
        <Screen>
            <Display size={24} color="danger">Excluir minha conta</Display>
            <Notice tone="danger" icon="warning-outline" text="Seus dados pessoais serão removidos e você perderá o acesso a ingressos, pedidos e à carteirinha de sócio." />
            <Txt color="inkMuted">Se você é sócio, o plano será cancelado. Os registros de pedidos e pagamentos são mantidos de forma anônima, como exige a lei.</Txt>
            {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
            <Input label="Confirme sua senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
            <Button title="Excluir conta definitivamente" variant="danger" icon="trash-outline" loading={busy} onPress={confirm} />
        </Screen>
    );
}
