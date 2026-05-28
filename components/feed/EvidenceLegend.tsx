const LEVELS = [
  { label: 'RCT / Meta', desc: 'Randomized trial or meta-analysis', classes: 'bg-green-100 text-green-800' },
  { label: 'Cohort', desc: 'Controlled observational study', classes: 'bg-blue-100 text-blue-800' },
  { label: 'Case study', desc: 'Small-sample or case report', classes: 'bg-yellow-100 text-yellow-800' },
  { label: 'Mechanistic', desc: 'Review or mechanistic paper', classes: 'bg-gray-100 text-gray-700' },
]

export function EvidenceLegend() {
  return (
    <div className="mt-10 pt-6 border-t">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Evidence levels</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {LEVELS.map(({ label, desc, classes }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${classes}`}>{label}</span>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
