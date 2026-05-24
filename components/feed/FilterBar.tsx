'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import type { SportName } from '@/types/supabase'

const SPORTS: SportName[] = ['running', 'cycling', 'rowing', 'skiing', 'hyrox', 'inline_skating']

export function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const activeSport = params.get('sport')

  function toggleSport(sport: string) {
    const next = new URLSearchParams(params.toString())
    if (activeSport === sport) {
      next.delete('sport')
    } else {
      next.set('sport', sport)
    }
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2 pb-4">
      {SPORTS.map((sport) => (
        <Badge
          key={sport}
          variant={activeSport === sport ? 'default' : 'outline'}
          className="cursor-pointer capitalize"
          onClick={() => toggleSport(sport)}
        >
          {sport.replace('_', ' ')}
        </Badge>
      ))}
    </div>
  )
}
