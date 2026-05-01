import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-fredo-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 20%, #ffffff44, transparent 50%)' }} />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-md bg-white text-fredo-800 grid place-items-center text-sm font-bold">FC</div>
            FredoCloud Team Hub
          </Link>
        </div>
        <div className="relative">
          <p className="text-2xl font-semibold leading-snug max-w-md">
            "The best teams turn updates into decisions in minutes, not days."
          </p>
          <p className="mt-3 text-sm opacity-80">— a thing someone might've said</p>
        </div>
        <div className="relative text-xs opacity-70">© FredoCloud — assessment build</div>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex-1 grid place-items-center px-6 pb-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
