/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Escalação publicada do jogo (futsal: titulares e reservas, capitão)
 */
import { LABELS, type LineupDTO } from '@filt/shared';
import { Avatar } from '@/components/site/Avatar';

type Entry = LineupDTO['entries'][number];

function PlayerRow({ p }: { p: Entry }) {
    return (
        <li className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
            <span className="display w-9 text-center text-2xl text-brand">{p.number ?? '-'}</span>
            <Avatar name={p.nickname || p.name} photoUrl={p.photoUrl} size={40} />
            <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.nickname || p.name}</div>
                <div className="text-xs text-ink-muted">{p.slot || LABELS.playerPosition[p.position]}</div>
            </div>
            {p.isCaptain && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-club-gold text-sm font-bold text-brand-deep" title="Capitão">C</span>}
        </li>
    );
}

export function Lineup({ lineup }: { lineup: LineupDTO }) {
    const starters = lineup.entries.filter(e => e.starter);
    const reserves = lineup.entries.filter(e => !e.starter);
    return (
        <section className="panel overflow-hidden">
            <div className="hero-blue flex items-center justify-between px-5 py-4">
                <h2 className="display text-3xl">Escalação</h2>
                {lineup.formation && <span className="display rounded bg-surface px-2 py-0.5 text-lg text-brand-deep">{lineup.formation}</span>}
            </div>
            <div className="club-stripes h-1.5" aria-hidden />
            <div className="grid gap-5 p-5 md:grid-cols-2">
                <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-club-red">Titulares</h3>
                    <ul className="flex flex-col gap-2">{starters.map(p => <PlayerRow key={p.playerId} p={p} />)}</ul>
                </div>
                {reserves.length > 0 && (
                    <div>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-ink-muted">Reservas</h3>
                        <ul className="flex flex-col gap-2">{reserves.map(p => <PlayerRow key={p.playerId} p={p} />)}</ul>
                    </div>
                )}
            </div>
            {lineup.notes && <p className="whitespace-pre-line border-t border-line px-5 py-4 text-sm text-ink-muted">{lineup.notes}</p>}
        </section>
    );
}
