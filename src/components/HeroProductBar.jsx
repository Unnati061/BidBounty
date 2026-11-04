import React, { useState } from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const configuredApiHost = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = configuredApiHost
  ? `${/^https?:\/\//i.test(configuredApiHost) ? '' : 'https://'}${configuredApiHost}`.replace(/\/$/, '')
  : '';

export const PRODUCT_OPTIONS = [
  {
    id: 'sony_xm5',
    title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    shortName: 'Sony WH-1000XM5',
    retail: 251.0,
    wholesaleCost: 200.0,
    defaultCap: 240.0,
    guardrailDefault: 220.0,
    badge: 'XM5',
    iconType: 'headphones'
  },
  {
    id: 'dell_4k',
    title: 'Dell U3223QE 4K UltraSharp USB-C Hub Monitor',
    shortName: 'Dell U3223QE 4K',
    retail: 450.0,
    wholesaleCost: 380.0,
    defaultCap: 410.0,
    guardrailDefault: 405.0,
    badge: '4K',
    iconType: 'monitor'
  },
  {
    id: 'herman_miller',
    title: 'Herman Miller Aeron Ergonomic Office Chair',
    shortName: 'Herman Miller Aeron',
    retail: 1200.0,
    wholesaleCost: 950.0,
    defaultCap: 1050.0,
    guardrailDefault: 1020.0,
    badge: 'HM',
    iconType: 'chair'
  }
];

const HeroProductBarContent = ({
  phase,
  maxSpendCap,
  setMaxSpendCap,
  autoCaptureLimit,
  setAutoCaptureLimit,
  pauseForManualConfirm,
  setPauseForManualConfirm,
  showGuardrailPopover,
  setShowGuardrailPopover,
  handleStartBounty,
  selectScenario,
  scenario,
  authId,
  onOrderCreated,
  onAuthorizeSuccess,
  selectedProductId = 'sony_xm5',
  onSelectProduct
}) => {
  const [internalProductId, setInternalProductId] = useState(selectedProductId);
  const activeProductId = selectedProductId || internalProductId;

  const currentProduct =
    PRODUCT_OPTIONS.find((p) => p.id === activeProductId) || PRODUCT_OPTIONS[0];

  const handleProductChange = (newId) => {
    setInternalProductId(newId);
    const prod = PRODUCT_OPTIONS.find((p) => p.id === newId) || PRODUCT_OPTIONS[0];

    if (setMaxSpendCap) {
      setMaxSpendCap(prod.defaultCap);
    }
    if (setAutoCaptureLimit) {
      setAutoCaptureLimit(prod.guardrailDefault);
    }
    if (onSelectProduct) {
      onSelectProduct(newId);
    }
  };

  return (
    <div className="pb-4 border-b border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Left: Product Icon Card + Context + Dropdown */}
      <div className="flex items-center gap-4">
        {/* Product SVG Card */}
        <div
          className="w-16 h-14 rounded-xl border border-white/[0.06] flex flex-col items-center justify-center relative overflow-hidden shrink-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(56, 189, 248, 0.12), #0F1117 75%)'
          }}
        >
          {currentProduct.iconType === 'headphones' && (
            <svg viewBox="0 0 64 48" className="w-11 h-9">
              <defs>
                <linearGradient id="xm5Grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F2F4F8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#9AA3B2" stopOpacity="0.45" />
                </linearGradient>
              </defs>
              <path
                d="M18 27 V20 C18 12.3 24.3 6 32 6 C39.7 6 46 12.3 46 20 V27"
                fill="none"
                stroke="url(#xm5Grad)"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <rect
                x="13"
                y="23"
                width="7.5"
                height="16"
                rx="3.75"
                fill="#F2F4F8"
                opacity="0.88"
              />
              <rect
                x="43.5"
                y="23"
                width="7.5"
                height="16"
                rx="3.75"
                fill="#F2F4F8"
                opacity="0.88"
              />
            </svg>
          )}

          {currentProduct.iconType === 'monitor' && (
            <svg viewBox="0 0 64 48" className="w-11 h-9">
              <rect
                x="12"
                y="8"
                width="40"
                height="26"
                rx="3"
                fill="none"
                stroke="#F2F4F8"
                strokeWidth="2.8"
                opacity="0.9"
              />
              <rect
                x="15"
                y="11"
                width="34"
                height="20"
                rx="1.5"
                fill="#38BDF8"
                fillOpacity="0.15"
              />
              <line x1="32" y1="34" x2="32" y2="40" stroke="#F2F4F8" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="24" y1="40" x2="40" y2="40" stroke="#F2F4F8" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
          )}

          {currentProduct.iconType === 'chair' && (
            <svg viewBox="0 0 64 48" className="w-11 h-9">
              <rect x="22" y="7" width="20" height="17" rx="4" fill="none" stroke="#F2F4F8" strokeWidth="2.6" opacity="0.9" />
              <line x1="16" y1="26" x2="48" y2="26" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
              <line x1="32" y1="26" x2="32" y2="38" stroke="#F2F4F8" strokeWidth="2.6" strokeLinecap="round" />
              <line x1="22" y1="39" x2="42" y2="39" stroke="#9AA3B2" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          )}

          <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-[#9AA3B2]/80">
            {currentProduct.badge}
          </span>
        </div>

        {/* Product Details & Dropdown Selector */}
        <div>
          <div className="flex items-center gap-2.5 ui-label mb-1">
            <span>
              Channel3 Retail Avg{' '}
              <strong className="font-mono text-[#F2F4F8] font-normal">
                ${currentProduct.retail.toFixed(2)}
              </strong>
            </span>
            <span className="text-white/15">•</span>
            <span>
              Wholesale Base{' '}
              <strong className="font-mono text-[#F2F4F8] font-normal">
                ${currentProduct.wholesaleCost.toFixed(2)}
              </strong>
            </span>
          </div>

          {/* Sleek Channel3 Product Selector Dropdown */}
          <div className="relative inline-block">
            <select
              value={activeProductId}
              disabled={phase === 'authorizing' || phase === 'bidding'}
              onChange={(e) => handleProductChange(e.target.value)}
              className="bg-[#0F1117] text-[#F2F4F8] text-base font-semibold border border-white/10 hover:border-white/20 focus:border-[#38BDF8] focus:outline-none rounded-lg pl-3 pr-8 py-1 transition-colors cursor-pointer appearance-none tracking-tight disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239AA3B2%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.65rem center',
                backgroundSize: '12px 12px'
              }}
            >
              <option value="sony_xm5" className="bg-[#0F1117] text-[#F2F4F8]">
                Sony WH-1000XM5 (Retail: $251 · Cap: $240)
              </option>
              <option value="dell_4k" className="bg-[#0F1117] text-[#F2F4F8]">
                Dell U3223QE 4K Monitor (Retail: $450 · Cap: $410)
              </option>
              <option value="herman_miller" className="bg-[#0F1117] text-[#F2F4F8]">
                Herman Miller Aeron (Retail: $1200 · Cap: $1050)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Right: Spend Cap + Guardrail Popover + PayPal Authorize Button */}
      <div className="flex flex-wrap items-center gap-5 relative">
        <div className="flex items-center gap-5 pr-1">
          <div>
            <label className="block ui-label mb-0.5">Max Spend Cap</label>
            <div className="flex items-baseline">
              <span className="text-sm font-mono text-[#9AA3B2] mr-0.5">$</span>
              <input
                type="number"
                value={maxSpendCap}
                disabled={phase === 'authorizing' || phase === 'bidding'}
                onChange={(e) => setMaxSpendCap(Number(e.target.value))}
                className="w-20 bg-transparent font-mono text-base font-semibold text-[#F2F4F8] outline-none border-b border-white/10 focus:border-[#38BDF8] transition-colors"
              />
            </div>
          </div>

          <div className="h-7 w-px bg-white/[0.06]" />

          {/* Guardrail Trigger */}
          <button
            onClick={() => setShowGuardrailPopover(!showGuardrailPopover)}
            className="text-left group"
          >
            <span className="ui-label flex items-center gap-1 group-hover:text-[#F2F4F8] transition-colors mb-0.5">
              Guardrail Limit
              <Sliders className="w-3 h-3 text-[#38BDF8]" />
            </span>
            <span className="font-mono text-sm font-medium text-[#F2F4F8]">
              ≤ ${autoCaptureLimit.toFixed(2)}
            </span>
          </button>
        </div>

        {/* Guardrail Popover */}
        {showGuardrailPopover && (
          <div className="absolute right-0 top-13 z-40 w-80 rounded-xl bg-[#0F1117] border border-white/[0.08] p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#F2F4F8]">Auto-Capture Guardrail</span>
              <span className="font-mono text-[#38BDF8]">≤ ${autoCaptureLimit.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={Math.floor(currentProduct.wholesaleCost)}
              max={Math.ceil(currentProduct.retail)}
              step="1"
              value={autoCaptureLimit}
              onChange={(e) => setAutoCaptureLimit(Number(e.target.value))}
              className="w-full accent-[#38BDF8] cursor-pointer"
            />
            <label className="flex items-center gap-2 text-xs text-[#9AA3B2] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={pauseForManualConfirm}
                onChange={(e) => setPauseForManualConfirm(e.target.checked)}
                className="accent-[#38BDF8] rounded"
              />
              <span>Pause for manual 1-click confirmation if bid &gt; limit</span>
            </label>
          </div>
        )}

        {/* Primary PayPal Action / Authorization Badge */}
        {phase === 'idle' ? (
          <div className="flex items-center gap-2">
            {/* Real PayPal JS SDK Buttons */}
            <div className="min-w-[160px] h-10 flex items-center justify-center rounded-lg">
              <PayPalButtons
                style={{
                  layout: 'horizontal',
                  color: 'gold',
                  shape: 'rect',
                  label: 'pay',
                  height: 38,
                  tagline: false
                }}
                disabled={phase !== 'idle'}
                createOrder={async () => {
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/paypal/create-order`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        buyer_cap: maxSpendCap,
                        currency: 'USD',
                        product_id: activeProductId
                      })
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.detail || 'PayPal could not create the order.');
                    }
                    if (onOrderCreated) {
                      onOrderCreated(data);
                    }
                    return data.orderID || data.id;
                  } catch (err) {
                    console.error('PayPal createOrder failed:', err);
                    throw err;
                  }
                }}
                onApprove={async (data) => {
                  try {
                    const orderId = data.orderID;
                    const res = await fetch(`${API_BASE_URL}/api/paypal/authorize`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_id: orderId })
                    });
                    const authData = await res.json();
                    if (onAuthorizeSuccess) {
                      onAuthorizeSuccess(authData, orderId);
                    }
                  } catch (err) {
                    console.error('PayPal onApprove failed:', err);
                  }
                }}
                onError={(err) => {
                  console.warn('PayPal Button notice:', err);
                }}
              />
            </div>

            {/* Instant 1-Click Sandbox Fast Authorize */}
            <button
              onClick={handleStartBounty}
              className="h-10 px-4 rounded-lg bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#08090C] font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-[0.99] whitespace-nowrap"
              title="Instant 1-click Sandbox Authorization"
            >
              <span>Authorize</span>
              <span className="font-mono font-bold">${maxSpendCap.toFixed(2)}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-10 px-3.5 rounded-lg border border-white/[0.06] bg-[#0F1117] flex items-center gap-2.5 text-xs font-mono">
              <svg viewBox="0 0 20 20" className="w-4 h-4 overflow-visible">
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  fill="none"
                  stroke={
                    phase === 'voided'
                      ? '#F87171'
                      : phase === 'captured'
                      ? '#34D399'
                      : '#38BDF8'
                  }
                  strokeWidth="1.75"
                  className="transition-all duration-300"
                  style={{
                    transformOrigin: 'center',
                    transform: phase === 'voided' ? 'scale(0)' : 'scale(1)',
                    opacity: phase === 'voided' ? 0 : 1,
                    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                />
                {phase === 'voided' ? (
                  <g stroke="#F87171" strokeWidth="1.75" strokeLinecap="round">
                    <line x1="6.5" y1="6.5" x2="13.5" y2="13.5" />
                    <line x1="13.5" y1="6.5" x2="6.5" y2="13.5" />
                  </g>
                ) : (
                  <circle
                    cx="10"
                    cy="10"
                    r="2.5"
                    fill={phase === 'captured' ? '#34D399' : '#38BDF8'}
                  />
                )}
              </svg>
              <span
                className={
                  phase === 'voided'
                    ? 'text-[#F87171]'
                    : phase === 'captured'
                    ? 'text-[#34D399]'
                    : 'text-[#F2F4F8]'
                }
              >
                {phase === 'authorizing'
                  ? 'Authorizing...'
                  : phase === 'voided'
                  ? 'Voided ($0.00)'
                  : `Active ($${maxSpendCap.toFixed(2)})`}
              </span>
            </div>

            <button
              onClick={() => selectScenario(scenario)}
              className="h-10 w-10 rounded-lg border border-white/[0.06] bg-[#0F1117] hover:border-white/20 flex items-center justify-center text-[#9AA3B2] hover:text-[#F2F4F8] transition-colors"
              title="Reset Auction"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const HeroProductBar = (props) => {
  return (
    <PayPalScriptProvider
      options={{
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb',
        intent: 'authorize',
        currency: 'USD'
      }}
    >
      <HeroProductBarContent {...props} />
    </PayPalScriptProvider>
  );
};

export default HeroProductBar;
