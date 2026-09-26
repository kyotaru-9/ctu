import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Alert, Button, Form, DropdownButton, Dropdown } from 'react-bootstrap'
import { biCamera, biXCircle, biArrowRepeat, biCameraVideo } from '../utils/icons'

const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: { ideal: 'environment' }
}

const CAPTURE_QUALITY = 0.85

export function useCamera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [showCamera, setShowCamera] = useState(false)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Enumerate video input devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      setDevices(videoDevices)
      
      // Prefer back-facing camera
      const backCamera = videoDevices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      )
      if (backCamera) {
        setSelectedDeviceId(backCamera.deviceId)
      } else if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    } catch (err) {
      console.error('[Camera] Device enumeration failed:', err)
    }
  }, [])

  useEffect(() => {
    enumerateDevices()
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices)
  }, [enumerateDevices])

  const startCamera = useCallback(async (options = {}) => {
    const { facingMode = 'environment', deviceId, onReady } = options
    
    try {
      setIsLoading(true)
      setError('')
      
      // Check HTTPS/localhost requirement
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Camera requires HTTPS or localhost')
      }
      
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...VIDEO_CONSTRAINTS,
            deviceId: { ideal: deviceId || selectedDeviceId }
          }
        })
      } catch (e) {
        console.log('[Camera] Constrained request failed, trying basic...', e)
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      
      console.log('[Camera] Stream obtained:', stream)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowCamera(true)
        
        // Ensure video plays after metadata loads
        videoRef.current.onloadedmetadata = async () => {
          console.log('[Camera] Video metadata loaded:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
          try {
            await videoRef.current.play()
            console.log('[Camera] Video playing')
            onReady?.()
          } catch (e) {
            console.error('[Camera] Play failed:', e)
          }
        }
      }
      
      return stream
    } catch (err) {
      console.error('[Camera] Access error:', err)
      let message = 'Camera access denied'
      if (err.name === 'NotAllowedError') message = 'Camera permission denied'
      else if (err.name === 'NotFoundError') message = 'No camera found'
      else if (err.name === 'NotReadableError') message = 'Camera in use by another app'
      else if (err.name === 'OverconstrainedError') message = 'Camera constraints not supported'
      else if (err.message.includes('HTTPS')) message = 'Camera requires HTTPS or localhost'
      else message = err.message
      
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [selectedDeviceId])

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
          resolve(file)
        } else {
          resolve(null)
        }
      }, 'image/jpeg', CAPTURE_QUALITY)
    })
  }, [])

  const getDataUrl = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return null
    
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (!video.videoWidth || !video.videoHeight) return null
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    return canvas.toDataURL('image/jpeg', CAPTURE_QUALITY)
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const hasMultipleCameras = devices.length > 1

  return {
    videoRef,
    canvasRef,
    streamRef,
    showCamera,
    setShowCamera,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    error,
    setError,
    isLoading,
    hasMultipleCameras,
    startCamera,
    stopCamera,
    capturePhoto,
    getDataUrl,
    isActive: showCamera
  }
}

export function CameraInline({ 
  onCapture, 
  facingMode = 'environment',
  placeholder = 'Click to open camera',
  className = '',
  showDeviceSelector = true,
  autoStart = false
}) {
  const { 
    videoRef, 
    canvasRef, 
    showCamera, 
    error, 
    isLoading,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    startCamera, 
    stopCamera, 
    capturePhoto,
    hasMultipleCameras
  } = useCamera()

  // Auto-start camera if autoStart is true
  useEffect(() => {
    if (autoStart && !showCamera && !isLoading) {
      startCamera({ facingMode: 'environment' })
    }
  }, [autoStart, showCamera, isLoading, startCamera])

  return (
    <div className={className}>
      {showCamera ? (
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <div className="position-relative mb-2">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              style={{ width: '100%', maxHeight: '300px', borderRadius: '8px', backgroundColor: '#000', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minHeight: '200px' }} 
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {error && (
              <div className="position-absolute top-0 start-0 end-0 p-2 text-white bg-danger bg-opacity-75 text-center small">
                {error}
              </div>
            )}
          </div>
          
          {showDeviceSelector && devices.length > 1 && (
            <DropdownButton
              as={Form.Control}
              variant="outline-secondary"
              size="sm"
              title={`Camera: ${devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Default'}`}
              id="camera-selector"
              menuRole="menu"
              onSelect={setSelectedDeviceId}
              className="mb-2 w-100"
            >
              {devices.map(device => (
                <Dropdown.Item key={device.deviceId} active={device.deviceId === selectedDeviceId} onSelect={() => setSelectedDeviceId(device.deviceId)}>
                  {device.label || `Camera ${devices.indexOf(device) + 1}`}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          )}
          
          <div className="mt-3 d-flex gap-2 justify-content-center">
            <button 
              className="btn btn-primary" 
              onClick={async () => {
                const file = await capturePhoto()
                if (file) onCapture(file)
              }} 
              disabled={!videoRef.current?.videoWidth}
            >
              <i className="bi bi-camera me-1"></i> Capture
            </button>
            <button className="btn btn-secondary" onClick={stopCamera}>
              <i className="bi bi-x-circle me-1"></i> Cancel
            </button>
          </div>
          <div className="mt-2 text-muted small">
            Position the subject in the frame
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          {error && <Alert variant="danger" className="mb-2">{error}</Alert>}
          <i className="bi bi-camera-video fs-1 text-muted"></i>
          <p className="mt-2 text-muted">{placeholder}</p>
          <button className="btn btn-outline-primary" onClick={() => startCamera({ facingMode: 'environment' })} disabled={isLoading}>
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
          </button>
        </div>
      )}
    </div>
  )
}

export function CameraModal({ 
  isOpen, 
  onClose, 
  onCapture, 
  facingMode = 'environment',
  title = 'Camera'
}) {
  const { 
    videoRef, 
    canvasRef, 
    showCamera, 
    error, 
    isLoading,
    startCamera, 
    stopCamera, 
    capturePhoto 
  } = useCamera()

  useEffect(() => {
    if (isOpen) {
      startCamera({ facingMode, onReady: () => {} })
    } else {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera])

  const handleCapture = async () => {
    const file = await capturePhoto()
    if (file) {
      onCapture(file)
      stopCamera()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="camera-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.95)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <button className="btn btn-secondary" onClick={() => { stopCamera(); onClose(); }} style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none' }}>
          <i className="bi bi-x-circle fs-4"></i>
        </button>
      </div>
      
      <div style={{ maxWidth: '100%', maxHeight: '80vh', textAlign: 'center' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', backgroundColor: '#000', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div className="mt-3 d-flex gap-3 justify-content-center">
          <button 
            className="btn btn-primary btn-lg" 
            onClick={handleCapture}
            disabled={false}
            style={{ minWidth: '150px' }}
          >
            <i className="bi bi-camera me-2"></i> Capture
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => { stopCamera(); onClose(); }} style={{ minWidth: '150px' }}>
            <i className="bi bi-x-circle me-2"></i> Cancel
          </button>
        </div>
        <div className="mt-3 text-white-50 small">
          Position the subject in the frame
        </div>
      </div>
    </div>
  )
}

export function PhotoPreview({ 
  imageUrl, 
  onRetake, 
  onUse, 
  className = ''
}) {
  return (
    <div className={`photo-preview ${className}`} style={{ maxWidth: '100%', textAlign: 'center' }}>
      <div className="position-relative d-inline-block mb-3">
        <img src={imageUrl} alt="Preview" className="img-fluid rounded shadow" style={{ maxHeight: '300px', maxWidth: '100%' }} />
      </div>
      <div className="d-flex gap-3 justify-content-center">
        <button className="btn btn-secondary" onClick={onRetake}>
          <i className="bi bi-x-circle me-1"></i> Retake
        </button>
        <button className="btn btn-primary" onClick={onUse}>
          <i className="bi bi-check-circle me-1"></i> Use Photo
        </button>
      </div>
    </div>
  )
}

export function useCameraCapture() {
  const camera = useCamera()
  
  const openCamera = useCallback((options) => {
    return camera.startCamera(options)
  }, [camera])
  
  const closeCamera = useCallback(() => {
    camera.stopCamera()
  }, [camera])
  
  const takePhoto = useCallback(async () => {
    const file = await camera.capturePhoto()
    if (file) {
      camera.stopCamera()
    }
    return file
  }, [camera])
  
  return {
    ...camera,
    openCamera,
    closeCamera,
    takePhoto
  }
}