/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Perfil: foto, dados, ingressos, pedidos, sócio, lista de espera, notificações, segurança, excluir conta, sair
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LABELS } from '@filt/shared';
import { api } from '@/api';
import { useSession } from '@/session';
import { RemoteImage } from '@/components/RemoteImage';
import { Badge, Button, ClubMark, Display, Divider, HeroBlue, Ionicons, Loading, MenuItem, Notice, Screen, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export default function ProfileScreen() {
    const { session, hasToken, status, signOut, refresh } = useSession();
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    if (!hasToken) {
        return (
            <Screen>
                <HeroBlue style={{ borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.md }}>
                    <ClubMark size={64} />
                    <Display size={24} color="brandInk" center>Faça parte do Filtradores</Display>
                    <Txt color="sidebarInk" center>Entre para ver seus ingressos, pedidos e a carteirinha de sócio.</Txt>
                    <Button title="Entrar" variant="accent" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
                    <Button title="Criar conta" variant="light" onPress={() => router.push('/register')} style={{ alignSelf: 'stretch' }} />
                </HeroBlue>
            </Screen>
        );
    }
    if (!session) {
        if (status === 'loading') return <Loading />;
        return (
            <Screen>
                <Notice tone="warn" icon="cloud-offline-outline" text="Sem conexão com o servidor. Seus dados aparecem quando a conexão voltar." />
                <Button title="Tentar novamente" variant="outline" onPress={() => void refresh()} />
                <Button title="Ver meus ingressos" variant="outline" onPress={() => router.push('/me/tickets')} />
            </Screen>
        );
    }

    const u = session.user;
    const m = session.membership;

    async function changePhoto() {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher sua foto de perfil.'); return; }
        const pick = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
        if (pick.canceled || !pick.assets[0]) return;
        const a = pick.assets[0];
        const form = new FormData();
        const type = a.mimeType ?? 'image/jpeg';
        // React Native: arquivo enviado como { uri, name, type }
        form.append('file', { uri: a.uri, name: a.fileName ?? `foto.${type.split('/')[1] ?? 'jpg'}`, type } as unknown as Blob);
        setUploading(true);
        const r = await api<{ photoUrl: string }>('POST', 'me/photo', form, { timeoutMs: 60_000 });
        setUploading(false);
        if (!r.success) { Alert.alert('Não foi possível enviar a foto', r.msg); return; }
        await refresh();
    }

    function confirmSignOut() {
        Alert.alert('Sair', 'Deseja sair da sua conta neste aparelho?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
        ]);
    }

    return (
        <Screen padded={false} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} refreshing={refreshing}>
            <HeroBlue style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
                <Pressable onPress={changePhoto} accessibilityLabel="Trocar foto">
                    <RemoteImage url={u.photoUrl} auth style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.surface }} placeholderIcon="person" />
                    <View style={{ position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.clubGold, alignItems: 'center', justifyContent: 'center' }}>
                        {uploading ? <ActivityIndicator size="small" color={colors.brandDeep} /> : <Ionicons name="camera" size={16} color={colors.brandDeep} />}
                    </View>
                </Pressable>
                <Display size={22} color="brandInk" center>{u.name}</Display>
                <Txt color="sidebarInk">{u.email}</Txt>
                {m ? <Badge label={`Sócio ${m.plan.name} · ${LABELS.membershipStatus[m.status]}`} tone={m.status === 'ACTIVE' ? 'gold' : 'warn'} /> : null}
            </HeroBlue>

            {!u.emailVerified ? <View style={{ padding: spacing.lg, paddingBottom: 0 }}><Notice tone="warn" icon="mail-unread-outline" text="Confirme seu e-mail pelo link que enviamos." /></View> : null}

            <View style={{ marginTop: spacing.lg }}>
                <MenuItem icon="person-outline" label="Meus dados" detail="Nome, CPF, celular, nascimento" onPress={() => router.push('/me/edit')} />
                <Divider />
                <MenuItem icon="ticket-outline" label="Meus ingressos" onPress={() => router.push('/me/tickets')} />
                <MenuItem icon="receipt-outline" label="Meus pedidos" onPress={() => router.push('/me/orders')} />
                <MenuItem icon="star-outline" label="Sócio e cobranças" detail={m ? `${m.plan.name} · ${LABELS.membershipStatus[m.status]}` : 'Seja sócio'} onPress={() => router.push(m ? '/me/membership' : '/plans')} />
                <MenuItem icon="hourglass-outline" label="Lista de espera" onPress={() => router.push('/me/waitlist')} />
                <MenuItem icon="notifications-outline" label="Notificações" badge={session.unreadNotifications} onPress={() => router.push('/me/notifications')} />
                <Divider />
                <MenuItem icon="shield-checkmark-outline" label="Segurança" detail={u.totpEnabled ? 'Verificação em duas etapas ativa' : 'Senha e verificação em duas etapas'} onPress={() => router.push('/me/security')} />
                <MenuItem icon="trash-outline" label="Excluir conta" tone="danger" onPress={() => router.push('/me/delete-account')} />
                <MenuItem icon="log-out-outline" label="Sair" tone="inkMuted" onPress={confirmSignOut} />
            </View>
        </Screen>
    );
}
