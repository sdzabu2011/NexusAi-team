import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'NexusAI Team', template: '%s — NexusAI' },
  description: '15 AI agents building real code in real-time. Powered by OpenRouter & Groq free models.',
  keywords: ['AI', 'agents', 'code generation', 'OpenRouter', 'Groq', 'Next.js'],
  openGraph: {
    type: 'website',
    siteName: 'NexusAI Team',
    title: 'NexusAI Team — 15 AI Agents',
    description: 'Watch 15 specialized AI agents build a full project together.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-nexus-bg text-white antialiased overflow-hidden h-screen">
        {children}
      </body>
    </html>
  );
}
