import React, { useState, useEffect } from 'react';

// Two-line agent reasoning stream with subtle caret (Geist UI Font)
const TypewriterThought = ({ text, muted = false, isError = false, isWinner = false }) => {
  const [displayed, setDisplayed] = useState(text);
  const [fading, setFading] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    setFading(true);
    let intervalId = null;

    const fadeTimer = setTimeout(() => {
      setFading(false);
      setDisplayed('');
      setTyping(true);
      let idx = 0;
      intervalId = setInterval(() => {
        idx += 1;
        setDisplayed(text.slice(0, idx));
        if (idx >= text.length) {
          clearInterval(intervalId);
          setTyping(false);
        }
      }, 12);
    }, 80);

    return () => {
      clearTimeout(fadeTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text]);

  return (
    <div
      className={`text-[13px] leading-[1.35] font-sans transition-opacity duration-200 line-clamp-2 ${
        fading ? 'opacity-0' : 'opacity-100'
      } ${
        isError
          ? 'text-[#F87171]'
          : isWinner
          ? 'text-[#F2F4F8] font-medium'
          : muted
          ? 'text-[#9AA3B2]/60'
          : 'text-[#9AA3B2]'
      }`}
    >
      <span>{displayed}</span>
      <span
        className={`inline-block w-[1.5px] h-3.5 ml-1 align-middle transition-opacity ${
          isError ? 'bg-[#F87171]' : isWinner ? 'bg-[#F5B94A]' : 'bg-[#38BDF8]'
        } ${typing ? 'opacity-90 animate-pulse' : 'opacity-0'}`}
      />
    </div>
  );
};

export default TypewriterThought;
