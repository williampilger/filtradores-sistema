'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Gateways de pagamento: habilitar, sandbox, prioridade, métodos, credenciais (nunca exibidas) e webhook
 */
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { formatDateTime, LABELS, type GatewayId, type PaymentMethod } from '@filt/shared';
import API from '@/api';
import type { GatewayRow } from '@/api/types';
import { Badge, Card, Checkbox, Empty, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { CopyField, RequirePerm, toInt, useBusy, useData } from '@/components/admin/common';

const WEBHOOK_HELP: Record<string, string> = {
    stripe: 'Stripe Dashboard > Developers > Webhooks > Add endpoint com a URL abaixo, selecionando os eventos de checkout, pagamento e reembolso. Copie o "Signing secret" (whsec_...) para o campo acima.',
    mercadopago: 'Mercado Pago > Suas integrações > Webhooks. Marque o tópico "Pagamentos" e copie a "Assinatura secreta" para o campo acima.',
    pagseguro: 'PagBank: a URL de notificação é enviada automaticamente em cada cobrança. Configure também em Minha conta > Integrações, se disponível.',
    asaas: 'Asaas > Integrações > Webhooks > Cobranças. Informe a URL abaixo e defina um "Token de autenticação" igual ao do campo acima.',
};

function GatewayCard({ g, onSaved }: { g: GatewayRow, onSaved: () => void }) {
    const [enabled, setEnabled] = useState(g.enabled);
    const [sandbox, setSandbox] = useState(g.sandbox);
    const [priority, setPriority] = useState(String(g.priority));
    const [methods, setMethods] = useState<PaymentMethod[]>(g.methods);
    const [cred, setCred] = useState<Record<string, string>>({});
    const { busy, run } = useBusy();
    useEffect(() => { setEnabled(g.enabled); setSandbox(g.sandbox); setPriority(String(g.priority)); setMethods(g.methods); setCred({}); }, [g]);

    const save = async () => {
        const credentials = Object.fromEntries(Object.entries(cred).filter(([, v]) => v.trim()));
        const r = await run('s', () => API.admin.gateways.save(g.gateway, { enabled, sandbox, priority: toInt(priority) ?? 0, methods, credentials: Object.keys(credentials).length ? credentials : undefined }));
        if (r.success) { toast.success(`${LABELS.gateway[g.gateway as GatewayId] ?? g.gateway} salvo`); onSaved(); }
    };
    const missing = g.fields.filter(f => f.required && !f.filled && !cred[f.key]?.trim());

    return (
        <Card title={<span className="flex items-center gap-2">{LABELS.gateway[g.gateway as GatewayId] ?? g.gateway} {g.enabled ? <Badge tone="ok">Ativo</Badge> : <Badge>Desativado</Badge>} {g.sandbox && <Badge tone="warn">Sandbox</Badge>}</span>}
            actions={<button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar'}</button>}>
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                    <Checkbox checked={enabled} onChange={setEnabled} label="Habilitado" />
                    <Checkbox checked={sandbox} onChange={setSandbox} label="Modo de testes (sandbox)" />
                    <label className="flex items-center gap-2 text-sm">Prioridade <input type="number" min={0} max={1000} className="inp !w-20" value={priority} onChange={e => setPriority(e.target.value)} /></label>
                </div>
                <p className="text-xs text-ink-faint">Prioridade: menor número = preferido quando mais de um gateway oferece o mesmo método.</p>
                <div>
                    <span className="lbl">Métodos oferecidos</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {g.supportedMethods.map(m => <Checkbox key={m} checked={methods.includes(m)} onChange={v => setMethods(v ? [...methods, m] : methods.filter(x => x !== m))} label={LABELS.paymentMethod[m]} />)}
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {g.fields.map(f => (
                        <Field key={f.key} label={<>{f.label}{f.required ? ' *' : ''}</>} hint={f.filled ? 'Salvo. Deixe em branco para manter.' : undefined}>
                            <Input type="password" autoComplete="new-password" value={cred[f.key] ?? ''} onChange={v => setCred({ ...cred, [f.key]: v })} placeholder={f.filled ? '•••• salvo' : 'não configurado'} />
                        </Field>
                    ))}
                </div>
                {enabled && missing.length > 0 && <p className="text-xs text-danger">Para habilitar, preencha: {missing.map(f => f.label).join(', ')}.</p>}
                <CopyField label="URL do webhook (cadastre no painel do gateway)" value={g.webhookUrl} />
                {WEBHOOK_HELP[g.gateway] && <p className="text-xs text-ink-muted">{WEBHOOK_HELP[g.gateway]}</p>}
                <p className="text-xs text-ink-faint">Atualizado em {formatDateTime(g.updatedAt)}</p>
            </div>
        </Card>
    );
}

function GatewaysInner() {
    const { data, loading, reload } = useData(() => API.admin.gateways.list(), []);
    return (
        <div>
            <PageHeader title="Gateways de pagamento" subtitle="As credenciais são gravadas criptografadas e nunca são exibidas novamente." />
            <div className="mb-4 rounded-md bg-brand-soft p-3 text-sm text-brand-deep">
                <b>Pagamento manual</b> (dinheiro, PIX direto na chave do clube) e <b>cortesia</b> estão sempre disponíveis no painel e na portaria, sem configuração.
            </div>
            {loading && !data ? <Spinner /> : !data?.length ? <Empty>Nenhum gateway cadastrado (rode o seed do banco).</Empty> : (
                <div className="grid gap-4 xl:grid-cols-2">
                    {data.map(g => <GatewayCard key={g.gateway} g={g} onSaved={() => void reload()} />)}
                </div>
            )}
        </div>
    );
}

export default function Gateways() {
    return <RequirePerm perms={['gateways.manage']}><GatewaysInner /></RequirePerm>;
}
