/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Imagem da API (URL relativa /api/v1/files/... -> absoluta; fotos privadas com o token)
 */
import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { absoluteUrl } from '@/config';
import { getToken } from '@/storage';
import { colors } from '@/theme';

type Props = {
    url: string | null | undefined;
    style?: StyleProp<ImageStyle>;
    /** foto privada (users/...): envia o token */
    auth?: boolean;
    contentFit?: 'cover' | 'contain';
    placeholderIcon?: React.ComponentProps<typeof Ionicons>['name'];
};

export function RemoteImage({ url, style, auth, contentFit = 'cover', placeholderIcon = 'image-outline' }: Props) {
    const [token, setToken] = useState<string | null | undefined>(auth ? undefined : null);
    useEffect(() => { if (auth) void getToken().then(setToken); }, [auth]);

    const uri = absoluteUrl(url);
    if (!uri || token === undefined) {
        return (
            <View style={[{ backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }, style as StyleProp<ViewStyle>]}>
                <Ionicons name={placeholderIcon} size={28} color={colors.brand} />
            </View>
        );
    }
    return (
        <Image
            source={{ uri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
            style={style}
            contentFit={contentFit}
            transition={150}
            cachePolicy="memory-disk"
        />
    );
}
