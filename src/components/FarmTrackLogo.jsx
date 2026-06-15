function FarmTrackLogo({
  compact = false,
  collapsed = false
}) {
  if (collapsed) {
    return (
      <div className="brand" style={{ background: 'var(--blue)', color: 'white', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', margin: '0 auto' }}>
        FT
      </div>
    );
  }
  return (
    <div className={compact ? "brand brand-compact" : "brand"}>
      <span className="brand-farm">
        Farm
      </span>
      <span className="brand-track">
        Track
      </span>
      {
        !compact && (
          <span className="brand-pro">
            Pro
          </span>
        )
      }
    </div>
  );
}

export default FarmTrackLogo;