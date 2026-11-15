/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Configuração do app Expo (lê o `.env` da raiz do monorepo)
 *
 * TODO(escudo): quando a diretoria enviar o vetor OFICIAL do escudo, gerar em apps/mobile/assets/
 *   icon.png (1024x1024), adaptive-icon.png (foreground 1024x1024) e splash-icon.png, e preencher
 *   `icon`, `android.adaptiveIcon` e a `image` do plugin expo-splash-screen abaixo.
 *   NÃO redesenhar/recriar o escudo (ver docs/identidade-visual.md).
 */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// .env da raiz (não sobrescreve variáveis já definidas - ex.: env do EAS Build)
loadEnv({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// O app.config não consegue importar TS (src/theme.ts): valores copiados de lá - manter sincronizado.
const colors = { brand: '#1b3fd1', app: '#f2f4fa' } as const; // = colors.brand / colors.app de src/theme.ts

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'ACE Filtradores',
    slug: 'ace-filtradores',
    scheme: 'acefiltradores',
    version: '1.0.0',
    platforms: ['ios', 'android'],
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    primaryColor: colors.brand,
    backgroundColor: colors.app,
    ios: {
        bundleIdentifier: 'br.com.acefiltradores.app',
        supportsTablet: false,
        infoPlist: {
            NSCameraUsageDescription: 'O app usa a câmera para ler o QR Code dos ingressos e carteirinhas na portaria.',
            NSPhotoLibraryUsageDescription: 'O app acessa suas fotos para você escolher a foto do seu perfil e da carteirinha de sócio.',
            ITSAppUsesNonExemptEncryption: false,
        },
    },
    android: {
        package: 'br.com.acefiltradores.app',
        permissions: ['android.permission.CAMERA'],
        blockedPermissions: ['android.permission.RECORD_AUDIO'],
    },
    plugins: [
        'expo-router',
        'expo-secure-store',
        'expo-font',
        'expo-web-browser',
        ['expo-camera', {
            cameraPermission: 'O app usa a câmera para ler o QR Code dos ingressos e carteirinhas na portaria.',
            microphonePermission: false,
            recordAudioAndroid: false,
        }],
        ['expo-image-picker', {
            photosPermission: 'O app acessa suas fotos para você escolher a foto do seu perfil e da carteirinha de sócio.',
            cameraPermission: 'O app usa a câmera para você tirar a foto do seu perfil.',
            microphonePermission: false,
        }],
        ['expo-splash-screen', { backgroundColor: colors.brand }],
    ],
    experiments: { typedRoutes: true },
    extra: {
        apiUrl,
        // eas: { projectId: '<preencher após `eas init`>' },
    },
});
