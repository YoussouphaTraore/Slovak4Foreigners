const isMobile =
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
  window.matchMedia('(max-width: 768px)').matches;

export function DesktopBlock() {
  if (isMobile) return null;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <img
        src="/DesktopPageRedircting.png"
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <div style={{
        position: 'absolute',
        bottom: '2.5%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: 'clamp(1rem, 2vw, 1.75rem)',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 4px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
      }}>
        www.slovakforforeigners.eu
      </div>
    </div>
  );
}

export { isMobile };
