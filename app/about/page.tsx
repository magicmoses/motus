import Link from 'next/link'

export const metadata = {
  title: 'About — Motus',
}

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2 tracking-tight">About Motus</h1>
      <p className="text-gray-400 text-sm mb-10">Sports science research intelligence for endurance athletes</p>

      <div className="space-y-10 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">The Name</h2>
          <p>
            <em>Motus</em> is Latin for movement. It names what endurance athletes study, train, and obsess
            over — the physics and biology of the body in motion. It also describes what good research should
            do: move your understanding forward.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">What It Does</h2>
          <p>
            Motus indexes peer-reviewed sports science from PubMed, Semantic Scholar, and arXiv, then runs
            each paper through a lightweight AI pipeline that writes a plain-language summary and extracts
            structured tags: which sport, which body region, which physiological topic, what kind of study.
          </p>
          <p className="mt-3">
            The result is a searchable, filterable research feed built for the athlete who wants to
            understand the evidence — not just get told what to do.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Philosophy</h2>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-gray-300 mt-0.5">—</span>
              <span><strong className="text-gray-900">First-information focus.</strong> The summary tells
              you what the study found and why it matters for training. One click takes you to the original
              paper if you want to go deeper.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-gray-300 mt-0.5">—</span>
              <span><strong className="text-gray-900">Evidence levels matter.</strong> An RCT on 200 cyclists
              is not the same as a mechanistic review. Every paper is labeled so you can weigh the
              evidence yourself.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-gray-300 mt-0.5">—</span>
              <span><strong className="text-gray-900">Not a coach.</strong> Motus does not tell you what
              to do, when to do it, or how hard to push. It surfaces the research. You decide what to
              do with it.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-gray-300 mt-0.5">—</span>
              <span><strong className="text-gray-900">No paywalled content.</strong> Motus stores only
              title, abstract, authors, and metadata — never full papers or publisher HTML. Every
              summary is grounded in the abstract alone.</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Evidence Levels</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="inline-block w-24 shrink-0 px-2 py-0.5 rounded text-center text-xs font-medium bg-green-100 text-green-800">RCT / Meta</span>
              <span>Randomized controlled trial or meta-analysis — the strongest level of evidence for causal claims.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-24 shrink-0 px-2 py-0.5 rounded text-center text-xs font-medium bg-blue-100 text-blue-800">Cohort</span>
              <span>Cohort or controlled observational study — strong associations, but causation is harder to establish.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-24 shrink-0 px-2 py-0.5 rounded text-center text-xs font-medium bg-yellow-100 text-yellow-800">Case study</span>
              <span>Case study or small-sample experiment — useful for generating hypotheses, limited generalizability.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-24 shrink-0 px-2 py-0.5 rounded text-center text-xs font-medium bg-gray-100 text-gray-700">Mechanistic</span>
              <span>Mechanistic or narrative review — explains how something works, not whether it works in practice.</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Open Source</h2>
          <p>
            Motus is open source. The ingestion pipeline, the enrichment prompts, and the frontend are
            all available to inspect, fork, and build on. If you work in sports science, build tools
            for athletes, or just want to understand how the pipeline works — the code is there.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Stack</h2>
          <p className="text-sm">
            Next.js · Supabase · Anthropic API (Claude Haiku for enrichment)
            · PubMed · Semantic Scholar · arXiv · Railway · Vercel
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t">
        <Link href="/new" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
          ← Back to feed
        </Link>
      </div>
    </main>
  )
}
