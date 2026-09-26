import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Alert } from 'react-bootstrap'
import { biCamera, biXCircle, biArrowRepeat } from '../utils/icons'

interface CameraCaptureProps {
  onCapture: (blob: Blob, dataUrl: string) => void
  facingMode?: 'environment' | 'user'
  className?: string
}

const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: { ideal: 'environment' }
}

const CAPTURE_QUALITY = 0.85

export function CameraCapture({ 
  onCapture, 
  facingMode = 'environment',
  className = ''
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [showCamera, setShowCamera] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Camera requires HTTPS or localhost')
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...VIDEO_CONSTRAINTS,
            facingMode: { ideal: facingMode }
          }
        })
      } catch (e) {
        console.log('[CameraCapture] Constrained request failed, trying basic...', e)
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }

      console.log('[CameraCapture] Stream obtained:', stream)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowCamera(true)

        videoRef.current.onloadedmetadata = async () => {
          console.log('[CameraCapture] Video metadata loaded:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
          try {
            await videoRef.current.play()
            console.log('[CameraCapture] Video playing')
          } catch (e) {
            console.error('[CameraCapture] Play failed:', e)
          }
        }
      }
    } catch (err) {
      console.error('[CameraCapture] Access error:', err)
      let message = 'Camera access denied'
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') message = 'Camera permission denied'
        else if (err.name === 'NotFoundError') message = 'No camera found'
        else if (err.name === 'NotReadableError') message = 'Camera in use by another app'
        else if (err.name === 'OverconstrainedError') message = 'Camera constraints not supported'
      } else if (err instanceof Error) {
        message = err.message
      }
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setShowCamera(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video.videoWidth || !video.videoHeight) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY)
          onCapture(blob, dataUrl)
        }
      },
      'image/jpeg',
      CAPTURE_QUALITY
    )
  }, [onCapture])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const handleRetake = useCallback(() => {
    stopCamera()
    setShowCamera(false)
  }, [stopCamera])

  if (showCamera) {
    return (
      <div className={className} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <div className="position-relative mb-2">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            style={{ 
              width: '100%', 
              maxHeight: '300px', 
              borderRadius: '8px', 
              backgroundColor: '#000', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minHeight: '200px',
              aspectRatio: '4/3'
            }} 
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {error && (
            <div className="position-absolute top-0 start-0 end-0 p-2 text-white bg-danger bg-opacity-75 text-center small">
              {error}
            </div>
          )}
        </div>

        <div className="mt-3 d-flex gap-2 justify-content-center">
          <Button 
            variant="primary" 
            size="lg"
            onClick={capturePhoto} 
            disabled={!videoRef.current?.videoWidth}
          >
            <i className={`bi ${biCamera} me-1`}></i> Capture
          </Button>
          <Button 
            variant="secondary" 
            size="lg" 
            onClick={handleRetake}
          >
            <i className={`bi ${biXCircle} me-1`}></i> Cancel
          </Button>
        </div>
        <div className="mt-2 text-muted small text-center">
          Position the subject in the frame
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      {error && <Alert variant="danger" className="mb-2">{error}</Alert>}
      <div className="text-center py-4">
        <i className="bi bi-camera-video fs-1 text-muted"></i>
        <p className="mt-2 text-muted">Click to open camera</p>
        <Button 
          variant="outline-primary" 
          size="lg"
          onClick={startCamera} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Starting...
            </>
          ) : (
            <>
              <i className="bi bi-camera me-1"></i> Open Camera
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export interface PhotoPreviewProps {
  dataUrl: string
  onRetake: () => void
  onUse: () => void
  className?: string
}

export function PhotoPreview({ 
  dataUrl, 
  onRetake, 
  onUse,
  className = ''
}: PhotoPreviewProps) {
  return (
    <div className={className} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <div className="position-relative mb-3">
        <img 
          src={dataUrl} 
          alt="Preview" 
          className="img-fluid rounded shadow" 
          style={{ 
            maxHeight: '300px', 
            maxWidth: '100%',
            aspectRatio: '4/3',
            objectFit: 'cover',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }} 
        />
      </div>

      <div className="d-flex gap-2 justify-content-center">
        <Button 
          variant="outline-secondary" 
          size="lg" 
          onClick={onRetake}
        >
          <i className={`bi ${biArrowRepeat} me-1`}></i> Retake
        </Button>
        <Button 
          variant="primary" 
          size="lg" 
          onClick={onUse}
        >
          <i className={`bi ${biCheckCircle} me-1`}></i> Use Photo
        </Button>
      </div>
      <div className="mt-2 text-muted small text-center">
        Tap Retake to capture again, or Use Photo to continue
      </div>
    </div>
  )
}

// Import biCheckCircle for PhotoPreview
import { biCheckCircle, biArrowRepeat } from '../utils/icons'