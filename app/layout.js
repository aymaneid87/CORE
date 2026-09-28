import './globals.css';
import { BRAND } from '../lib/brand';

export const metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: 'تتبع كل جنيه داخل وخارج لكل مشاريعك في مكان واحد.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
