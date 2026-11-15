'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Evento > Cortesias: emite ingressos gratuitos para N titulares (com motivo), opcionalmente vinculados à conta de um usuário
 */
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import API from '@/api';
import type { AdminTicketType } from '@/api/types';
import { Card, Field, Input, Select } from '@/components/ui';
import { useBusy } from '@/components/admin/common';

type Holder = { name: string, email: string, cpf: string };
const EMPTY_HOLDER: Holder = { name: '', email: '', cpf: '' };

export default function CourtesyTab({ eventId, ticketTypes, onIssued }: { eventId: number, ticketTypes: AdminTicketType[] | null, onIssued: () => void }) {
    const [ticketTypeId, setTicketTypeId] = useState<number | ''>('');
    const [reason, setReason] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [holders, setHolders] = useState<Holder[]>([{ ...EMPTY_HOLDER }]);
    const [issued, setIssued] = useState<string[]>([]);
    const { busy, run } = useBusy();

    const setHolder = (i: number, k: keyof Holder, v: string) => setHolders(hs => hs.map((h, j) => (j === i ? { ...h, [k]: v } : h)));
    const valid = reason.trim().length >= 3 && holders.some(h => h.name.trim().length >= 2);

    const submit = async () => {
        const list = holders.filter(h => h.name.trim()).map(h => ({ name: h.name.trim(), email: h.email.trim() || undefined, cpf: h.cpf.trim() || undefined }));
        const r = await run('save', () => API.admin.events.courtesy(eventId, { ticketTypeId: ticketTypeId || null, reason: reason.trim(), holders: list, userEmail: userEmail.trim() || undefined }));
        if (r.success) {
            toast.success(`${list.length} cortesia(s) emitida(s)`);
            setIssued(x => [r.data.orderCode, ...x]);
            setHolders([{ ...EMPTY_HOLDER }]); setReason(''); setUserEmail('');
            onIssued();
        }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card title="Emitir cortesias">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Lote (opcional)" hint="Consome a quantidade do lote escolhido. Sem lote = cortesia avulsa (conta só na capacidade total).">
                        <Select<number | ''> value={ticketTypeId} onChange={setTicketTypeId}
                            options={[{ value: '', label: 'Sem lote (avulsa)' }, ...(ticketTypes ?? []).map(t => ({ value: t.id, label: `${t.name} (${t.available} disp.)` }))]} />
                    </Field>
                    <Field label="Motivo *"><Input value={reason} onChange={setReason} placeholder="Ex.: patrocinador, imprensa, convidado da diretoria" /></Field>
                    <Field label="Vincular à conta do usuário (e-mail)" hint="Opcional. Os ingressos aparecem no app/site dessa conta." className="sm:col-span-2">
                        <Input type="email" value={userEmail} onChange={setUserEmail} />
                    </Field>
                </div>
                <div className="mt-4">
                    <span className="lbl">Titulares (um ingresso por linha)</span>
                    <div className="space-y-2">
                        {holders.map((h, i) => (
                            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[2fr_2fr_1fr_auto]">
                                <Input value={h.name} onChange={v => setHolder(i, 'name', v)} placeholder="Nome *" />
                                <Input value={h.email} onChange={v => setHolder(i, 'email', v)} placeholder="E-mail" className="hidden sm:block" />
                                <Input value={h.cpf} onChange={v => setHolder(i, 'cpf', v)} placeholder="CPF" className="hidden sm:block" />
                                <button className="btn btn-ghost btn-sm self-center" disabled={holders.length === 1} onClick={() => setHolders(hs => hs.filter((_, j) => j !== i))} aria-label="Remover">✕</button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex flex-wrap justify-between gap-2">
                        <button className="btn btn-sm" onClick={() => setHolders(hs => [...hs, { ...EMPTY_HOLDER }])} disabled={holders.length >= 100}>+ Adicionar titular</button>
                        <button className="btn btn-primary" disabled={!!busy || !valid} onClick={() => void submit()}>{busy ? 'Emitindo...' : `Emitir ${holders.filter(h => h.name.trim()).length || ''} cortesia(s)`}</button>
                    </div>
                </div>
            </Card>
            <Card title="Emitidas agora">
                {issued.length === 0 ? <p className="text-sm text-ink-faint">Os pedidos de cortesia emitidos nesta tela aparecem aqui. Todas as cortesias ficam na aba Ingressos (origem Cortesia).</p> : (
                    <ul className="space-y-1 text-sm">
                        {issued.map(code => (
                            <li key={code}>Pedido <Link href={`/pedido/${code}`} target="_blank" className="font-mono font-semibold text-brand hover:underline">{code}</Link> <span className="text-ink-muted">(abrir para imprimir/enviar os QR)</span></li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
