// Bring in design tokens first so your own CSS can override them if needed
import '@atmos/tokens/dist/tokens-base.css';
import '@atmos/tokens/dist/tokens-dark.css';
import '@atmos/tokens/dist/tokens-light.css';

// Then your global styles
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// Plain JS metadata object (no TS types)
export const metadata = {
  title: 'AtmosInsight',
  description: 'Prototype UI shell',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-dark">
      {/* switch to theme-light to change theme */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}
