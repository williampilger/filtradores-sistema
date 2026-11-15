/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Adesão / pagamento do plano de sócio
 *
 * ⚠️ App Store (iOS): o plano de sócio libera conteúdo DIGITAL (posts exclusivos do feed). Pela regra 3.1.1 da Apple,
 *    vender conteúdo digital dentro do app exigiria In-App Purchase. Por isso, no iOS, a adesão e o pagamento das
 *    mensalidades abrem o SITE (`/socio`) no navegador; no Android o fluxo é feito dentro do app.
 *    Ingressos e produtos físicos podem ser vendidos no app normalmente (regra 3.1.3(e)/(f)).
 *    TODO: revisar conforme o retorno da revisão da Apple (ver apps/mobile/README.md).
 */
import { Platform } from 'react-native';
import { router } from 'expo-router';
import type { OrderDTO } from '@filt/shared';
import { apiPost } from '@/api';
import { siteUrl } from '@/config';
import { openPaymentUrl } from './payments';

export const MEMBERSHIP_IN_APP = Platform.OS !== 'ios';

/** Página do site para ser sócio (iOS) */
export const openMembershipSite = () => openPaymentUrl(siteUrl('/socio'));

/** "Quero ser sócio": cria o pedido de adesão e leva ao pagamento. Retorna a mensagem de erro, se houver. */
export async function joinPlan(planId: number): Promise<string | null> {
    if (!MEMBERSHIP_IN_APP) { await openMembershipSite(); return null; }
    const r = await apiPost<OrderDTO>('me/membership/join', { planId, channel: 'APP' });
    if (!r.success) return r.msg;
    router.push({ pathname: '/order/[code]', params: { code: r.data.code } });
    return null;
}

/** Pagar uma cobrança de sócio em aberto */
export async function payCharge(chargeId: number): Promise<string | null> {
    if (!MEMBERSHIP_IN_APP) { await openMembershipSite(); return null; }
    const r = await apiPost<OrderDTO>(`me/membership/charges/${chargeId}/pay`, { channel: 'APP' });
    if (!r.success) return r.msg;
    router.push({ pathname: '/order/[code]', params: { code: r.data.code } });
    return null;
}
