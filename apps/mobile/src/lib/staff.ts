/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Tipos das rotas de staff (portaria) que não estão no @filt/shared
 */
import type { CheckInResult, EventCounters, EventStatus, MembershipStatus, TicketOrigin, TicketStatus, TicketTypeDTO, TicketDTO } from '@filt/shared';

/** GET staff/events/[id] */
export type StaffEventPanel = {
    id: number; slug: string; title: string; startsAt: string; venue: string | null; status: EventStatus;
    capacity: number | null; memberCapacity: number | null;
    counters: EventCounters;
    ticketTypes: (TicketTypeDTO & { quantity: number, allocated: number })[];
    ticketsByOrigin: Partial<Record<TicketOrigin, number>>;
    /** só com events.read / checkin.reports */
    checkinsByResult?: Partial<Record<CheckInResult, number>>;
};

/** GET staff/events/[id]/search?q= */
export type AttendeeSearch = {
    tickets: { id: number, holderName: string, cpfMasked: string, ticketTypeName: string | null, status: TicketStatus, origin: TicketOrigin, usedAt: string | null }[];
    members: { membershipId: number, name: string, memberNumber: number | null, planName: string, status: MembershipStatus, cpfMasked: string, photoUrl: string | null }[];
};

/** GET staff/events/[id]/checkins */
export type CheckInLog = { id: string, result: CheckInResult, label: string, createdAt: string, operator: string, name: string | null, kind: 'ticket' | 'member' | null, deviceId: string | null };

/** POST staff/events/[id]/sell */
export type GateSaleResult = { orderCode: string, totalCents: number, tickets: TicketDTO[] };
