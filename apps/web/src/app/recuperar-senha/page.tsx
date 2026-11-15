/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Recuperar senha
 */
import type { Metadata } from 'next';
import { ForgotPassword } from '@/views/Auth';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function Page() { return <ForgotPassword />; }
