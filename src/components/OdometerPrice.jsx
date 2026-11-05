import React, { useEffect, useRef, useState } from 'react';

// Digit-by-digit vertical odometer price roller (250ms cubic-bezier)
const OdometerDigit = ({ char }) => {
  const isDigit = /^[0-9]$/.test(char);
  if (!isDigit) {
    return <span className="inline-block">{char}</span>;
  }
  const digit = parseInt(char, 10);
  return (
    <span
      className="inline-flex flex-col overflow-hidden relative align-bottom"
      style={{ height: '1.15em', lineHeight: '1.15em' }}
    >
      <span
        className="flex flex-col transition-transform duration-250 will-change-transform"
        style={{
          transform: `translateY(-${digit * 10}%)`,
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="h-[1.15em] flex items-center justify-center select-none">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
};

const OdometerPrice = ({ value, prefix = '$', className = '' }) => {
  const numericValue = Number(value);
  const previousValueRef = useRef(numericValue);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (numericValue < previousValueRef.current) {
      setPulseKey((key) => key + 1);
    }
    previousValueRef.current = numericValue;
  }, [numericValue]);

  const formatted = numericValue.toFixed(2);
  const chars = `${prefix}${formatted}`.split('');

  return (
    <span className="inline-flex overflow-visible">
      <span
        key={pulseKey}
        className={`inline-flex items-baseline font-mono tabular-nums tracking-tight ${
          pulseKey > 0 ? 'animate-price-tick' : ''
        } ${className}`}
      >
        {chars.map((ch, idx) => (
          <OdometerDigit key={idx} char={ch} />
        ))}
      </span>
    </span>
  );
};

export default OdometerPrice;
