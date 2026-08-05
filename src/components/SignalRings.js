// Radiating rings that echo the antenna/signal mark in the logo.
// Purely decorative; hidden from assistive tech.
export default function SignalRings({ className = "" }) {
  const rings = [180, 320, 480, 640, 820];
  return (
    <div className={`signal-field ${className}`} aria-hidden="true">
      {rings.map((size, i) => (
        <span
          key={size}
          className="signal-ring animate-pulseRing"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}
    </div>
  );
}
