/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Navegação auxiliar
 */
import { router } from 'expo-router';

/** Fecha o modal de autenticação e volta para onde o usuário estava */
export function leaveAuth() {
    if (router.canDismiss()) router.dismissAll();
    if (router.canGoBack()) router.back();
    else router.replace('/');
}

/** Abre o login (modal) */
export const goLogin = () => router.push('/login');
