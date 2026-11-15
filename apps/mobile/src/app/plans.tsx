/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Planos de sócio ("Seja sócio")
 */
import { PlansList } from '@/components/PlansList';
import { Display, HeroBlue, Screen, Txt } from '@/components/ui';
import { radius, spacing } from '@/theme';

export default function PlansScreen() {
    return (
        <Screen>
            <HeroBlue style={{ borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm }}>
                <Display size={32} color="brandInk">Seja sócio</Display>
                <Txt color="sidebarInk">Apoie o Filtradores no Gauchão de Futsal e ganhe vantagens em todos os jogos no Ginásio do Morangão.</Txt>
            </HeroBlue>
            <PlansList />
        </Screen>
    );
}
