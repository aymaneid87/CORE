export default function Loading() {
  return (
    <div className="max-w-lg mx-auto px-5 pt-6" aria-busy="true">
      <div className="h-6 w-24 rounded-lg mb-6 animate-pulse" style={{ backgroundColor: 'var(--line)' }} />
      {[0, 1, 2].map(i => (
        <div key={i} className="h-32 rounded-2xl mb-3 animate-pulse" style={{ backgroundColor: 'var(--line)', opacity: 0.5 }} />
      ))}
    </div>
  );
}
