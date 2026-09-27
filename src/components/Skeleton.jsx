export function SkeletonBlock({ width = '100%', height = '14px', rounded = 'rounded', center = false, className = '' }) {
  const block = (
    <div className={`skeleton ${rounded} ${className}`} style={{ width, height }} />
  )
  return center ? <div className="flex justify-center">{block}</div> : block
}

export function SkeletonCircle({ size = '80px' }) {
  return <div className="skeleton rounded-full" style={{ width: size, height: size }} />
}

export function rowBg(index) {
  return index % 2 === 0 ? '#fff' : '#fafafa'
}
