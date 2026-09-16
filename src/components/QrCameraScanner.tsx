import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState } from 'react'

interface QrCameraScannerProps {
  onDecode: (text: string) => void
  active: boolean
}

/**
 * Live in-app camera QR reader — the first one in this codebase. Every QR
 * elsewhere in the app is a deep link meant for the phone's native camera
 * app; this decodes the same links without leaving the page, for the WO
 * part-replacement flow where staying inside the popup matters.
 */
export function QrCameraScanner({ onDecode, active }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !videoRef.current) return

    const scanner = new QrScanner(videoRef.current, (result) => onDecode(result.data), {
      highlightScanRegion: true,
      highlightCodeOutline: true,
      preferredCamera: 'environment',
    })
    scannerRef.current = scanner

    scanner.start().catch(() => {
      setError('Tidak bisa mengakses kamera. Periksa izin kamera di browser.')
    })

    return () => {
      scanner.stop()
      scanner.destroy()
      scannerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <div className="overflow-hidden rounded-md bg-black">
      <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
    </div>
  )
}
