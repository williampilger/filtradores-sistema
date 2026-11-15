'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Post do feed (conteúdo bloqueado mostra apenas o teaser com cadeado)
 */
import Link from 'next/link';
import { useState } from 'react';
import { FaLock, FaThumbtack } from 'react-icons/fa6';
import { formatDate, type PostDTO } from '@filt/shared';

export function PostCard({ post, compact }: { post: PostDTO, compact?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const [imgIdx, setImgIdx] = useState(0);
    const long = post.body.length > 280;
    const body = compact || (!expanded && long) ? `${post.body.slice(0, compact ? 160 : 280).trimEnd()}${post.body.length > (compact ? 160 : 280) ? '…' : ''}` : post.body;
    const img = post.imageUrls[imgIdx];

    return (
        <article className="panel flex flex-col overflow-hidden">
            {post.locked ? (
                <div className="hero-blue relative flex aspect-video flex-col items-center justify-center gap-2 p-4 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-club-gold text-brand-deep"><FaLock size={22} /></span>
                    <span className="display text-2xl">Exclusivo para sócios</span>
                    <Link href="/socio" className="btn btn-accent btn-sm mt-1">Seja sócio e veja</Link>
                </div>
            ) : img ? (
                <div className="relative aspect-video bg-surface-alt">
                    <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {post.imageUrls.length > 1 && (
                        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                            {post.imageUrls.map((_, i) => (
                                <button key={i} type="button" onClick={() => setImgIdx(i)} aria-label={`Imagem ${i + 1}`}
                                    className={`h-2.5 w-2.5 rounded-full border border-surface ${i === imgIdx ? 'bg-surface' : 'bg-ink/40'}`} />
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
            <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    {post.pinned && <span className="inline-flex items-center gap-1 font-semibold text-club-red"><FaThumbtack /> Fixado</span>}
                    {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                    {post.visibility !== 'PUBLIC' && <span className="inline-flex items-center gap-1 rounded-full bg-club-gold px-2 py-0.5 font-bold text-brand-deep"><FaLock size={10} /> Sócios</span>}
                </div>
                <h3 className="text-lg font-bold leading-snug text-brand-deep">{post.title}</h3>
                {post.locked ? (
                    <p className="text-sm text-ink-muted">Este conteúdo é exclusivo para sócios{post.minTierLevel ? ' de planos selecionados' : ''}. <Link href="/socio" className="font-semibold text-brand hover:underline">Conheça os planos</Link>.</p>
                ) : (
                    <>
                        <p className="whitespace-pre-line text-sm text-ink">{body}</p>
                        {!compact && long && (
                            <button type="button" className="self-start text-sm font-semibold text-brand hover:underline" onClick={() => setExpanded(x => !x)}>
                                {expanded ? 'Mostrar menos' : 'Ler mais'}
                            </button>
                        )}
                    </>
                )}
                {post.event && (
                    <Link href={`/jogos/${post.event.slug}`} className="mt-auto pt-2 text-sm font-semibold text-brand hover:underline">{post.event.title} →</Link>
                )}
            </div>
        </article>
    );
}
