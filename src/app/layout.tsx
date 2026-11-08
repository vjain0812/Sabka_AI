import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import { DISPLAY_BOOT } from '@/lib/display-boot';
import './globals.css';
import './catalog.css';
import './easy.css';
import './template.css';
import './brand.css';
import './a11y.css';

export const metadata: Metadata = {
  title: { default: 'SABKA AI — The right AI for your business', template: '%s | SABKA AI' },
  description:
    'A human-first path to discovering, comparing and adopting AI for your small business. Start with your business, your people and your priorities.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Applies saved display settings (larger text, contrast) before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_BOOT }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
