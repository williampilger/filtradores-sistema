/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Card de produto da loja
 */
import Link from 'next/link';
import { formatMoney, type ProductListItem } from '@filt/shared';
import { Badge } from '@/components/ui';
import { CLUB_SHORT } from './helpers';

export function ProductImagePlaceholder({ className = '' }: { className?: string }) {
    return (
        <div className={`hero-blue flex items-center justify-center ${className}`}>
            <span className="display text-4xl opacity-60">{CLUB_SHORT}</span>
        </div>
    );
}

export function ProductCard({ product }: { product: ProductListItem }) {
    return (
        <Link href={`/loja/${product.slug}`} className="panel group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
            <div className="relative aspect-square overflow-hidden bg-surface-alt">
                {product.imageUrl
                    ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    : <ProductImagePlaceholder className="h-full w-full" />}
                <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                    {product.fulfillment === 'ON_DEMAND' && <Badge tone="info">Sob encomenda</Badge>}
                    {product.soldOut && <Badge tone="danger">Esgotado</Badge>}
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
                {product.category && <span className="text-[11px] font-bold uppercase tracking-wider text-club-red">{product.category}</span>}
                <h3 className="line-clamp-2 font-semibold text-ink group-hover:text-brand">{product.name}</h3>
                <div className="mt-auto pt-1">
                    <span className="text-xs text-ink-muted">a partir de </span>
                    <span className="text-lg font-bold text-brand">{formatMoney(product.fromPriceCents)}</span>
                </div>
                {product.soldOut && product.waitlistEnabled && <span className="text-xs text-ink-muted">Entre na lista de espera</span>}
            </div>
        </Link>
    );
}
