import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Alert, Spinner } from 'react-bootstrap'
import { biCamera, biCheckCircle, biXCircle } from '../../utils/icons'

// CameraCapture Component - Live camera feed with capture functionality
export function CameraCapture({ onCapture, facingMode = 'environment', placeholder = 'Take a photo', autoStart = false }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [showCamera, setShowCamera] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Camera requires HTTPS or localhost')
      }
      
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 }
          }
        })
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      
      console.log('[CameraCapture] Stream obtained:', stream)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        console.log('[CameraCapture] Stream attached to video element')
        
        // Play the video
        videoRef.current.play().then(() => {
          console.log('[CameraCapture] Video playing successfully, size:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
        }).catch(err => {
          console.error('[CameraCapture] Play failed:', err)
        })
      } else {
        console.warn('[CameraCapture] Video ref is null, will retry on next render')
      }
    } catch (err) {
      console.error('[CameraCapture] Access error:', err)
      console.error('[CameraCapture] Error name:', err.name)
      console.error('[CameraCapture] Error message:', err.message)
      console.error('[CameraCapture] Error details:', JSON.stringify(err))
      let message = 'Camera access denied'
      if (err.name === 'NotAllowedError') message = 'Camera permission denied'
      else if (err.name === 'NotFoundError') message = 'No camera found'
      else if (err.name === 'NotReadableError') message = 'Camera in use by another app'
      else if (err.name === 'OverconstrainedError') message = 'Camera constraints not supported'
      else if (err.message && err.message.includes('HTTPS')) message = 'Camera requires HTTPS or localhost'
      else message = err.message || 'Unknown camera error'
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
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (!video.videoWidth || !video.videoHeight) return null
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
          const url = URL.createObjectURL(blob)
          resolve({ file, dataUrl: url })
        } else {
          resolve(null)
        }
      }, 'image/jpeg', 0.85)
    })
  }, [])

  const handleCapture = async () => {
    const result = await capturePhoto()
    if (result) {
      onCapture(result.file, result.dataUrl)
    }
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Auto-start camera when component mounts if autoStart is true
  useEffect(() => {
    if (autoStart && !streamRef.current && !error) {
      // First show the camera container so video element renders
      setShowCamera(true)
      
      // Then wait for video ref to be available before starting camera
      const timer = setTimeout(() => {
        if (videoRef.current) {
          startCamera()
        } else {
          console.warn('[CameraCapture] Video ref not available after delay, retrying...')
          // Retry with a longer delay
          const retryTimer = setTimeout(() => {
            if (videoRef.current) {
              startCamera()
            } else {
              console.error('[CameraCapture] Video ref still not available, giving up')
            }
          }, 200)
          return () => clearTimeout(retryTimer)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoStart, streamRef, error, startCamera])

  // Ensure video plays when camera becomes visible
  useEffect(() => {
    if (showCamera && videoRef.current) {
      console.log('[CameraCapture] Camera visible, attempting to play video')
      videoRef.current.play().catch(err => {
        console.error('[CameraCapture] Failed to play video on visibility change:', err)
      })
    }
  }, [showCamera])

  // Debug: log when video state changes
  useEffect(() => {
    if (videoRef.current) {
      const logState = () => console.log('[CameraCapture] Video state:', {
        readyState: videoRef.current.readyState,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        paused: videoRef.current.paused,
        ended: videoRef.current.ended
      })
      videoRef.current.addEventListener('loadedmetadata', logState)
      videoRef.current.addEventListener('play', logState)
      videoRef.current.addEventListener('pause', logState)
      return () => {
        videoRef.current.removeEventListener('loadedmetadata', logState)
        videoRef.current.removeEventListener('play', logState)
        videoRef.current.removeEventListener('pause', logState)
      }
    }
  }, [])

  return (
    <div className="camera-capture">
      {showCamera ? (
        <div className="camera-active w-full max-w-md mx-auto">
          <div className="relative mb-2">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full rounded-lg bg-black shadow-lg"
              style={{ 
                backgroundColor: '#000', 
                aspectRatio: '16/9',
                minHeight: '300px',
                maxHeight: '400px',
                objectFit: 'cover'
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
            {error && (
              <div className="absolute top-0 left-0 right-0 p-2 text-white bg-red-600/90 text-center text-sm rounded-t-lg">
                {error}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 justify-center mt-3">
            <button
              onClick={handleCapture}
              disabled={!streamRef.current || isLoading}
              className="btn-primary px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Processing...
                </>
              ) : (
                <>
                  <i className={`bi ${biCamera} me-1`}></i> Capture
                </>
              )}
            </button>
          </div>
          <p className="text-muted text-sm text-center mt-2">Position the subject in the frame</p>
        </div>
      ) : (
        <div className="camera-inactive text-center py-6">
          {error && <Alert variant="danger" className="mb-2">{error}</Alert>}
          <i className="bi bi-camera-video fs-1 text-muted mb-3"></i>
          <p className="text-muted mb-3">{placeholder}</p>
          <button
            onClick={startCamera}
            disabled={isLoading}
            className="btn-outline-primary px-6 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Starting...
              </>
            ) : (
              <>
                <i className={`bi ${biCamera} me-1`}></i> Open Camera
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// PhotoPreview Component - Shows captured photo with retake/cancel/submit actions
export function PhotoPreview({ dataUrl, onRetake, onCancel, onSubmit, title = 'Preview' }) {
  return (
    <div className="photo-preview text-center">
      <h5 className="mb-3">{title}</h5>
      <div className="mb-4">
        <img 
          src={dataUrl} 
          alt="Preview" 
          className="img-fluid rounded-lg shadow-lg max-h-[300px] mx-auto"
        />
      </div>
      <div className="d-flex gap-2 justify-content-center flex-wrap">
        <button
          onClick={onRetake}
          className="btn-secondary px-6 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <i className={`bi bi-arrow-clockwise me-1`}></i> Retake
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="btn-outline-danger px-6 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <i className={`bi ${biXCircle} me-1`}></i> Cancel
          </button>
        )}
        <button
          onClick={onSubmit}
          className="btn-primary px-6 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <i className={`bi ${biCheckCircle} me-1`}></i> Submit
        </button>
      </div>
    </div>
  )
}