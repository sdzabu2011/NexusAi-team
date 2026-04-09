// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default:  'NexusAI Team',
    template: '%s — NexusAI',
  },
  description:
    '15 specialized AI agents building real code in real-time. ' +
    'Powered by OpenRouter free models.',
  keywords: [
    'AI', 'agents', 'code generation',
    'OpenRouter', 'Next.js', 'free models',
  ],
  openGraph: {
    type:        'website',
    siteName:    'NexusAI Team',
    title:       'NexusAI Team — 15 AI Agents',
    description: 'Watch 15 AI agents build a full project together in real-time.',
    url:         'https://nexusai-team.onrender.com',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'NexusAI Team',
    description: '15 AI agents · Real code · Free models',
  },
  robots: {
    index:  true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#0a0a0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-nexus-bg text-white antialiased overflow-hidden h-screen">
        {children}
      </body>
    </html>
  );
}