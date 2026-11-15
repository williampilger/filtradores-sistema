/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Verificação em duas etapas (2FA / TOTP)
 *  - verify: sessão com 2FA pendente -> código de 6 dígitos do autenticador OU código de recuperação
 *  - setup : cadastro do autenticador (obrigatório para master / papéis com 2FA; opcional para os demais)
 *            mostra o QR + chave e, ao confirmar, os códigos de recuperação UMA única vez
 */
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { apiPost } from '@/api';
import { useSession } from '@/session';
import { leaveAuth } from '@/lib/nav';
import { Button, Card, Display, Input, Loading, Notice, Row, Screen, Txt, textStyles } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type SetupData = { secret: string, otpauthUrl: string, qrDataUrl: string };

export default function TwoFactorScreen() {
    const { session, refresh, signOut } = useSession();
    const params = useLocalSearchParams<{ mode?: string }>();
    const mode: 'verify' | 'setup' = session?.mfaPending ? 'verify' : (session?.mfaSetupRequired || params.mode === 'setup') ? 'setup' : 'verify';

    async function abort() { await signOut(); leaveAuth(); }

    if (!session) return <Loading />;
    return mode === 'verify'
        ? <Verify onDone={async () => { const s = await refresh(); if (!s?.mfaSetupRequired) leaveAuth(); }} onAbort={abort} />
        : <Setup required={session.mfaSetupRequired} onDone={async () => { await refresh(); leaveAuth(); }} onAbort={abort} />;
}

function Verify({ onDone, onAbort }: { onDone: () => Promise<void>, onAbort: () => void }) {
    const [code, setCode] = useState('');
    const [recovery, setRecovery] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setError(null);
        const clean = code.trim();
        if (!recovery && !/^\d{6}$/.test(clean)) { setError('Digite os 6 dígitos do aplicativo autenticador'); return; }
        setBusy(true);
        const r = await apiPost('auth/mfa/verify', { code: clean }, { silent: true });
        setBusy(false);
        if (!r.success) { setError(r.msg); return; }
        await onDone();
    }

    return (
        <Screen>
            <Display size={24}>Confirme que é você</Display>
            <Txt color="inkMuted">
                {recovery ? 'Digite um dos seus códigos de recuperação (cada código só pode ser usado uma vez).' : 'Abra o aplicativo autenticador (Google Authenticator, Authy...) e digite o código de 6 dígitos.'}
            </Txt>
            {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
            <Input
                label={recovery ? 'Código de recuperação' : 'Código de 6 dígitos'}
                value={code}
                onChangeText={setCode}
                keyboardType={recovery ? 'default' : 'number-pad'}
                autoCapitalize="none"
                maxLength={recovery ? 20 : 6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                style={{ fontSize: 24, letterSpacing: 6, textAlign: 'center' }}
                onSubmitEditing={submit}
            />
            <Button title="Confirmar" onPress={submit} loading={busy} />
            <Button title={recovery ? 'Usar o código do autenticador' : 'Usar um código de recuperação'} variant="ghost" onPress={() => { setRecovery(!recovery); setCode(''); }} />
            <Button title="Sair desta conta" variant="ghost" onPress={onAbort} />
        </Screen>
    );
}

function Setup({ required, onDone, onAbort }: { required: boolean, onDone: () => Promise<void>, onAbort: () => void }) {
    const [data, setData] = useState<SetupData | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [codes, setCodes] = useState<string[] | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    async function start() {
        setLoadError(null);
        const r = await apiPost<SetupData & { msg?: string }>('auth/mfa/setup', {}, { silent: true });
        if (!r.success) { setLoadError(r.msg); return; }
        if (!r.data.secret) { setLoadError(r.msg || 'Não foi possível iniciar o cadastro'); return; }
        setData(r.data);
    }
    useEffect(() => { void start(); }, []);

    async function confirm() {
        setError(null);
        if (!/^\d{6}$/.test(code.trim())) { setError('Digite os 6 dígitos exibidos no autenticador'); return; }
        setBusy(true);
        const r = await apiPost<{ recoveryCodes: string[] }>('auth/mfa/enable', { code: code.trim() }, { silent: true });
        setBusy(false);
        if (!r.success) { setError(r.msg); return; }
        setCodes(r.data.recoveryCodes);
    }

    async function copy(text: string, what: string) {
        await Clipboard.setStringAsync(text);
        setCopied(what);
        setTimeout(() => setCopied(null), 2500);
    }

    if (codes) {
        return (
            <Screen>
                <Display size={24}>2FA ativado!</Display>
                <Notice tone="warn" icon="warning-outline" text="Guarde estes códigos de recuperação em lugar seguro. Eles NÃO serão exibidos novamente e permitem entrar se você perder o celular." />
                <Card>
                    {codes.map(c => <Txt key={c} size={17} style={[textStyles.mono, { textAlign: 'center' }]}>{c}</Txt>)}
                </Card>
                <Button title={copied === 'codes' ? 'Copiado!' : 'Copiar códigos'} variant="outline" icon="copy-outline" onPress={() => copy(codes.join('\n'), 'codes')} />
                <Button title="Já guardei, continuar" onPress={onDone} />
            </Screen>
        );
    }

    if (loadError) {
        return (
            <Screen>
                <Notice tone="danger" icon="alert-circle-outline" text={loadError} />
                <Button title="Tentar novamente" onPress={start} />
                <Button title="Sair desta conta" variant="ghost" onPress={onAbort} />
            </Screen>
        );
    }
    if (!data) return <Loading label="Preparando..." />;

    return (
        <Screen>
            <Display size={24}>Proteja sua conta</Display>
            {required ? <Notice tone="info" icon="shield-checkmark-outline" text="Sua função exige a verificação em duas etapas. Cadastre um aplicativo autenticador para continuar." /> : null}
            <Txt>1. Instale um aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy...).</Txt>
            <Txt>2. Escaneie o QR Code abaixo com OUTRO aparelho, toque em "Abrir no autenticador" (se estiver neste celular) ou digite a chave manualmente.</Txt>
            <View style={{ alignSelf: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md }}>
                <Image source={{ uri: data.qrDataUrl }} style={{ width: 200, height: 200 }} contentFit="contain" />
            </View>
            <Button title="Abrir no autenticador" variant="outline" icon="open-outline" onPress={() => Linking.openURL(data.otpauthUrl).catch(() => setError('Nenhum aplicativo autenticador encontrado neste aparelho'))} />
            <Card>
                <Txt size={13} color="inkMuted">Chave (digitação manual)</Txt>
                <Row style={{ justifyContent: 'space-between' }}>
                    <Txt size={15} style={[textStyles.mono, { flex: 1 }]} selectable>{data.secret}</Txt>
                    <Button small variant="ghost" icon="copy-outline" title={copied === 'secret' ? 'Copiada!' : 'Copiar'} onPress={() => copy(data.secret, 'secret')} />
                </Row>
            </Card>
            <Txt>3. Digite o código de 6 dígitos gerado pelo aplicativo:</Txt>
            {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
            <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} style={{ fontSize: 24, letterSpacing: 6, textAlign: 'center' }} />
            <Button title="Ativar verificação" onPress={confirm} loading={busy} />
            {required ? <Button title="Sair desta conta" variant="ghost" onPress={onAbort} /> : null}
        </Screen>
    );
}
