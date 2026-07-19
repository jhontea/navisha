/**
 * Empty state SVG illustrations for the app.
 * Each illustration is composed of simple shapes with the chromatic color palette.
 * Kept inline so they participate in the bundle and can inherit currentColor.
 */

type IllustrationProps = {
  className?: string
  "aria-hidden"?: boolean
}

/** Travel-themed illustration: paper plane + dashed path + location pin. */
export function EmptyTripsIllustration({ className = "h-32 w-32", ...rest }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      {...rest}
    >
      {/* Soft circular background */}
      <circle cx="100" cy="100" r="86" fill="currentColor" className="text-primary/8" />
      <circle cx="100" cy="100" r="70" fill="currentColor" className="text-primary/5" />

      {/* Dashed travel path */}
      <path
        d="M40 145 Q 70 95, 100 110 T 165 60"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 6"
        className="text-primary/30"
      />

      {/* Location pin (destination) */}
      <g className="text-chromatic-aurora">
        <path
          d="M165 60 C 165 51, 158 44, 150 44 C 142 44, 135 51, 135 60 C 135 70, 150 88, 150 88 C 150 88, 165 70, 165 60 Z"
          fill="currentColor"
          opacity="0.85"
        />
        <circle cx="150" cy="60" r="5" fill="white" />
      </g>

      {/* Paper plane (origin) */}
      <g className="text-primary" transform="translate(28, 120) rotate(-15)">
        <path
          d="M0 12 L 28 0 L 18 26 L 12 16 Z"
          fill="currentColor"
        />
        <path
          d="M12 16 L 28 0"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* Small sparkle accents */}
      <circle cx="60" cy="55" r="2" className="text-chromatic-sunset" fill="currentColor" />
      <circle cx="140" cy="125" r="2" className="text-chromatic-ocean" fill="currentColor" />
      <circle cx="100" cy="160" r="1.5" className="text-chromatic-mint" fill="currentColor" />
    </svg>
  )
}

/** Budget-themed illustration: coin stack + receipt outline. */
export function EmptyBudgetIllustration({ className = "h-32 w-32", ...rest }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      {...rest}
    >
      <circle cx="100" cy="100" r="86" fill="currentColor" className="text-chromatic-mint/10" />
      <circle cx="100" cy="100" r="70" fill="currentColor" className="text-chromatic-mint/5" />

      {/* Receipt */}
      <g transform="translate(55, 45)">
        <rect
          x="0"
          y="0"
          width="90"
          height="110"
          rx="6"
          fill="currentColor"
          className="text-foreground/8"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M0 14 L 90 14"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground/20"
        />
        {/* Receipt lines */}
        <line x1="14" y1="32" x2="76" y2="32" stroke="currentColor" strokeWidth="2" className="text-foreground/15" strokeLinecap="round" />
        <line x1="14" y1="48" x2="76" y2="48" stroke="currentColor" strokeWidth="2" className="text-foreground/15" strokeLinecap="round" />
        <line x1="14" y1="64" x2="60" y2="64" stroke="currentColor" strokeWidth="2" className="text-foreground/15" strokeLinecap="round" />

        {/* Coin on top */}
        <g className="text-chromatic-sunset" transform="translate(35, 80)">
          <ellipse cx="10" cy="3" rx="10" ry="3" fill="currentColor" opacity="0.9" />
          <rect x="0" y="3" width="20" height="14" fill="currentColor" opacity="0.9" />
          <ellipse cx="10" cy="17" rx="10" ry="3" fill="currentColor" opacity="0.9" />
          <text x="10" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">$</text>
        </g>
      </g>

      {/* Sparkle accents */}
      <circle cx="45" cy="55" r="2" className="text-chromatic-aurora" fill="currentColor" />
      <circle cx="155" cy="140" r="2.5" className="text-chromatic-ocean" fill="currentColor" />
      <circle cx="160" cy="55" r="1.5" className="text-chromatic-sunset" fill="currentColor" />
    </svg>
  )
}

/** Transport-themed illustration: airplane + cloud. */
export function EmptyTransportIllustration({ className = "h-32 w-32", ...rest }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      {...rest}
    >
      <circle cx="100" cy="100" r="86" fill="currentColor" className="text-chromatic-ocean/10" />
      <circle cx="100" cy="100" r="70" fill="currentColor" className="text-chromatic-ocean/5" />

      {/* Cloud (background) */}
      <g className="text-foreground/10" transform="translate(20, 40)">
        <ellipse cx="20" cy="20" rx="20" ry="10" fill="currentColor" />
        <ellipse cx="40" cy="15" rx="15" ry="8" fill="currentColor" />
        <ellipse cx="55" cy="22" rx="12" ry="6" fill="currentColor" />
      </g>

      {/* Airplane */}
      <g className="text-chromatic-ocean" transform="translate(50, 80) rotate(-20 50 25)">
        <path
          d="M0 25 L 100 0 L 90 25 L 100 50 L 60 35 L 30 50 L 40 25 Z"
          fill="currentColor"
        />
        <path
          d="M40 25 L 90 25"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.6"
        />
      </g>

      {/* Trail dots */}
      <circle cx="40" cy="140" r="2" className="text-chromatic-ocean/50" fill="currentColor" />
      <circle cx="55" cy="150" r="2" className="text-chromatic-ocean/40" fill="currentColor" />
      <circle cx="70" cy="158" r="2" className="text-chromatic-ocean/30" fill="currentColor" />
    </svg>
  )
}

/** Stay-themed illustration: building/hotel outline. */
export function EmptyStayIllustration({ className = "h-32 w-32", ...rest }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      {...rest}
    >
      <circle cx="100" cy="100" r="86" fill="currentColor" className="text-chromatic-aurora/10" />
      <circle cx="100" cy="100" r="70" fill="currentColor" className="text-chromatic-aurora/5" />

      {/* Building */}
      <g transform="translate(60, 45)">
        <rect
          x="0"
          y="20"
          width="80"
          height="100"
          rx="4"
          fill="currentColor"
          className="text-foreground/8"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M0 50 L 80 50"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground/15"
        />
        <path
          d="M0 80 L 80 80"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground/15"
        />

        {/* Windows grid */}
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={10 + col * 25}
              y={28 + row * 30}
              width="14"
              height="14"
              rx="2"
              className="text-chromatic-aurora/60"
              fill="currentColor"
              opacity={row === 1 && col === 1 ? 0.9 : 0.4}
            />
          ))
        )}

        {/* Door */}
        <rect
          x="32"
          y="100"
          width="16"
          height="20"
          rx="2"
          className="text-chromatic-aurora/80"
          fill="currentColor"
        />
      </g>

      {/* Sparkle accents */}
      <circle cx="45" cy="50" r="2" className="text-chromatic-aurora" fill="currentColor" />
      <circle cx="155" cy="55" r="2.5" className="text-chromatic-sunset" fill="currentColor" />
      <circle cx="160" cy="135" r="2" className="text-chromatic-ocean" fill="currentColor" />
    </svg>
  )
}

/** AI-themed illustration: sparkles + magic wand. */
export function EmptyAiIllustration({ className = "h-32 w-32", ...rest }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      {...rest}
    >
      <circle cx="100" cy="100" r="86" fill="currentColor" className="text-primary/8" />
      <circle cx="100" cy="100" r="70" fill="currentColor" className="text-primary/5" />

      {/* Large sparkle */}
      <g className="text-primary" transform="translate(100, 100)">
        <path
          d="M0 -30 L 6 -6 L 30 0 L 6 6 L 0 30 L -6 6 L -30 0 L -6 -6 Z"
          fill="currentColor"
        />
        <circle cx="0" cy="0" r="6" fill="white" />
      </g>

      {/* Small sparkles */}
      <g className="text-chromatic-aurora" transform="translate(45, 50)">
        <path
          d="M0 -10 L 2 -2 L 10 0 L 2 2 L 0 10 L -2 2 L -10 0 L -2 -2 Z"
          fill="currentColor"
        />
      </g>

      <g className="text-chromatic-sunset" transform="translate(155, 60)">
        <path
          d="M0 -8 L 1.5 -1.5 L 8 0 L 1.5 1.5 L 0 8 L -1.5 1.5 L -8 0 L -1.5 -1.5 Z"
          fill="currentColor"
        />
      </g>

      <g className="text-chromatic-ocean" transform="translate(155, 145)">
        <path
          d="M0 -12 L 2.5 -2.5 L 12 0 L 2.5 2.5 L 0 12 L -2.5 2.5 L -12 0 L -2.5 -2.5 Z"
          fill="currentColor"
        />
      </g>

      <g className="text-chromatic-mint" transform="translate(40, 145)">
        <path
          d="M0 -6 L 1 -1 L 6 0 L 1 1 L 0 6 L -1 1 L -6 0 L -1 -1 Z"
          fill="currentColor"
        />
      </g>
    </svg>
  )
}

/** Generic empty state illustration: dotted circle with compass. */
export function EmptyGenericIllustration({ className = "h-32 w-32", ...rest }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      {...rest}
    >
      <circle cx="100" cy="100" r="86" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" className="text-foreground/15" />
      <circle cx="100" cy="100" r="60" fill="currentColor" className="text-foreground/5" />

      {/* Compass icon */}
      <g className="text-primary" transform="translate(100, 100)">
        <circle r="32" fill="currentColor" className="text-primary/15" />
        <path
          d="M0 -22 L 6 -2 L 22 0 L 6 2 L 0 22 L -6 2 L -22 0 L -6 -2 Z"
          fill="currentColor"
        />
        <circle r="3" fill="white" />
      </g>
    </svg>
  )
}
