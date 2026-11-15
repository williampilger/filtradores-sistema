'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Produto: abas Dados, Variações e estoque, Lotes de produção (sob encomenda) e Lista de espera
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { LABELS } from '@filt/shared';
import API from '@/api';
import { Badge, Empty, PageHeader, Spinner, Tabs } from '@/components/ui';
import { RequirePerm, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';
import DataTab from './form.Data';
import VariantsTab from './form.Variants';
import BatchesTab from './form.Batches';
import WaitlistTab from './form.Waitlist';

type TabKey = 'dados' | 'variacoes' | 'lotes' | 'espera';

function ProductDetailInner({ id }: { id: number }) {
    const { can } = useSession();
    const sp = useSearchParams();
    const { data: p, loading, reload } = useData(() => API.admin.products.get(id), [id]);
    const [tab, setTab] = useState<TabKey | null>(null);

    if (loading && !p) return <Spinner />;
    if (!p) return <Empty>Produto não encontrado.</Empty>;
    const refresh = () => void reload();

    const tabs: { key: TabKey, label: string, hidden?: boolean }[] = [
        { key: 'dados', label: 'Dados' },
        { key: 'variacoes', label: 'Variações e estoque' },
        { key: 'lotes', label: 'Lotes de produção', hidden: p.fulfillment !== 'ON_DEMAND' },
        { key: 'espera', label: 'Lista de espera', hidden: !can('waitlist.manage') },
    ];
    const wanted = sp.get('tab') as TabKey | null;
    const current = tab ?? (tabs.find(t => t.key === wanted && !t.hidden)?.key ?? 'dados');

    return (
        <div>
            <PageHeader title={p.name}
                subtitle={<span className="flex flex-wrap items-center gap-2">
                    {p.active ? <Badge tone="ok">Ativo</Badge> : <Badge>Inativo</Badge>}
                    <span>{LABELS.fulfillment[p.fulfillment]}</span>
                    {p.waitlistEnabled && <span className="text-ink-faint">· lista de espera: {LABELS.waitlistPayment[p.waitlistPayment].toLowerCase()}</span>}
                </span>}
                actions={<>
                    <Link href="/admin/produtos" className="btn">‹ Produtos</Link>
                    {p.active && <Link href={`/loja/${p.slug}`} className="btn" target="_blank">Ver na loja</Link>}
                </>} />
            <Tabs tabs={tabs} value={current} onChange={setTab} />
            {current === 'dados' && <DataTab p={p} onSaved={refresh} />}
            {current === 'variacoes' && <VariantsTab p={p} onChanged={refresh} />}
            {current === 'lotes' && <BatchesTab p={p} onChanged={refresh} />}
            {current === 'espera' && <WaitlistTab productId={p.id} onChanged={refresh} />}
        </div>
    );
}

export default function ProductDetail({ id }: { id: number }) {
    return <RequirePerm perms={['products.write', 'stock.adjust', 'waitlist.manage', 'orders.read']}><ProductDetailInner id={id} /></RequirePerm>;
}
