import Link from 'next/link'
import { MotusLogo } from '@/components/ui/MotusLogo'

export function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/new" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <MotusLogo size={26} />
          Motus
        </Link>
        <nav className="flex gap-6 text-sm font-medium">
          <Link href="/new" className="text-gray-600 hover:text-gray-900 transition-colors">
            New
          </Link>
          <Link href="/for-you" className="text-gray-600 hover:text-gray-900 transition-colors">
            For You
          </Link>
          <Link href="/explore" className="text-gray-600 hover:text-gray-900 transition-colors">
            Explore
          </Link>
          <Link href="/about" className="text-gray-400 hover:text-gray-900 transition-colors">
            About
          </Link>
        </nav>
      </div>
    </header>
  )
}
