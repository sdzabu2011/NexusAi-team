import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NexusAI Team',
  description: 'AI Autonomous Coding Team Visualizer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
