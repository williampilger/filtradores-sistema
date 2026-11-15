/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Rascunho do checkout (passado da tela do jogo/produto para a tela de pagamento)
 */
import type { CartItemInput } from '@filt/shared';

export type CheckoutLine = {
    item: CartItemInput;
    /** descrição para o resumo (ex.: "Inteira - ACEF x Fulano") */
    label: string;
    unitCents: number;
};

export type CheckoutDraft = { title: string, lines: CheckoutLine[] };

let draft: CheckoutDraft | null = null;

export const setCheckoutDraft = (d: CheckoutDraft) => { draft = d; };
export const getCheckoutDraft = () => draft;
export const clearCheckoutDraft = () => { draft = null; };
export const draftTotal = (d: CheckoutDraft) => d.lines.reduce((s, l) => s + l.unitCents * l.item.quantity, 0);
