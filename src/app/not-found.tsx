import Link from 'next/link';

export default function RootNotFound() {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen bg-[#07080B] text-white flex items-center justify-center p-6" suppressHydrationWarning>
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#E6C687]">404</h1>
          <p className="text-sm text-neutral-400">Sahifa topilmadi</p>
          <Link
            href="/uz"
            className="inline-block rounded-full bg-gold-500 px-6 py-2.5 text-xs font-bold text-black"
          >
            Bosh sahifaga qaytish
          </Link>
        </div>
      </body>
    </html>
  );
}
