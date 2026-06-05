function FarmTrackLogo({
  compact = false
}) {
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