import Link from 'next/link';
import { buttonClasses } from '@/components/ui';

export default function RootNotFound() {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen bg-[#07080B] text-white flex items-center justify-center p-6" suppressHydrationWarning>
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#E6C687]">404</h1>
          <p className="text-sm text-neutral-400">Sahifa topilmadi</p>
          <Link
            href="/uz"
            className={buttonClasses({ size: 'sm' })}
          >
            Bosh sahifaga qaytish
          </Link>
        </div>
      </body>
    </html>
  );
}
