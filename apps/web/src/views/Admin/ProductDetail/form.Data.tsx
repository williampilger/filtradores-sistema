'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Produto: campos do formulário (cadastro e aba Dados) + aba Dados (imagens: enviar, remover, reordenar; a 1ª é a capa)
 */
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { LABELS, slugify } from '@filt/shared';
import API from '@/api';
import type { AdminProductDetail, ProductInput } from '@/api/types';
import { Card, Checkbox, confirmAction, Field, FileButton, Input, MoneyInput, Select, TextArea } from '@/components/ui';
import { optionsOf, orNull, toInt, useBusy } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

export const EMPTY_PRODUCT: ProductInput = {
    name: '', slug: '', description: '', category: '', basePriceCents: 0, fulfillment: 'STOCK', waitlistEnabled: true, waitlistPayment: 'UPFRONT',
    allowMemberDiscount: true, maxPerOrder: 10, active: true, sortOrder: 0,
};

export const productBody = (f: ProductInput): ProductInput => ({ ...f, name: f.name.trim(), slug: f.slug || slugify(f.name), description: orNull(f.description), category: orNull(f.category) });

export function ProductFields({ f, setF, slugAuto, disabled }: { f: ProductInput, setF: (fn: (p: ProductInput) => ProductInput) => void, slugAuto: boolean, disabled?: boolean }) {
    const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setF(p => ({ ...p, [k]: v }));
    return (
        <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-4">
            <Field label="Nome *" className="sm:col-span-2"><Input value={f.name} onChange={v => setF(p => ({ ...p, name: v, slug: slugAuto ? slugify(v) : p.slug }))} /></Field>
            <Field label="Slug (endereço)"><Input value={f.slug} onChange={v => set('slug', v)} /></Field>
            <Field label="Categoria"><Input value={f.category} onChange={v => set('category', v)} placeholder="Ex.: Camisas" /></Field>
            <Field label="Preço base"><MoneyInput cents={f.basePriceCents} onChange={v => set('basePriceCents', v ?? 0)} /></Field>
            <Field label="Máx. por pedido"><Input type="number" min={1} max={100} value={f.maxPerOrder} onChange={v => set('maxPerOrder', toInt(v) ?? 1)} /></Field>
            <Field label="Ordem"><Input type="number" value={f.sortOrder} onChange={v => set('sortOrder', toInt(v) ?? 0)} /></Field>
            <div className="flex flex-col justify-end gap-1 pb-1">
                <Checkbox checked={f.active} onChange={v => set('active', v)} label="Ativo (na loja)" />
                <Checkbox checked={f.allowMemberDiscount} onChange={v => set('allowMemberDiscount', v)} label="Desconto de sócio" />
            </div>

            <div className="rounded-lg border border-line p-3 sm:col-span-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Modo de venda" hint={f.fulfillment === 'STOCK' ? 'Vende o que há em estoque; esgotado -> lista de espera (se ativa).' : 'Produzido em lotes: os pedidos entram no lote aberto e são entregues quando o lote fica pronto.'}>
                        <Select value={f.fulfillment} onChange={v => set('fulfillment', v)} options={optionsOf(LABELS.fulfillment)} />
                    </Field>
                    <div className="flex items-start pt-6">
                        <Checkbox checked={f.waitlistEnabled} onChange={v => set('waitlistEnabled', v)} label="Lista de espera ativa" />
                    </div>
                    {f.waitlistEnabled && (
                        <Field label="Pagamento da lista de espera"
                            hint={f.waitlistPayment === 'UPFRONT'
                                ? 'O torcedor paga ao entrar na lista (garante a encomenda).'
                                : 'Entra na lista sem pagar; quando o item chega/fica pronto, é chamado e tem um prazo para pagar.'}>
                            <Select value={f.waitlistPayment} onChange={v => set('waitlistPayment', v)} options={optionsOf(LABELS.waitlistPayment)} />
                        </Field>
                    )}
                </div>
            </div>

            <Field label="Descrição" className="sm:col-span-4"><TextArea value={f.description} onChange={v => set('description', v)} rows={4} /></Field>
        </fieldset>
    );
}

export default function DataTab({ p, onSaved }: { p: AdminProductDetail, onSaved: () => void }) {
    const { can } = useSession();
    const router = useRouter();
    const canWrite = can('products.write');
    const toForm = (x: AdminProductDetail): ProductInput => ({
        name: x.name, slug: x.slug, description: x.description ?? '', category: x.category ?? '', basePriceCents: x.basePriceCents, fulfillment: x.fulfillment,
        waitlistEnabled: x.waitlistEnabled, waitlistPayment: x.waitlistPayment, allowMemberDiscount: x.allowMemberDiscount, maxPerOrder: x.maxPerOrder, active: x.active, sortOrder: x.sortOrder,
    });
    const [f, setF] = useState<ProductInput>(() => toForm(p));
    const [images, setImages] = useState(p.images);
    const { busy, run } = useBusy();
    useEffect(() => { setF(toForm(p)); setImages(p.images); }, [p]);

    const save = async () => {
        const r = await run('save', () => API.admin.products.update(p.id, productBody(f)));
        if (r.success) { toast.success('Produto salvo'); onSaved(); }
    };
    const upload = async (file: File) => {
        const r = await run('img', () => API.admin.products.addImage(p.id, file));
        if (r.success) { setImages(x => [...x, r.data]); toast.success('Imagem enviada'); }
    };
    const removeImg = async (key: string) => {
        if (!confirmAction('Remover esta imagem?')) return;
        const r = await run('img', () => API.admin.products.removeImage(p.id, key));
        if (r.success) setImages(x => x.filter(i => i.key !== key));
    };
    const move = async (idx: number, dir: -1 | 1) => {
        const next = [...images];
        const j = idx + dir;
        if (j < 0 || j >= next.length) return;
        [next[idx], next[j]] = [next[j], next[idx]];
        const r = await run('img', () => API.admin.products.reorderImages(p.id, next.map(i => i.key)));
        if (r.success) setImages(next);
    };
    const remove = async () => {
        if (!confirmAction(`Excluir o produto "${p.name}"? Ele sai da loja; pedidos antigos continuam registrados.`)) return;
        const r = await run('del', () => API.admin.products.remove(p.id));
        if (r.success) { toast.success('Produto excluído'); router.push('/admin/produtos'); }
    };

    return (
        <div className="space-y-4">
            <Card title="Dados do produto" actions={canWrite && <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void save()}>{busy === 'save' ? 'Salvando...' : 'Salvar'}</button>}>
                {f.fulfillment !== p.fulfillment && <p className="mb-3 rounded-md bg-warn-soft p-2 text-sm text-warn">Atenção: mudar o modo de venda com pedidos/lista em andamento pode deixar encomendas sem lote. Prefira criar um novo produto.</p>}
                <ProductFields f={f} setF={setF} slugAuto={false} disabled={!canWrite} />
            </Card>
            <Card title={`Imagens (${images.length}/12)`} actions={canWrite && <FileButton label={busy === 'img' ? 'Enviando...' : '+ Enviar imagem'} disabled={!!busy || images.length >= 12} onFile={file => void upload(file)} />}>
                {images.length === 0 ? <p className="text-sm text-ink-faint">Nenhuma imagem. A primeira imagem é a capa do produto na loja.</p> : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                        {images.map((img, i) => (
                            <div key={img.key} className="rounded-lg border border-line p-1.5">
                                <img src={img.url} alt="" className="aspect-square w-full rounded-md object-cover" />
                                <div className="mt-1.5 flex items-center justify-between gap-1">
                                    {i === 0 ? <span className="text-xs font-semibold text-brand">Capa</span> : <span className="text-xs text-ink-faint">#{i + 1}</span>}
                                    {canWrite && (
                                        <div className="flex gap-0.5">
                                            <button className="btn btn-ghost btn-sm !px-1.5" disabled={!!busy || i === 0} onClick={() => void move(i, -1)} title="Mover para a esquerda">‹</button>
                                            <button className="btn btn-ghost btn-sm !px-1.5" disabled={!!busy || i === images.length - 1} onClick={() => void move(i, 1)} title="Mover para a direita">›</button>
                                            <button className="btn btn-ghost btn-sm !px-1.5 text-danger" disabled={!!busy} onClick={() => void removeImg(img.key)} title="Remover">✕</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
            {canWrite && <div className="flex justify-end"><button className="btn btn-danger" disabled={!!busy} onClick={() => void remove()}>Excluir produto</button></div>}
        </div>
    );
}
