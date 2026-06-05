'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface Paper {
  id: string
  title: string
  summary: string
  sport: string[]
  body_regions: string[]
  evidence_level: string
}

interface WheelComponentProps {
  papers: Paper[]
  onSpin: (paper: Paper) => void
  isSpinning: boolean
}

const COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#0d9488', '#059669', '#7c2d12']

export function WheelComponent({ papers, onSpin, isSpinning }: WheelComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wheelRotationRef = useRef(0)

  useEffect(() => {
    drawWheel()
  }, [papers])

  function drawWheel() {
    const canvas = canvasRef.current
    if (!canvas || papers.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    // Clear canvas
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw wheel with current rotation
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((wheelRotationRef.current * Math.PI) / 180)

    const sliceAngle = 360 / papers.length

    papers.forEach((paper, index) => {
      const startAngle = (index * sliceAngle * Math.PI) / 180
      const endAngle = ((index + 1) * sliceAngle * Math.PI) / 180

      // Draw segment
      ctx.fillStyle = COLORS[index % COLORS.length]
      ctx.beginPath()
      ctx.arc(0, 0, radius, startAngle, endAngle)
      ctx.lineTo(0, 0)
      ctx.fill()

      // Draw border
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, radius, startAngle, endAngle)
      ctx.lineTo(0, 0)
      ctx.stroke()

      // Draw text (paper index)
      const textAngle = startAngle + (endAngle - startAngle) / 2
      const textX = Math.cos(textAngle) * (radius * 0.65)
      const textY = Math.sin(textAngle) * (radius * 0.65)

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle + Math.PI / 2)
      ctx.fillText(`${index + 1}`, 0, 0)
      ctx.restore()
    })

    ctx.restore()

    // Draw center circle
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw pointer (top)
    ctx.fillStyle = '#2563eb'
    ctx.beginPath()
    ctx.moveTo(centerX, 10)
    ctx.lineTo(centerX - 12, 40)
    ctx.lineTo(centerX + 12, 40)
    ctx.fill()
  }

  function handleSpin() {
    if (isSpinning || papers.length === 0) return

    const randomIndex = Math.floor(Math.random() * papers.length)
    const sliceAngle = 360 / papers.length
    const targetAngle = randomIndex * sliceAngle

    // Random extra rotations (2-5 full rotations)
    const extraRotations = (2 + Math.random() * 3) * 360
    const finalAngle = wheelRotationRef.current + extraRotations + (360 - targetAngle)

    // Spin animation with easing
    gsap.to(wheelRotationRef, {
      current: finalAngle,
      duration: 3.5,
      ease: 'power2.out',
      onUpdate: drawWheel,
      onComplete: () => {
        wheelRotationRef.current = finalAngle % 360
        drawWheel()
        onSpin(papers[randomIndex])
      },
    })
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-80 h-80 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="cursor-pointer rounded-full shadow-lg"
          onClick={handleSpin}
          style={{ border: '4px solid #e5e7eb' }}
        />
      </div>
      <p className="text-sm text-gray-500">Click the wheel or use the button below to spin</p>
    </div>
  )
}
