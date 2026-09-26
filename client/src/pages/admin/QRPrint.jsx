import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { roomService } from '../../services/roomService'
import { biArrowLeft, biDownload, biPrinter } from '../../utils/icons'
import {
  Alert,
  Button,
  Card,
  CardBody,
  DetailList,
  PageHeader,
  SkeletonCards,
  SkeletonPage,
} from '../../components/ui'

export default function AdminQRPrint() {
  const { roomId } = useParams()
  const [room, setRoom] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchRoom() {
      try {
        const response = await roomService.getById(roomId)
        if (cancelled) return

        if (response.success) {
          setRoom(response.data)
        } else {
          setError(response.message || 'Room not found')
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load room')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRoom()
    return () => {
      cancelled = true
    }
  }, [roomId])

  useEffect(() => {
    if (!room) return

    let cancelled = false
    QRCode.toDataURL(`${window.location.origin}/scan/${room.qr_token}`, { width: 640, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [room])

  function handleDownload() {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `QR_${room.room_code}.png`
    link.click()
  }

  if (loading) {
    return <SkeletonPage><SkeletonCards count={2} columns={2} /></SkeletonPage>
  }

  if (error || !room) {
    return (
      <>
        <PageHeader title="QR print sheet" />
        <Alert tone="bad">{error || 'Room not found.'}</Alert>
        <Link
          to="/admin/rooms"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <i className={biArrowLeft} aria-hidden="true" />
          Back to rooms
        </Link>
      </>
    )
  }

  const qrUrl = `${window.location.origin}/scan/${room.qr_token}`

  return (
    <>
      <div className="no-print mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/admin/rooms"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <i className={biArrowLeft} aria-hidden="true" />
          Back to rooms
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" icon={biPrinter} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="primary" icon={biDownload} onClick={handleDownload} disabled={!qrDataUrl}>
            Download QR
          </Button>
        </div>
      </div>

      {/* The sheet itself: sized for a 4×6 label, chrome stripped when printing. */}
      <Card className="print-sheet mx-auto max-w-md">
        <CardBody className="flex flex-col items-center p-8 text-center">
          <i className="bi bi-building-fill mb-4 text-3xl text-accent" aria-hidden="true" />
          <h1 className="text-base font-semibold tracking-wide text-ink uppercase">
              CTU
            </h1>
          <p className="mt-1 text-xs text-ink-muted">Classroom cleanliness monitoring</p>

          <div className="my-6 w-full rounded-md border border-line bg-surface-sunken p-4 text-start">
            <DetailList
              columns={1}
              items={[
                { label: 'Room', value: room.room_name },
                { label: 'Room code', value: room.room_code },
                {
                  label: 'Location',
                  value: [room.building, room.floor && `Floor ${room.floor}`]
                    .filter(Boolean)
                    .join(', '),
                },
              ]}
            />
          </div>

          <div className="qr-frame">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for room ${room.room_code}`}
                className="h-auto w-56"
              />
            ) : (
              <div className="grid h-56 w-56 place-items-center rounded-md bg-surface-sunken text-sm text-ink-muted">
                Generating…
              </div>
            )}
          </div>

          <p className="mt-6 text-sm text-ink">Scan before submitting the room condition.</p>
          <p className="mt-1 font-mono text-[0.6875rem] break-all text-ink-subtle">{qrUrl}</p>
        </CardBody>
      </Card>
    </>
  )
}
