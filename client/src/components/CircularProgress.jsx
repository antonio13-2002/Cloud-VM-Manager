function CircularProgress({ value, max, label, unit, color, radius = 140 }) {
  const stroke = radius > 70 ? 20 : 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // calculate fill percentage
  const strokeDashoffset = circumference - ((Math.max(0, value) / max) * circumference);

  return (
    <div className="d-flex flex-column align-items-center">
      <div style={{ position: 'relative', width: radius * 2.5, height: radius * 2.5 }}>
        <svg
          height={radius * 2.5}
          width={radius * 2.5}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }} 
        >
          <circle
            stroke="#e6e6e6"
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius * 1.25}
            cy={radius * 1.25}
          />
          {/* progress circle */}
          <circle
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius * 1.25}
            cy={radius * 1.25}
          />
        </svg>
        
        {/* text in the circle */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div className="fs-3 fw-bold">{value} / {max}</div>
          <div className="text-muted small">{unit}</div>
        </div>
      </div>
    </div>
  );
}

export { CircularProgress };