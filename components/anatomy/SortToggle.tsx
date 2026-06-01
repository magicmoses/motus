'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

type SortOption = 'newest' | 'best'

export function SortToggle({ sort }: { sort: SortOption }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  function setSort(value: SortOption) {
    const next = new URLSearchParams(params.toString())
    next.set('sort', value)
    next.delete('page')
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs shrink-0">
      {(['newest', 'best'] as SortOption[]).map((option) => (
        <button
          key={option}
          onClick={() => setSort(option)}
          className={`px-3 py-1 capitalize transition-colors ${
            sort === option
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {option === 'newest' ? 'Newest' : 'Most Cited'}
        </button>
      ))}
    </div>
  )
}
