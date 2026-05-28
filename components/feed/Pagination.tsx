import Link from 'next/link'

interface Props {
  page: number
  totalPages: number
  total: number
  pageSize: number
  basePath: string
  params: Record<string, string | undefined>
}

function href(basePath: string, params: Record<string, string | undefined>, p: number): string {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== 'page') next.set(k, v)
  }
  if (p > 1) next.set('page', String(p))
  const qs = next.toString()
  return `${basePath}${qs ? `?${qs}` : ''}`
}

export function Pagination({ page, totalPages, total, pageSize, basePath, params }: Props) {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const prevHref = page > 1 ? href(basePath, params, page - 1) : null
  const nextHref = page < totalPages ? href(basePath, params, page + 1) : null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 mt-2 border-t">
      <p className="text-sm text-gray-400 order-2 sm:order-1">
        {from}–{to} of {total} papers
      </p>
      <div className="flex items-center gap-2 order-1 sm:order-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 transition-colors"
          >
            ← Prev
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-sm text-gray-300 border rounded-md select-none">← Prev</span>
        )}
        <span className="text-sm text-gray-600 tabular-nums px-1">
          {page} / {totalPages}
        </span>
        {nextHref ? (
          <Link
            href={nextHref}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 transition-colors"
          >
            Next →
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-sm text-gray-300 border rounded-md select-none">Next →</span>
        )}
      </div>
    </div>
  )
}
