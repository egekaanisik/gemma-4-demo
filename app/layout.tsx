import type { Metadata } from 'next';
import { Google_Sans, Google_Sans_Code } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';

const googleSans = Google_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-google-sans',
  adjustFontFallback: false,
});

const googleSansCode = Google_Sans_Code({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-google-sans-code',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'Gemma 4 Demo',
  description: 'A high-performance, private, on-device AI chat application featuring Gemma 4 E4B, running entirely in your browser with no data leaving your device.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gemma 4',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport = {
  themeColor: '#2E96FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(googleSans.variable, googleSansCode.variable)}>
      <body suppressHydrationWarning className="font-sans">{children}</body>
    </html>
  );
}
