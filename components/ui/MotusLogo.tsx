export function MotusLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
      {/* Vitruvian circle */}
      <circle cx="16" cy="16" r="13.5" fill="none" stroke="#9B8060" strokeWidth="1.25" opacity="0.85" />
      {/* Measurement reference lines (da Vinci crosshair) */}
      <line x1="2.5" y1="16" x2="29.5" y2="16" stroke="#9B8060" strokeWidth="0.55" opacity="0.38" />
      <line x1="16" y1="2.5" x2="16" y2="29.5" stroke="#9B8060" strokeWidth="0.55" opacity="0.38" />
      {/* Running figure — darker sepia ink */}
      <circle cx="16.5" cy="5.2" r="2.1" fill="none" stroke="#3D2B1A" strokeWidth="1.1" />
      {/* Torso — forward lean */}
      <line x1="16.5" y1="7.3" x2="15" y2="16" stroke="#3D2B1A" strokeWidth="1.25" strokeLinecap="round" />
      {/* Right arm — forward and up */}
      <line x1="15.8" y1="9.5" x2="21.5" y2="7.5" stroke="#3D2B1A" strokeWidth="1.05" strokeLinecap="round" />
      {/* Left arm — back and down */}
      <line x1="15.8" y1="9.5" x2="10.5" y2="12" stroke="#3D2B1A" strokeWidth="1.05" strokeLinecap="round" />
      {/* Right leg — forward stride, knee raised, foot strike */}
      <polyline points="15,16 19.5,22 22.5,27.5" stroke="#3D2B1A" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Left leg — back push-off, extended */}
      <polyline points="15,16 11,22 9,27.5" stroke="#3D2B1A" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
