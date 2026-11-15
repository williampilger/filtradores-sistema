/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Segurança: situação do 2FA e troca de senha
 */
import { useState } from 'react';
import { router } from 'expo-router';
import { apiPost } from '@/api';
import { useSession } from '@/session';
import { Badge, Button, Card, Input, Notice, Row, Screen, SectionTitle, Txt } from '@/components/ui';

export default function SecurityScreen() {
    const { session } = useSession();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ ok: boolean, msg: string } | null>(null);

    async function changePassword() {
        setResult(null);
        if (next.length < 8) return setResult({ ok: false, msg: 'A nova senha deve ter ao menos 8 caracteres' });
        if (next !== confirm) return setResult({ ok: false, msg: 'As senhas não conferem' });
        setBusy(true);
        const r = await apiPost('me/password', { currentPassword: current, newPassword: next });
        setBusy(false);
        setResult({ ok: r.success, msg: r.msg || (r.success ? 'Senha alterada' : 'Não foi possível alterar a senha') });
        if (r.success) { setCurrent(''); setNext(''); setConfirm(''); }
    }

    const totp = !!session?.user.totpEnabled;
    return (
        <Screen>
            <SectionTitle>Verificação em duas etapas</SectionTitle>
            <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                    <Txt weight="semibold">Aplicativo autenticador</Txt>
                    <Badge label={totp ? 'Ativo' : 'Desativado'} tone={totp ? 'ok' : 'neutral'} />
                </Row>
                <Txt size={13} color="inkMuted">
                    {totp ? 'Ao entrar em um novo aparelho, pediremos o código do autenticador.' : 'Proteja sua conta exigindo um código do autenticador (Google Authenticator, Authy...) ao entrar.'}
                </Txt>
                {!totp ? <Button title="Ativar 2FA" icon="shield-checkmark-outline" onPress={() => router.push({ pathname: '/two-factor', params: { mode: 'setup' } })} /> : null}
            </Card>

            <SectionTitle>Trocar senha</SectionTitle>
            {result ? <Notice tone={result.ok ? 'ok' : 'danger'} text={result.msg} /> : null}
            <Input label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" textContentType="password" />
            <Input label="Nova senha (mín. 8 caracteres)" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
            <Input label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
            <Button title="Alterar senha" onPress={changePassword} loading={busy} disabled={!current || !next} />
        </Screen>
    );
}
