'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Providers do client (sessão + toasts)
 */
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SessionProvider } from '@/hooks/useSession';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <ToastContainer position="bottom-right" autoClose={3500} newestOnTop hideProgressBar closeOnClick theme="colored" />
        </SessionProvider>
    );
}
