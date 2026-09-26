import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button } from '../ui'

function friendlyError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
      return 'Camera permission was denied. Enable it in your browser settings and try again.'
    case 'NotFoundError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
      return 'The camera is already in use by another app.'
    case 'OverconstrainedError':
      return 'This camera does not support the requested settings.'
    default:
      return err?.message || 'The camera could not be started.'
  }
}

/** Live camera feed with a capture button. */
export function CameraCapture({ onCapture, facingMode = 'environment', autoStart = false }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  const start = useCallback(async () => {
    setError('')
    setBusy(true)

    try {
      if (!window.isSecureContext) {
        throw new Error('Camera access requires a secure (HTTPS) connection.')
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }

      streamRef.current = stream
      setActive(true)
    } catch (err) {
      setError(friendlyError(err))
      setActive(false)
    } finally {
      setBusy(false)
    }
  }, [facingMode])

  // Attach the stream once the <video> exists.
  useEffect(() => {
    if (active && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [active])

  useEffect(() => {
    if (autoStart) start()
  }, [autoStart, start])

  // Release the camera on unmount.
  useEffect(() => stop, [stop])

  async function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return

    setBusy(true)
    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85)
      )
      if (!blob) {
        setError('The photo could not be processed. Please try again.')
        return
      }

      stop()
      onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    } finally {
      setBusy(false)
    }
  }

  if (!active) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface-sunken px-6 py-12 text-center">
        {error ? (
          <Alert tone="bad" className="mb-5 w-full max-w-sm text-start">
            {error}
          </Alert>
        ) : (
          <span
            aria-hidden="true"
            className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-surface text-lg text-ink-subtle"
          >
            <i className="bi bi-camera-video-fill" />
          </span>
        )}

        <p className="text-sm text-ink-muted">Use your camera to photograph the room.</p>

        <Button
          variant="primary"
          size="lg"
          icon="bi bi-camera-fill"
          loading={busy}
          onClick={start}
          className="mt-5"
        >
          {error ? 'Try again' : 'Open camera'}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="camera-frame mb-4">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          icon="bi bi-camera-fill"
          loading={busy}
          onClick={handleCapture}
          disabled={!streamRef.current}
          className="w-full sm:w-auto"
        >
          Capture photo
        </Button>
        <p className="text-center text-xs text-ink-muted">
          Keep the whole room in frame and make sure it is well lit.
        </p>
      </div>
    </div>
  )
}

/** Captured photo with retake / cancel / confirm actions. */
export function PhotoPreview({ dataUrl, alt = 'Captured photo', onRetake, onCancel, onConfirm, busy }) {
  return (
    <div className="flex flex-col items-center">
      <img
        src={dataUrl}
        alt={alt}
        className="mb-5 max-h-96 w-auto max-w-full rounded-lg border border-line object-contain"
      />

      <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
        <Button variant="secondary" icon="bi bi-arrow-clockwise" onClick={onRetake} block>
          Retake
        </Button>
        {onCancel && (
          <Button variant="ghost" icon="bi bi-x-lg" onClick={onCancel} block>
            Cancel
          </Button>
        )}
        <Button variant="primary" icon="bi bi-check-lg" onClick={onConfirm} loading={busy} block>
          Use photo
        </Button>
      </div>
    </div>
  )
}

