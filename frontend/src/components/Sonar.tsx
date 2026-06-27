// A radar/sonar pulse loader — thematic for "searching for / connecting to a
// stranger". Expanding rings + a pulsing core, all in the primary color.
export function Sonar({ size = 72 }: { size?: number }) {
  return (
    <span className="sonar" style={{ width: size, height: size }}>
      <span className="sonar-ring" />
      <span className="sonar-ring" />
      <span className="sonar-ring" />
      <span className="sonar-core" />
    </span>
  )
}
