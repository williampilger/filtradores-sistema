/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Meus dados (PATCH me/profile)
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { formatCpf, isValidCpf, onlyDigits, type SessionInfo } from '@filt/shared';
import { apiPatch } from '@/api';
import { useSession } from '@/session';
import { Button, Input, Loading, Notice, Screen, Txt } from '@/components/ui';

/** "1990-05-20T00:00:00.000Z" -> "20/05/1990" */
const isoToBr = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
/** "20/05/1990" -> "1990-05-20" (null se inválida) */
function brToIso(br: string): string | null {
    const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const d = new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00Z`);
    return Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(m[1]) ? null : `${m[3]}-${m[2]}-${m[1]}`;
}
function maskDate(v: string) {
    const d = onlyDigits(v).slice(0, 8);
    return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/');
}

export default function EditProfileScreen() {
    const { session, setSession } = useSession();
    const u = session?.user;
    const [name, setName] = useState(u?.name ?? '');
    const [cpf, setCpf] = useState(formatCpf(u?.cpf ?? ''));
    const [phone, setPhone] = useState(u?.phone ?? '');
    const [birth, setBirth] = useState(isoToBr(u?.birthDate ?? null));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!u) return <Loading />;

    async function save() {
        setError(null);
        if (name.trim().length < 2) return setError('Informe seu nome');
        if (cpf && !isValidCpf(cpf)) return setError('CPF inválido');
        const birthIso = birth ? brToIso(birth) : null;
        if (birth && !birthIso) return setError('Data de nascimento inválida (dd/mm/aaaa)');
        const phoneDigits = onlyDigits(phone);
        if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) return setError('Telefone inválido');
        setBusy(true);
        const r = await apiPatch<SessionInfo>('me/profile', {
            name: name.trim(),
            cpf: cpf ? onlyDigits(cpf) : null,
            phone: phoneDigits || null,
            birthDate: birthIso,
        });
        setBusy(false);
        if (!r.success) return setError(r.msg);
        setSession(r.data);
        router.back();
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Screen>
                {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
                <Input label="Nome completo" value={name} onChangeText={setName} autoComplete="name" />
                <Input label="E-mail" value={u.email} editable={false} />
                <Input label="CPF" value={cpf} onChangeText={v => setCpf(formatCpf(v))} keyboardType="number-pad" maxLength={14} />
                <Input label="Celular" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
                <Input label="Nascimento (dd/mm/aaaa)" value={birth} onChangeText={v => setBirth(maskDate(v))} keyboardType="number-pad" maxLength={10} />
                <Txt size={12} color="inkMuted">O CPF é usado para emitir as cobranças e identificar você na portaria.</Txt>
                <Button title="Salvar" onPress={save} loading={busy} />
            </Screen>
        </KeyboardAvoidingView>
    );
}
