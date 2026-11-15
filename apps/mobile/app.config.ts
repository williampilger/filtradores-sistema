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

// ⚠️ Monorepo: os `overrides` de react na raiz fazem o npm deixar o expo-router em apps/mobile/node_modules
// (não sobe para a raiz). O gerador de "typed routes" do `expo start` (@expo/router-server, na raiz) faz
// require('expo-router/...') e quebraria. Incluímos o node_modules do app nos caminhos globais do Node
// (vale só para o processo do Expo CLI; o bundle do Metro não é afetado).
{
    const local = path.resolve(__dirname, 'node_modules');
    const paths = (process.env.NODE_PATH ?? '').split(path.delimiter).filter(Boolean);
    if (!paths.includes(local)) {
        process.env.NODE_PATH = [local, ...paths].join(path.delimiter);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('node:module') as { Module: { _initPaths: () => void } }).Module._initPaths();
    }
}

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
        // faixa "AMBIENTE DE DEMONSTRAÇÃO" no topo de todas as telas (EXPO_PUBLIC_DEMO_MODE=true no .env da raiz)
        demoMode: process.env.EXPO_PUBLIC_DEMO_MODE === 'true',
        // eas: { projectId: '<preencher após `eas init`>' },
    },
});
