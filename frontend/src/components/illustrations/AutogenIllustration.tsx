/**
 * Waiting on an AI itinerary (A1): a paper plane over a folded map. Motion lives in globals.css.
 * Plane and clouds move inside their own <div> because only an HTML box animates on the compositor;
 * a moving <svg> or <g> costs the main thread every frame, for the 1-3 minutes this stays on screen.
 */
export function AutogenIllustration({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`} aria-hidden="true">
      <div className="autogen-clouds absolute inset-0">
        <svg viewBox="0 0 200 200" className="size-full fill-primary-soft" focusable="false">
          <rect x="20" y="62" width="44" height="12" rx="6" />
          <rect x="32" y="52" width="22" height="14" rx="7" />
          <rect x="148" y="84" width="32" height="9" rx="4.5" />
        </svg>
      </div>
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 size-full"
        strokeLinejoin="round"
        strokeLinecap="round"
        focusable="false"
      >
        <path
          d="M24 122 76 104l48 16 52-18v56l-52 18-48-16-52 18z"
          strokeWidth="4"
          className="fill-primary-soft stroke-primary-soft"
        />
        {/* Group opacity so the rounded stroke does not double up over the fill. */}
        <g opacity=".22">
          <path d="M76 104l48 16v56l-48-16z" strokeWidth="4" className="fill-cat-stay stroke-cat-stay" />
        </g>
        <path
          d="M46 158c14-24 28-20 42-10s28 8 38-4 16-10 22-11"
          fill="none"
          strokeWidth="3"
          strokeDasharray="1 8"
          className="stroke-cat-stay"
        />
        <circle cx="44" cy="158" r="4.5" className="fill-cat-stay" />
        <path
          d="M152 134c-8-9-12-14-12-20a12 12 0 0 1 24 0c0 6-4 11-12 20z"
          strokeWidth="2"
          className="fill-cat-food stroke-cat-food"
        />
        <circle cx="152" cy="114" r="4.5" className="fill-card" />
      </svg>
      <div className="autogen-plane absolute inset-0">
        <svg viewBox="0 0 200 200" className="size-full" strokeLinejoin="round" strokeWidth="3" focusable="false">
          <path d="M86 69 98 90l3-17z" className="fill-primary stroke-primary" />
          <path d="M138 34 66 55l20 14z" className="fill-cat-stay stroke-cat-stay" />
          <path d="M138 34 101 73l15 19z" className="fill-cat-stay stroke-cat-stay" />
          <path d="M138 34 86 69l15 4z" className="fill-primary stroke-primary" />
        </svg>
      </div>
    </div>
  )
}
