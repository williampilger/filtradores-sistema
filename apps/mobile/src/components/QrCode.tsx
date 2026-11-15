/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - QR Code (ingressos, carteirinha, PIX) em quadro branco
 */
import { memo } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radius } from '@/theme';

function QrCodeBase({ value, size = 220 }: { value: string, size?: number }) {
    return (
        <View style={{ backgroundColor: colors.surface, padding: 14, borderRadius: radius.md, alignSelf: 'center' }}>
            <QRCode value={value} size={size} color={colors.ink} backgroundColor={colors.surface} ecl="M" quietZone={4} />
        </View>
    );
}

/** só redesenha quando o conteúdo muda (o QR rotativo atualiza a cada 30 s, o relógio a cada 1 s) */
export const QrCode = memo(QrCodeBase);
