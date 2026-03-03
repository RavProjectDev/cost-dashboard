import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cost Dashboard',
  description: 'Unified AI & Cloud cost monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
