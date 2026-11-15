/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Abas principais (a aba "Portaria" só aparece para quem tem permissão de staff)
 */
import { Tabs } from 'expo-router/js-tabs';
import { Display, Ionicons, type IconName } from '@/components/ui';
import { can, isReady, useSession } from '@/session';
import { colors, fonts } from '@/theme';

const icon = (name: IconName) => ({ color, size }: { color: string, size: number }) => <Ionicons name={name} size={size} color={color} />;
const title = (text: string) => () => <Display size={20} color="headerInk">{text}</Display>;

export default function TabsLayout() {
    const { session } = useSession();
    const staff = isReady(session) && can(session, 'checkin.validate', 'events.read', 'tickets.sell_manual');
    const unread = session?.unreadNotifications ?? 0;

    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: colors.header },
                headerTintColor: colors.headerInk,
                headerTitleAlign: 'center',
                tabBarActiveTintColor: colors.brand,
                tabBarInactiveTintColor: colors.inkMuted,
                tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
                tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
                sceneStyle: { backgroundColor: colors.app },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Início', headerTitle: title('Filtradores'), tabBarIcon: icon('home') }} />
            <Tabs.Screen name="games" options={{ title: 'Jogos', headerTitle: title('Jogos'), tabBarIcon: icon('football') }} />
            <Tabs.Screen name="store" options={{ title: 'Loja', headerTitle: title('Loja'), tabBarIcon: icon('bag-handle') }} />
            <Tabs.Screen name="card" options={{ title: 'Carteirinha', headerTitle: title('Carteirinha'), tabBarIcon: icon('card') }} />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Perfil', headerTitle: title('Perfil'), tabBarIcon: icon('person-circle'),
                    tabBarBadge: unread > 0 ? unread : undefined, tabBarBadgeStyle: { backgroundColor: colors.clubRed, color: colors.inkInverse },
                }}
            />
            <Tabs.Screen name="staff" options={{ title: 'Portaria', headerTitle: title('Portaria'), tabBarIcon: icon('scan'), href: staff ? undefined : null }} />
        </Tabs>
    );
}
