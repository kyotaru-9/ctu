import DepthText from './DepthText'
import { Logo } from './ui'
import bg from '../assets/bg.jpg'

/**
 * Shared frame for the signed-out pages: the campus photo under an ink wash, the
 * brand lockup, and a single card centred beneath it.
 *
 * Login, the deactivated-account page and any future signed-out page all open
 * against the same background, so they read as one family rather than three
 * unrelated screens. The photo is faint texture, not the subject, so the blur and
 * scale that were covering the low-resolution source are not needed.
 */
export default function AuthShell({ children, width = 'max-w-sm' }) {
  return (
    <div className="relative min-h-dvh">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <img src={bg} alt="" className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-ink/85" />
      </div>

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className={width}>
          {/*
            Brand lockup, not the page heading, so the document keeps a single
            h1 and it is the task itself.
          */}
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size="xl" className="mb-4" />

            {/*
              DepthText ships tuned for dark backgrounds, so the stock
              near-white face is already right; the extrusion is a deeper brand
              blue so the letterforms read as extruded type rather than a soft
              glow. Depth is cut to a ~30px extrusion because the default, as deep
              as the word is tall, reads as a tunnel. autoOrbit is off so the mark
              sits still on a sign-in screen; pointer parallax still runs.
            */}
            <DepthText
              text="CTU"
              layers={30}
              depth={1.05}
              faceColor="#ffffff"
              depthColor="#0a3d8f"
              fontSize="clamp(2.75rem, 13vw, 5.5rem)"
              fontWeight={900}
              tilt={6}
              autoOrbit={false}
              shadow
            />

            <p className="mt-5 text-xs leading-relaxed text-white/55">
              Cebu Technological University - Naga Extension Campus
              <br />
              Clean Track Update
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
