'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Produtos: lista (estoque, reservado, lista de espera) e cadastro com variações iniciais
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { LABELS } from '@filt/shared';
import API from '@/api';
import type { ProductInput } from '@/api/types';
import { Badge, Checkbox, Empty, Field, Input, Modal, Money, PageHeader, Spinner } from '@/components/ui';
import { FilterBar, RequirePerm, TableBox, Thumb, useBusy, useClientPage, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';
import { EMPTY_PRODUCT, ProductFields, productBody } from '../ProductDetail/form.Data';

function CreateProductModal({ open, onClose }: { open: boolean, onClose: () => void }) {
    const router = useRouter();
    const [f, setF] = useState<ProductInput>(EMPTY_PRODUCT);
    const [variants, setVariants] = useState('P, M, G, GG');
    const { busy, run } = useBusy();
    const names = variants.split(',').map(s => s.trim()).filter(Boolean);

    const submit = async () => {
        const r = await run('save', () => API.admin.products.create({ ...productBody(f), variants: names.map((name, i) => ({ name, active: true, sortOrder: i })) }));
        if (r.success) { toast.success('Produto criado'); setF(EMPTY_PRODUCT); router.push(`/admin/produtos/${r.data.id}?tab=variacoes`); }
    };
    return (
        <Modal wide open={open} title="Novo produto" onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy || f.name.trim().length < 2} onClick={() => void submit()}>{busy ? 'Salvando...' : 'Criar produto'}</button></>}>
            <ProductFields f={f} setF={setF} slugAuto />
            <Field label="Variações iniciais (separadas por vírgula)" className="mt-3"
                hint={names.length ? `Serão criadas: ${names.join(' · ')}. Estoque inicial é lançado depois, em "Variações e estoque".` : 'Vazio = uma variação "Único".'}>
                <Input value={variants} onChange={setVariants} placeholder="P, M, G, GG" />
            </Field>
        </Modal>
    );
}

function ProductsInner() {
    const { can } = useSession();
    const { data, loading } = useData(() => API.admin.products.list(), []);
    const [creating, setCreating] = useState(false);
    const [q, setQ] = useState('');
    const [inactive, setInactive] = useState(true);
    const term = q.trim().toLowerCase();
    const filtered = useMemo(() => (data ?? []).filter(p => (inactive || p.active) && (!term || p.name.toLowerCase().includes(term) || (p.category ?? '').toLowerCase().includes(term))), [data, term, inactive]);
    const pg = useClientPage(filtered, 50);

    return (
        <div>
            <PageHeader title="Produtos" subtitle="Loja do clube: estoque, encomendas e listas de espera"
                actions={can('products.write') && <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Novo produto</button>} />
            <FilterBar>
                <Input value={q} onChange={setQ} placeholder="Filtrar por nome ou categoria" className="!w-72" />
                <div className="flex h-[34px] items-center"><Checkbox checked={inactive} onChange={setInactive} label="Mostrar inativos" /></div>
            </FilterBar>
            {loading && !data ? <Spinner /> : !filtered.length ? <Empty>{data?.length ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}</Empty> : (
                <>
                <TableBox>
                    <thead><tr><th>Produto</th><th>Categoria</th><th>Modo</th><th className="num">A partir de</th><th className="num">Estoque</th><th className="num">Reservado</th><th className="num">Disponível</th><th className="num">Lista de espera</th><th>Situação</th></tr></thead>
                    <tbody>
                        {pg.rows.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <Link href={`/admin/produtos/${p.id}`} className="flex items-center gap-2 font-medium text-brand hover:underline">
                                        <Thumb url={p.imageUrl} size={36} />{p.name}
                                    </Link>
                                </td>
                                <td className="text-ink-muted">{p.category ?? '-'}</td>
                                <td className="text-xs">{LABELS.fulfillment[p.fulfillment]}{p.waitlistEnabled && <div className="text-ink-muted">Lista: {LABELS.waitlistPayment[p.waitlistPayment].toLowerCase()}</div>}</td>
                                <td className="num"><Money cents={p.fromPriceCents} /></td>
                                <td className="num">{p.fulfillment === 'STOCK' ? p.stock : '-'}</td>
                                <td className="num">{p.reserved || '-'}</td>
                                <td className={`num font-semibold ${p.fulfillment === 'STOCK' && p.stock - p.reserved <= 0 ? 'text-danger' : ''}`}>{p.fulfillment === 'STOCK' ? p.stock - p.reserved : '-'}</td>
                                <td className="num">{p.waitlist ? <Badge tone="warn">{p.waitlist}</Badge> : '-'}</td>
                                <td>
                                    <div className="flex flex-wrap gap-1">
                                        {p.active ? <Badge tone="ok">Ativo</Badge> : <Badge>Inativo</Badge>}
                                        {p.soldOut && <Badge tone="danger">Esgotado</Badge>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableBox>
                {pg.pager}
                </>
            )}
            {can('products.write') && <CreateProductModal open={creating} onClose={() => setCreating(false)} />}
        </div>
    );
}

export default function Products() {
    return <RequirePerm perms={['products.write', 'stock.adjust', 'waitlist.manage', 'orders.read']}><ProductsInner /></RequirePerm>;
}
