'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Configurações do clube: dados, contatos, retirada, termos, logo e cores
 *              (as cores aqui são DADOS do clube - usadas em e-mails/carteirinha -, não tokens da interface)
 */
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '@/api';
import type { ClubSettings } from '@/api/types';
import { Card, Field, FileButton, Input, PageHeader, Spinner, TextArea } from '@/components/ui';
import { orNull, RequirePerm, useBusy, useData } from '@/components/admin/common';
import { DEFAULT_LOGO_URL } from '@/components/site/helpers';

type Form = Omit<ClubSettings, 'id' | 'logoKey' | 'logoUrl' | 'updatedAt'>;
const HEX = /^#[0-9a-fA-F]{6}$/;

function ColorField({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    const ok = HEX.test(value);
    return (
        <Field label={label} hint={ok ? undefined : <span className="text-danger">Use o formato #RRGGBB</span>}>
            <div className="flex gap-2">
                <input type="color" className="inp !w-12 !p-1" value={ok ? value : '#000000'} onChange={e => onChange(e.target.value)} />
                <Input value={value} onChange={v => onChange(v.trim())} maxLength={7} className="font-mono" />
            </div>
        </Field>
    );
}

function SettingsInner() {
    const { data, loading, reload } = useData(() => API.admin.settings.get(), []);
    const [f, setF] = useState<Form | null>(null);
    const [logo, setLogo] = useState<string | null>(null);
    const { busy, run } = useBusy();

    useEffect(() => {
        if (!data) return;
        const { id: _id, logoKey: _k, logoUrl, updatedAt: _u, ...rest } = data;
        setF(rest); setLogo(logoUrl);
    }, [data]);

    if ((loading && !data) || !f) return <Spinner />;
    const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(p => (p ? { ...p, [k]: v } : p));
    const valid = f.name.trim().length >= 2 && f.shortName.trim().length >= 2 && HEX.test(f.primaryColor) && HEX.test(f.secondaryColor);

    const save = async () => {
        const body: Form = {
            ...f, name: f.name.trim(), shortName: f.shortName.trim(), city: orNull(f.city), about: orNull(f.about), contactEmail: orNull(f.contactEmail),
            contactPhone: orNull(f.contactPhone), instagram: orNull(f.instagram), pickupInfo: orNull(f.pickupInfo), termsText: orNull(f.termsText),
        };
        const r = await run('s', () => API.admin.settings.save(body));
        if (r.success) { toast.success('Configurações salvas'); void reload(); }
    };
    const upload = async (file: File) => {
        const r = await run('logo', () => API.admin.settings.uploadLogo(file));
        if (r.success) { setLogo(r.data.logoUrl); toast.success('Logo atualizado'); }
    };

    return (
        <div className="space-y-4">
            <PageHeader title="Configurações do clube" actions={<button className="btn btn-primary" disabled={!!busy || !valid} onClick={() => void save()}>{busy === 's' ? 'Salvando...' : 'Salvar'}</button>} />
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
                <Card title="Dados do clube">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Nome completo *" className="sm:col-span-2"><Input value={f.name} onChange={v => set('name', v)} /></Field>
                        <Field label="Nome curto / sigla *"><Input value={f.shortName} onChange={v => set('shortName', v)} /></Field>
                        <Field label="Cidade"><Input value={f.city} onChange={v => set('city', v)} /></Field>
                        <Field label="E-mail de contato"><Input type="email" value={f.contactEmail} onChange={v => set('contactEmail', v)} /></Field>
                        <Field label="Telefone de contato"><Input value={f.contactPhone} onChange={v => set('contactPhone', v)} /></Field>
                        <Field label="Instagram"><Input value={f.instagram} onChange={v => set('instagram', v)} placeholder="@acefiltradores" /></Field>
                        <Field label="Sobre o clube" className="sm:col-span-3"><TextArea value={f.about} onChange={v => set('about', v)} rows={4} /></Field>
                        <Field label="Retirada de produtos (instruções)" className="sm:col-span-3" hint="Exibido nos pedidos da loja e nos avisos de 'pronto para retirada'.">
                            <TextArea value={f.pickupInfo} onChange={v => set('pickupInfo', v)} rows={3} />
                        </Field>
                        <Field label="Termos de uso / regulamento" className="sm:col-span-3"><TextArea value={f.termsText} onChange={v => set('termsText', v)} rows={8} /></Field>
                    </div>
                </Card>
                <div className="space-y-4">
                    <Card title="Escudo / logo">
                        <div className="mb-3 flex aspect-square items-center justify-center rounded-lg border border-line bg-surface-alt p-4">
                            <img src={logo || DEFAULT_LOGO_URL} alt="Logo do clube" className="max-h-full max-w-full object-contain" />
                        </div>
                        <FileButton label={busy === 'logo' ? 'Enviando...' : 'Enviar arquivo oficial'} disabled={!!busy} onFile={file => void upload(file)} />
                        <p className="mt-2 text-xs text-ink-faint">Use somente o arquivo oficial do escudo (PNG com fundo transparente).{!logo && ' Sem envio, o site usa o escudo provisório padrão.'}</p>
                    </Card>
                    <Card title="Cores do clube">
                        <div className="space-y-3">
                            <ColorField label="Cor primária" value={f.primaryColor} onChange={v => set('primaryColor', v)} />
                            <ColorField label="Cor secundária" value={f.secondaryColor} onChange={v => set('secondaryColor', v)} />
                            <p className="text-xs text-ink-faint">Dados do clube (exibidos nas páginas públicas e no app). O tema do painel segue a identidade visual definida no código.</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function Settings() {
    return <RequirePerm perms={['settings.manage']}><SettingsInner /></RequirePerm>;
}
