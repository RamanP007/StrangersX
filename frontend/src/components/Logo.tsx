interface Props {
  size?: number
  showText?: boolean
  textClassName?: string
  className?: string
}

/**
 * Brand logo: a gradient tile with two overlapping rings (two strangers
 * connecting) + the "StrangerX" wordmark with an accented X.
 */
export function Logo({ size = 32, showText = true, textClassName = '', className = '' }: Props) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span
        className="logo-mark inline-flex items-center justify-center rounded-xl text-white"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <circle cx="9" cy="12" r="5.4" />
          <circle cx="15" cy="12" r="5.4" />
        </svg>
      </span>

      {showText && (
        <span className={`font-bold tracking-tight ${textClassName}`}>
          Stranger<span className="text-primary">X</span>
        </span>
      )}
    </span>
  )
}
