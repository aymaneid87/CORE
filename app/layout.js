import { Cairo, Tajawal } from 'next/font/google';
import './globals.css';

// الخطوط بتتحمّل من سيرفر الموقع نفسه (بدل ما الصفحة تستنى Google Fonts)
// وده بيمنع إن الصفحة "تتنطط" أو تهنّج أول ما تفتح على الموبايل
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['700', '800'],
  display: 'swap',
  variable: '--font-cairo',
});
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
});

export const metadata = {
  title: 'ميزان — إدارة مشاريع التشطيبات',
  description: 'تتبع كل جنيه داخل وخارج لكل مشاريعك في مكان واحد.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F5F1E8',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${tajawal.variable}`}>
      <body>{children}</body>
    </html>
  );
}
