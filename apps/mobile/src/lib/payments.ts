/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Pagamentos no app (PIX na tela; cartão/boleto/checkout no navegador do sistema)
 */
import * as WebBrowser from 'expo-web-browser';
import type { OrderDTO, OrderStatus, PaymentDTO, PaymentMethod } from '@filt/shared';
import { colors } from '@/theme';

/** Pagamento "vivo" do pedido (o mais recente ainda pendente) */
export function currentPayment(order: OrderDTO): PaymentDTO | null {
    // a API devolve os pagamentos do mais novo para o mais antigo
    return order.payments.find(p => p.status === 'PENDING' || p.status === 'AUTHORIZED') ?? null;
}

/** URL externa a abrir para pagar (cartão / checkout do gateway / boleto) */
export const externalPayUrl = (p: PaymentDTO) => p.checkoutUrl ?? p.boletoUrl ?? null;

export async function openPaymentUrl(url: string) {
    await WebBrowser.openBrowserAsync(url, {
        toolbarColor: colors.brandDeep,
        controlsColor: colors.brandInk,
        dismissButtonStyle: 'close',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
}

/** QR do PIX: a API pode devolver base64 puro ou já como data URI */
export function pixImageUri(b64: string | null): string | null {
    if (!b64) return null;
    return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
}

export const METHOD_ICON: Record<PaymentMethod, 'qr-code-outline' | 'card-outline' | 'barcode-outline' | 'open-outline' | 'cash-outline' | 'create-outline' | 'gift-outline'> = {
    PIX: 'qr-code-outline', CARD: 'card-outline', BOLETO: 'barcode-outline', CHECKOUT: 'open-outline',
    CASH: 'cash-outline', MANUAL: 'create-outline', COURTESY: 'gift-outline',
};

export const ORDER_TONE: Record<OrderStatus, 'ok' | 'warn' | 'danger' | 'neutral' | 'info'> = {
    PENDING_PAYMENT: 'warn', PAID: 'ok', CANCELED: 'neutral', EXPIRED: 'neutral', REFUNDED: 'info', PARTIALLY_REFUNDED: 'info',
};
