import React, { useState, useEffect, useRef } from 'react';

import Header from './components/Header';
import HeroProductBar from './components/HeroProductBar';
import ArenaHeader from './components/ArenaHeader';
import BiddingTable from './components/BiddingTable';
import MerchantStudio from './components/MerchantStudio';
import PayPalLogs from './components/PayPalLogs';
import DealToast from './components/DealToast';
import { INITIAL_MERCHANTS, calcMargin } from './data/merchants';

const PRODUCT_DATA = {
  sony_xm5: {
    retail: 251.0,
    cost: 200.0,
    defaultCap: 240.0,
    lowballCap: 195.0,
    guardrailDefault: 220.0,
    merchants: [
      { id: 'apex', botName: 'ApexBot', storeName: 'Apex Wholesale', variant: 'apex', listingPrice: 248.0, wholesaleCost: 200.0, hardFloor: 220.0 },
      { id: 'wave', botName: 'WaveBot', storeName: 'SoundWave Direct', variant: 'wave', listingPrice: 250.0, wholesaleCost: 200.0, hardFloor: 224.0 },
      { id: 'metro', botName: 'MetroBot', storeName: 'Metro Audio', variant: 'metro', listingPrice: 255.0, wholesaleCost: 200.0, hardFloor: 229.0 }
    ]
  },
  dell_4k: {
    retail: 450.0,
    cost: 380.0,
    defaultCap: 410.0,
    lowballCap: 375.0,
    guardrailDefault: 405.0,
    merchants: [
      { id: 'apex', botName: 'ApexBot', storeName: 'Apex Wholesale', variant: 'apex', listingPrice: 445.0, wholesaleCost: 380.0, hardFloor: 395.0 },
      { id: 'wave', botName: 'WaveBot', storeName: 'SoundWave Direct', variant: 'wave', listingPrice: 448.0, wholesaleCost: 380.0, hardFloor: 405.0 },
      { id: 'metro', botName: 'MetroBot', storeName: 'Metro Audio', variant: 'metro', listingPrice: 450.0, wholesaleCost: 380.0, hardFloor: 415.0 }
    ]
  },
  herman_miller: {
    retail: 1200.0,
    cost: 950.0,
    defaultCap: 1050.0,
    lowballCap: 940.0,
    guardrailDefault: 1020.0,
    merchants: [
      { id: 'apex', botName: 'ApexBot', storeName: 'Apex Wholesale', variant: 'apex', listingPrice: 1180.0, wholesaleCost: 950.0, hardFloor: 990.0 },
      { id: 'wave', botName: 'WaveBot', storeName: 'SoundWave Direct', variant: 'wave', listingPrice: 1190.0, wholesaleCost: 950.0, hardFloor: 1020.0 },
      { id: 'metro', botName: 'MetroBot', storeName: 'Metro Audio', variant: 'metro', listingPrice: 1200.0, wholesaleCost: 950.0, hardFloor: 1040.0 }
    ]
  }
};

export default function App() {
  // Top-level navigation tabs
  const [activeView, setActiveView] = useState('arena');

  // Selected Channel3 Product state
  const [selectedProductId, setSelectedProductId] = useState('sony_xm5');

  // Scenario & Guardrail state
  const [scenario, setScenario] = useState('happy');
  const [maxSpendCap, setMaxSpendCap] = useState(240.0);
  const [autoCaptureLimit, setAutoCaptureLimit] = useState(220.0);
  const [pauseForManualConfirm, setPauseForManualConfirm] = useState(false);
  const [timeWarpMode, setTimeWarpMode] = useState(true);
  const [showGuardrailPopover, setShowGuardrailPopover] = useState(false);

  // Merchant rows state
  const [merchants, setMerchants] = useState(INITIAL_MERCHANTS);
  const [rowsEntered, setRowsEntered] = useState(false);

  // Lifecycle state
  const [phase, setPhase] = useState('idle');
  const [orderId, setOrderId] = useState('ORD-SBX-89K2M');
  const [authId, setAuthId] = useState(null);
  const [captureId, setCaptureId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15.0);

  // Settlement Stepper & Count-up Animations
  const [settlementStep, setSettlementStep] = useState(0);
  const [animatedSavings, setAnimatedSavings] = useState(0.0);
  const [lowballShake, setLowballShake] = useState(false);
  const [showDealToast, setShowDealToast] = useState(false);
  const [apiLogs, setApiLogs] = useState([]);

  const timerRef = useRef(null);
  const savingsRafRef = useRef(null);
  const timeoutsRef = useRef([]);
  const marketAvg = PRODUCT_DATA[selectedProductId]?.retail ?? 251.0;

  const clearAllTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (savingsRafRef.current) cancelAnimationFrame(savingsRafRef.current);
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    const t = setTimeout(() => setRowsEntered(true), 60);
    return () => {
      clearTimeout(t);
      clearAllTimers();
    };
  }, []);

  const pushLog = (method, endpoint, status, summary, payload) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setApiLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, timestamp, method, endpoint, status, summary, payload },
      ...prev
    ]);
  };

  // Smooth count-up animation for Hero Buyer Savings
  const animateSavingsCountUp = (targetValue) => {
    const duration = 600;
    const startTime = performance.now();
    const startValue = 0.0;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (targetValue - startValue) * eased;
      setAnimatedSavings(current);
      if (progress < 1) {
        savingsRafRef.current = requestAnimationFrame(tick);
      } else {
        setAnimatedSavings(targetValue);
      }
    };
    savingsRafRef.current = requestAnimationFrame(tick);
  };

  // Switch Demo Scenario Presets
  const selectScenario = (type, prodId = selectedProductId) => {
    clearAllTimers();
    setScenario(type);
    setPhase('idle');
    setAuthId(null);
    setCaptureId(null);
    setTimeLeft(15.0);
    setSettlementStep(0);
    setAnimatedSavings(0.0);
    setLowballShake(false);
    setShowDealToast(false);
    setRowsEntered(false);
    setTimeout(() => setRowsEntered(true), 50);

    const activeProdKey = prodId || selectedProductId;
    const prod = PRODUCT_DATA[activeProdKey] || PRODUCT_DATA.sony_xm5;

    if (type === 'happy') {
      setMaxSpendCap(prod.defaultCap);
      setAutoCaptureLimit(prod.guardrailDefault);
    } else {
      setMaxSpendCap(prod.lowballCap);
      setAutoCaptureLimit(Math.max(prod.cost, prod.lowballCap - 5.0));
    }

    setMerchants(
      prod.merchants.map((m) => ({
        ...m,
        currentBid: m.listingPrice,
        delta: null,
        deltaKey: 0,
        sweepKey: 0,
        state: 'idle',
        statusLabel: 'Standby',
        thought:
          m.id === 'apex'
            ? 'Ready. Awaiting binding PayPal authorization to unlock private wholesale bids.'
            : m.id === 'wave'
            ? `Channel3 retail feed synced ($${prod.retail.toFixed(2)}). Floor reserve locked at $${m.hardFloor.toFixed(2)}.`
            : `Private floor locked at $${m.hardFloor.toFixed(2)} (${calcMargin(m.hardFloor, m.wholesaleCost)}% minimum gross margin).`
      }))
    );
  };

  // Switch Selected Channel3 Product from Dropdown
  const handleSelectProduct = (newId) => {
    setSelectedProductId(newId);
    selectScenario(scenario, newId);
  };

  // Countdown timer helper
  const startTimerCountdown = (durationMs) => {
    const startTime = performance.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, 15.0 - (elapsed / durationMs) * 15.0);
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timerRef.current);
    }, 16);
  };

  // 1. Order Created from PayPal JS SDK or Instant Button
  const handleOrderCreated = (orderData) => {
    const newOrderId = orderData.orderID || orderData.id || `ORD-SBX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setOrderId(newOrderId);
    pushLog(
      'POST',
      '/v2/checkout/orders',
      '201 CREATED',
      `Created order (intent="AUTHORIZE") for $${maxSpendCap.toFixed(2)} spend cap.`,
      orderData
    );
  };

  // 2. Authorization Approved from PayPal JS SDK
  const handleAuthorizeSuccess = (authData, approvedOrderId) => {
    const newAuthId = authData.authorization_id || (maxSpendCap >= 220 ? 'AUTH-89K2M' : 'AUTH-41V9X');
    setAuthId(newAuthId);
    setSettlementStep(1);
    setPhase('bidding');
    startTimerCountdown(maxSpendCap >= 220 ? 9500 : 2500);

    pushLog(
      'POST',
      `/v2/checkout/orders/${approvedOrderId || orderId}/authorize`,
      '201 CREATED',
      `Authorized $${maxSpendCap.toFixed(2)} cap. Auth ID: ${newAuthId}`,
      authData
    );
  };

  // Step 1 Fallback/Direct: Authorize with PayPal (Calls Backend REST APIs)
  const handleStartBounty = async () => {
    clearAllTimers();
    setShowGuardrailPopover(false);
    setShowDealToast(false);
    setLowballShake(false);
    setAnimatedSavings(0.0);
    setPhase('authorizing');
    setTimeLeft(15.0);
    setSettlementStep(0);

    setRowsEntered(false);
    setTimeout(() => setRowsEntered(true), 40);

    try {
      // 1. Call Backend POST /api/paypal/create-order
      const orderRes = await fetch('http://localhost:8000/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_cap: maxSpendCap,
          currency: 'USD',
          product_id: selectedProductId
        })
      });
      const orderData = await orderRes.json();
      const currentOrderId = orderData.orderID || orderData.id || 'ORD-SBX-89K2M';
      setOrderId(currentOrderId);

      pushLog(
        'POST',
        '/v2/checkout/orders',
        '201 CREATED',
        `Created order (intent="AUTHORIZE") for $${maxSpendCap.toFixed(2)} spend cap.`,
        orderData
      );

      // 2. Call Backend POST /api/paypal/authorize
      setTimeout(async () => {
        try {
          const authRes = await fetch('http://localhost:8000/api/paypal/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: currentOrderId })
          });
          const authData = await authRes.json();
          const newAuthId = authData.authorization_id || (maxSpendCap >= 220 ? 'AUTH-89K2M' : 'AUTH-41V9X');
          setAuthId(newAuthId);
          setSettlementStep(1);

          pushLog(
            'POST',
            `/v2/checkout/orders/${currentOrderId}/authorize`,
            '201 CREATED',
            `Buyer approved in PayPal popup. Authorized $${maxSpendCap.toFixed(2)} cap.`,
            authData
          );

          setPhase('bidding');
          startTimerCountdown(maxSpendCap >= 220 ? 9500 : 2500);
        } catch (authErr) {
          console.error('PayPal authorize error:', authErr);
          const fallbackAuthId = maxSpendCap >= 220 ? 'AUTH-89K2M' : 'AUTH-41V9X';
          setAuthId(fallbackAuthId);
          setSettlementStep(1);
          setPhase('bidding');
          startTimerCountdown(maxSpendCap >= 220 ? 9500 : 2500);
        }
      }, 500);
    } catch (err) {
      console.error('PayPal create-order error:', err);
      const fallbackAuthId = maxSpendCap >= 220 ? 'AUTH-89K2M' : 'AUTH-41V9X';
      setAuthId(fallbackAuthId);
      setSettlementStep(1);
      setPhase('bidding');
      startTimerCountdown(maxSpendCap >= 220 ? 9500 : 2500);
    }
  };

  // Stream Update Handler: Keep parent merchants state synchronized with AG Grid
  const handleStreamUpdate = (incomingRows, payload) => {
    setMerchants(incomingRows);
  };

  // Stream Complete: Happy Path Winner Resolution
  const handleStreamResolveWinner = async (payload) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);

    const winningBid = payload.winning_bid || 223.50;
    animateSavingsCountUp(marketAvg - winningBid);

    if (pauseForManualConfirm && winningBid > autoCaptureLimit) {
      setPhase('human_confirm');
      pushLog(
        'GUARDRAIL',
        '/internal/guardrail/check',
        'AWAITING_APPROVAL',
        `Winning bid $${winningBid.toFixed(2)} <= $${maxSpendCap.toFixed(2)} cap, paused for 1-click confirmation.`,
        { winning_bid: winningBid, max_cap: maxSpendCap, auto_capture_limit: autoCaptureLimit }
      );
    } else {
      await handlePartialCapture(authId || 'AUTH-89K2M', winningBid, maxSpendCap, 'AUTO_SETTLED');
    }
  };

  // Stream Complete: Lowball Refusal Resolution
  const handleStreamResolveLowball = async (payload) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setLowballShake(true);
    setTimeout(() => setLowballShake(false), 200);

    const activeAuthId = authId || 'AUTH-41V9X';

    try {
      const voidRes = await fetch('http://localhost:8000/api/paypal/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorization_id: activeAuthId,
          reason: 'BELOW_FLOOR_MARGIN'
        })
      });
      const voidData = await voidRes.json();

      setPhase('voided');
      setSettlementStep(0);

      pushLog(
        'POST',
        `/v2/payments/authorizations/${activeAuthId}/void`,
        '204 NO CONTENT',
        `All 3 bots flagged BELOW_FLOOR_MARGIN. Authorization ${activeAuthId} voided ($0.00 charged).`,
        voidData
      );
    } catch (err) {
      console.error('Error voiding PayPal authorization:', err);
      setPhase('voided');
      setSettlementStep(0);
    }
  };

  // Step 3: Partial Capture -> Release Excess -> PayPal Track -> Deal Toast
  const handlePartialCapture = async (activeAuthId, finalPrice, cap, mode = 'AUTO_SETTLED') => {
    const authToUse = activeAuthId || authId || 'AUTH-89K2M';
    const orderToUse = orderId || 'ORD-SBX-89K2M';

    try {
      // 1. Call Backend POST /api/paypal/capture
      const capRes = await fetch('http://localhost:8000/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorization_id: authToUse,
          buyer_cap: cap,
          winning_bid: finalPrice,
          order_id: orderToUse
        })
      });
      const capData = await capRes.json();
      const capId = capData.capture_id || capData.id || 'CAP-77M4P';

      setCaptureId(capId);
      setPhase('captured');
      setSettlementStep(2);

      pushLog(
        'POST',
        `/v2/payments/authorizations/${authToUse}/capture`,
        '201 CREATED',
        `Partial-captured $${finalPrice.toFixed(2)} (final_capture: true). Released $${(cap - finalPrice).toFixed(2)} hold.`,
        capData
      );

      // 2. Call Backend POST /api/paypal/track
      const trackRes = await fetch('http://localhost:8000/api/paypal/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderToUse,
          capture_id: capId,
          carrier: 'FEDEX',
          tracking_number: 'SIM-SBX-443844607820'
        })
      });
      const trackData = await trackRes.json();

      pushLog(
        'POST',
        `/v2/checkout/orders/${orderToUse}/track`,
        '201 CREATED',
        'Registered [SANDBOX MOCK TRACKING: SIM-SBX-443844607820] for protection eligibility.',
        trackData
      );

      // Advance Stepper to Step 3 & Show Toast
      setTimeout(() => {
        setSettlementStep(3);
        setShowDealToast(true);
      }, 400);
    } catch (err) {
      console.error('Error during PayPal capture/track:', err);
      setCaptureId('CAP-77M4P');
      setPhase('captured');
      setSettlementStep(2);
      setTimeout(() => {
        setSettlementStep(3);
        setShowDealToast(true);
      }, 400);
    }
  };

  // Compute sorted order for FLIP vertical reordering
  const sortedIds = [...merchants]
    .sort((a, b) => {
      if (a.currentBid !== b.currentBid) return a.currentBid - b.currentBid;
      return a.listingPrice - b.listingPrice;
    })
    .map((m) => m.id);

  const lowestBid = Math.min(...merchants.map((m) => m.currentBid));
  const displaySavings =
    phase === 'captured' || phase === 'human_confirm'
      ? animatedSavings
      : phase === 'bidding' && lowestBid < marketAvg
      ? Math.max(0, marketAvg - lowestBid)
      : 0.0;

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F2F4F8] antialiased selection:bg-[#38BDF8]/20 selection:text-[#38BDF8] relative overflow-x-hidden">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        scenario={scenario}
        selectScenario={selectScenario}
        apiLogsCount={apiLogs.length}
      />

      <main className="max-w-6xl mx-auto px-6 py-4">
        {activeView === 'arena' && (
          <div>
            <HeroProductBar
              phase={phase}
              maxSpendCap={maxSpendCap}
              setMaxSpendCap={setMaxSpendCap}
              autoCaptureLimit={autoCaptureLimit}
              setAutoCaptureLimit={setAutoCaptureLimit}
              pauseForManualConfirm={pauseForManualConfirm}
              setPauseForManualConfirm={setPauseForManualConfirm}
              showGuardrailPopover={showGuardrailPopover}
              setShowGuardrailPopover={setShowGuardrailPopover}
              handleStartBounty={handleStartBounty}
              selectScenario={selectScenario}
              scenario={scenario}
              authId={authId}
              onOrderCreated={handleOrderCreated}
              onAuthorizeSuccess={handleAuthorizeSuccess}
              selectedProductId={selectedProductId}
              onSelectProduct={handleSelectProduct}
            />

            <ArenaHeader
              lowestBid={lowestBid}
              marketAvg={marketAvg}
              displaySavings={displaySavings}
              timeLeft={timeLeft}
              phase={phase}
              timeWarpMode={timeWarpMode}
              setTimeWarpMode={setTimeWarpMode}
              settlementStep={settlementStep}
              maxSpendCap={maxSpendCap}
            />

            <BiddingTable
              merchants={merchants}
              sortedIds={sortedIds}
              rowsEntered={rowsEntered}
              phase={phase}
              maxSpendCap={maxSpendCap}
              lowballShake={lowballShake}
              authId={authId}
              orderId={orderId}
              autoCaptureLimit={autoCaptureLimit}
              selectScenario={selectScenario}
              handlePartialCapture={handlePartialCapture}
              onStreamUpdate={handleStreamUpdate}
              onStreamResolveWinner={handleStreamResolveWinner}
              onStreamResolveLowball={handleStreamResolveLowball}
              selectedProductId={selectedProductId}
            />
          </div>
        )}

        {activeView === 'studio' && (
          <MerchantStudio
            merchants={merchants}
            setMerchants={setMerchants}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'logs' && (
          <PayPalLogs
            apiLogs={apiLogs}
            setActiveView={setActiveView}
          />
        )}
      </main>

      <DealToast showDealToast={showDealToast} />
    </div>
  );
}
