import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import OdometerPrice from './OdometerPrice';
import MiniRobot from './MiniRobot';
import TypewriterThought from './TypewriterThought';
import { calcMargin } from '../data/merchants';
import { ArrowRight, Radio, Square } from 'lucide-react';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================================================
// 1. CUSTOM CELL RENDERERS
// ============================================================================

// Col 1: Merchant Agent (MiniRobot + Store Name + Bot Name + Margin)
const MerchantCellRenderer = (params) => {
  const m = params.data;
  if (!m) return null;
  const marginPct = calcMargin(m.currentBid, m.wholesaleCost);
  const isWinner = m.state === 'winner';

  return (
    <div className="flex items-center gap-3 w-full h-full relative">
      {/* Soft Cyan Accent Sweep Underline on New Lowest Bid */}
      {m.sweepKey > 0 && !isWinner && (
        <span
          key={m.sweepKey}
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px] bg-[#38BDF8] animate-accent-sweep z-30"
        />
      )}
      <MiniRobot variant={m.variant} state={m.state} />
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[#F2F4F8] whitespace-nowrap">
            {m.storeName}
          </span>
        </div>
        <div className="text-xs text-[#9AA3B2] flex items-center gap-1.5 mt-0.5">
          <span>{m.botName}</span>
          <span>·</span>
          <span className="font-mono">{marginPct}% margin</span>
        </div>
      </div>
    </div>
  );
};

// Col 2: Price Floor Track (Floor Tick, List Marker, Cap Marker, Bid Dot)
const PriceFloorTrackCellRenderer = (params) => {
  const m = params.data;
  if (!m) return null;

  const maxSpendCap = params.maxSpendCap ?? 240.0;
  const isWinner = m.state === 'winner';
  const isFloor = m.state === 'floor';
  const floorMarginPct = calcMargin(m.hardFloor, m.wholesaleCost);

  // Dynamic Scale Range based on merchant floor, list price, and spend cap
  const minScale = Math.min(m.hardFloor * 0.96, (maxSpendCap || m.hardFloor) * 0.95);
  const maxScale = Math.max(m.listingPrice * 1.02, (maxSpendCap || m.listingPrice) * 1.02);
  const scaleSpan = Math.max(1, maxScale - minScale);

  const floorPosPct = Math.max(0, Math.min(100, ((m.hardFloor - minScale) / scaleSpan) * 100));
  const listPosPct = Math.max(0, Math.min(100, ((m.listingPrice - minScale) / scaleSpan) * 100));
  const capPosPct = Math.max(0, Math.min(100, ((maxSpendCap - minScale) / scaleSpan) * 100));
  const bidPosPct = Math.max(
    floorPosPct,
    Math.min(listPosPct, ((m.currentBid - minScale) / scaleSpan) * 100)
  );

  return (
    <div className="w-full pr-2">
      <div className="flex items-center justify-between text-[11px] text-[#9AA3B2] mb-1.5">
        <span className={isFloor ? 'text-[#F87171] font-medium' : ''}>
          Floor <strong className="font-mono font-normal">${m.hardFloor.toFixed(0)}</strong> ({floorMarginPct}%)
        </span>
        {maxSpendCap >= minScale && maxSpendCap <= maxScale && (
          <span className="text-[10px] font-mono text-[#9AA3B2]/80">
            Cap ${maxSpendCap.toFixed(0)}
          </span>
        )}
        <span>
          List <strong className="font-mono font-normal">${m.listingPrice.toFixed(0)}</strong>
        </span>
      </div>

      <div className="relative h-5 flex items-center">
        {/* Track Pill Background */}
        <div className="w-full h-2 rounded-full bg-[#0F1117] border border-white/[0.06]" />

        {/* Unreachable Zone Below Merchant Floor */}
        <div
          className="absolute left-0 h-2 rounded-l-full bg-white/[0.02]"
          style={{ width: `${floorPosPct}%` }}
        />

        {/* Filled Segment Behind Bid Dot */}
        <div
          className="absolute h-2 rounded-full transition-all duration-300"
          style={{
            left: `${bidPosPct}%`,
            width: `${Math.max(0, listPosPct - bidPosPct)}%`,
            backgroundColor: isWinner
              ? 'rgba(245, 185, 74, 0.28)'
              : isFloor
              ? 'rgba(248, 113, 113, 0.25)'
              : 'rgba(56, 189, 248, 0.25)',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        />

        {/* Buyer's Cap Marker */}
        {maxSpendCap >= minScale && maxSpendCap <= maxScale && (
          <div
            className="absolute w-[1.5px] h-3.5 bg-white/30 z-10"
            style={{ left: `${capPosPct}%` }}
            title={`Buyer Cap: $${maxSpendCap.toFixed(2)}`}
          />
        )}

        {/* Hard Floor Tick */}
        <div
          className={`absolute w-[2px] h-4 rounded-full z-10 transition-colors ${
            isFloor ? 'bg-[#F87171]' : 'bg-[#F2F4F8]/70'
          }`}
          style={{ left: `${floorPosPct}%` }}
          title={`Hard Floor: $${m.hardFloor.toFixed(2)}`}
        />

        {/* Live Bid Dot */}
        <div
          className="absolute w-3 h-3 rounded-full -ml-1.5 z-20 border-2 border-[#08090C] transition-all duration-300"
          style={{
            left: `${bidPosPct}%`,
            backgroundColor: isWinner
              ? '#F5B94A'
              : isFloor
              ? '#F87171'
              : '#38BDF8',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        />
      </div>
    </div>
  );
};

// Col 3: Agent Reasoning (Typewriter Effect in Geist Sans)
const ReasoningCellRenderer = (params) => {
  const m = params.data;
  if (!m) return null;
  const isWinner = m.state === 'winner';
  const isFloor = m.state === 'floor';

  return (
    <div className="w-full min-w-0 pr-2">
      <TypewriterThought
        text={m.thought || m.reasoning}
        muted={isFloor}
        isError={m.statusLabel === 'BELOW_FLOOR' || m.statusLabel === 'BELOW_FLOOR_MARGIN'}
        isWinner={isWinner}
      />
    </div>
  );
};

// Col 4: Live Bid (Odometer Roller + Delta Chip)
const LiveBidCellRenderer = (params) => {
  const m = params.data;
  if (!m) return null;
  const isWinner = m.state === 'winner';
  const isFloor = m.state === 'floor';

  return (
    <div className="flex items-center justify-end gap-2 text-right w-full">
      {m.delta && (
        <span
          key={m.deltaKey}
          className="text-xs font-mono text-[#34D399] animate-delta-chip"
        >
          -${m.delta.toFixed(2)}
        </span>
      )}
      <OdometerPrice
        value={m.currentBid}
        className={`text-lg font-semibold ${
          isWinner
            ? 'text-[#F2F4F8]'
            : isFloor
            ? 'text-[#9AA3B2]'
            : 'text-[#F2F4F8]'
        }`}
      />
    </div>
  );
};

// Col 5: Status (Status Dot + Semantic Label)
const StatusCellRenderer = (params) => {
  const m = params.data;
  if (!m) return null;
  const isWinner = m.state === 'winner';
  const isFloor = m.state === 'floor';

  const dotColor = isWinner
    ? 'bg-[#F5B94A]'
    : isFloor
    ? 'bg-[#F87171]'
    : m.statusLabel === 'Leading' || m.statusLabel === 'Bidding'
    ? 'bg-[#38BDF8]'
    : 'bg-[#9AA3B2]/50';

  return (
    <div className="flex items-center justify-end gap-2 text-right w-full">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span
        className={`text-xs font-medium whitespace-nowrap ${
          isWinner
            ? 'text-[#F5B94A]'
            : isFloor
            ? 'text-[#F87171]'
            : m.statusLabel === 'Leading'
            ? 'text-[#38BDF8]'
            : 'text-[#9AA3B2]'
        }`}
      >
        {m.statusLabel}
      </span>
    </div>
  );
};

// ============================================================================
// 2. MAIN BIDDING TABLE WITH SSE STREAM & AG GRID TRANSACTION API
// ============================================================================
const BiddingTable = ({
  merchants,
  sortedIds,
  rowsEntered,
  phase,
  maxSpendCap,
  lowballShake,
  authId,
  orderId,
  autoCaptureLimit,
  selectScenario,
  handlePartialCapture,
  onStreamUpdate,
  onStreamResolveWinner,
  onStreamResolveLowball,
  selectedProductId = 'sony_xm5'
}) => {
  const gridRef = useRef(null);
  const eventSourceRef = useRef(null);

  // SSE Stream State
  const [sseConnected, setSseConnected] = useState(false);
  const [sseStatus, setSseStatus] = useState('Idle');
  const [currentTick, setCurrentTick] = useState(0);

  // Maintain local merchants state synchronized with SSE transactions
  const [liveMerchants, setLiveMerchants] = useState(merchants);

  // Reset local state when parent merchants reset (e.g., scenario or product switch)
  useEffect(() => {
    setLiveMerchants(merchants);
  }, [merchants]);

  // --------------------------------------------------------------------------
  // Rule 3 & 5: Connect to SSE Endpoint with cap & selected product ID
  // new EventSource(`http://localhost:8000/api/bounty/stream?cap=${cap}&product_id=${productId}`)
  // --------------------------------------------------------------------------
  const connectSSE = (capValue, prodId) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const cap = capValue ?? maxSpendCap;
    const activeProd = prodId || selectedProductId || 'sony_xm5';
    const sseUrl = `http://localhost:8000/api/bounty/stream?cap=${cap}&product_id=${activeProd}`;
    setSseStatus(`Connecting to ${sseUrl}...`);

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;
    setSseConnected(true);

    es.onopen = () => {
      setSseStatus(`Live SSE Stream Active (${activeProd})`);
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const incomingRows = payload.merchants;

        if (incomingRows && Array.isArray(incomingRows)) {
          // Feed streamed JSON directly into AG Grid using api.applyTransaction
          if (gridRef.current && gridRef.current.api) {
            gridRef.current.api.applyTransaction({ update: incomingRows });
            gridRef.current.api.refreshClientSideRowModel('sort');
          }

          // Update local state to maintain synchronization
          setLiveMerchants(incomingRows);
          setCurrentTick(payload.tick ?? 0);

          if (onStreamUpdate) {
            onStreamUpdate(incomingRows, payload);
          }
        }

        if (payload.is_complete) {
          setSseStatus('SSE Stream Completed');
          es.close();
          eventSourceRef.current = null;
          setSseConnected(false);

          if (payload.void_authorization || payload.stage === 'halted_below_floor') {
            if (onStreamResolveLowball) {
              onStreamResolveLowball(payload);
            }
          } else if (payload.winner_id) {
            if (onStreamResolveWinner) {
              onStreamResolveWinner(payload);
            }
          }
        }
      } catch (err) {
        console.error('Error parsing SSE payload:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('SSE stream error or connection closed:', err);
      setSseStatus('SSE Disconnected');
      es.close();
      eventSourceRef.current = null;
      setSseConnected(false);
    };
  };

  const disconnectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setSseConnected(false);
    setSseStatus('Idle');
  };

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // When live auction starts (phase === 'bidding'), automatically trigger SSE stream with product_id
  useEffect(() => {
    if (phase === 'bidding' && !sseConnected) {
      connectSSE(maxSpendCap, selectedProductId);
    } else if (phase === 'idle' || phase === 'voided') {
      disconnectSSE();
    }
  }, [phase, maxSpendCap, selectedProductId]);

  // Initial sorted rowData passed to grid
  const rowData = useMemo(() => {
    return [...liveMerchants].sort((a, b) => {
      if (a.currentBid !== b.currentBid) return a.currentBid - b.currentBid;
      return a.listingPrice - b.listingPrice;
    });
  }, [liveMerchants]);

  // Map each row to persistent merchant ID (apex, wave, metro)
  const getRowId = useMemo(() => (params) => params.data.id, []);

  // AG Grid postSortRows ensures rows automatically animate reordering on every transaction
  const postSortRows = useMemo(() => (params) => {
    const rowNodes = params.nodes;
    rowNodes.sort((a, b) => {
      const bidA = a.data ? a.data.currentBid : 0;
      const bidB = b.data ? b.data.currentBid : 0;
      if (bidA !== bidB) return bidA - bidB;
      const listA = a.data ? a.data.listingPrice : 0;
      const listB = b.data ? b.data.listingPrice : 0;
      return listA - listB;
    });
  }, []);

  // AG Grid row classes (winner glow + hairline border, floor dimming)
  const getRowClass = useMemo(() => (params) => {
    const m = params.data;
    if (!m) return '';
    const isWinner = m.state === 'winner';
    const isFloor = m.state === 'floor';
    const isAuctionFinished = phase === 'captured' || phase === 'human_confirm';

    if (isWinner && isAuctionFinished) {
      return 'ag-row-winner-glow';
    }
    if (isFloor) {
      return 'opacity-50 transition-opacity duration-300';
    }
    return '';
  }, [phase]);

  // Column Definitions for AG Grid
  const columnDefs = useMemo(() => [
    {
      headerName: 'MERCHANT AGENT',
      field: 'storeName',
      width: 250,
      minWidth: 220,
      cellRenderer: MerchantCellRenderer,
      suppressMovable: true,
      sortable: false
    },
    {
      headerName: 'PRICE FLOOR TRACK',
      field: 'hardFloor',
      width: 240,
      minWidth: 200,
      cellRenderer: PriceFloorTrackCellRenderer,
      cellRendererParams: { maxSpendCap },
      suppressMovable: true,
      sortable: false
    },
    {
      headerName: 'AGENT REASONING',
      field: 'thought',
      flex: 1,
      minWidth: 240,
      cellRenderer: ReasoningCellRenderer,
      suppressMovable: true,
      sortable: false
    },
    {
      headerName: 'LIVE BID',
      field: 'currentBid',
      width: 130,
      minWidth: 110,
      cellRenderer: LiveBidCellRenderer,
      suppressMovable: true,
      sortable: false
    },
    {
      headerName: 'STATUS',
      field: 'statusLabel',
      width: 120,
      minWidth: 100,
      cellRenderer: StatusCellRenderer,
      suppressMovable: true,
      sortable: false
    }
  ], [maxSpendCap]);

  // Grid Options
  const defaultColDef = useMemo(() => ({
    resizable: false,
    suppressMenu: true,
    sortable: false
  }), []);

  return (
    <div
      className={`relative mt-2 ${
        lowballShake ? 'animate-lowball-shake' : ''
      }`}
    >
      {/* Stream Status Pill */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#9AA3B2] pb-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              sseConnected
                ? 'bg-[#34D399] animate-pulse'
                : phase === 'voided'
                ? 'bg-[#F87171]'
                : 'bg-white/20'
            }`}
          />
          <span>{sseStatus}</span>
          {currentTick > 0 && <span>· Tick {currentTick}/6</span>}
        </div>
        <div className="text-[10px] text-white/30">
          Target: Channel3 · AG Grid Native Row Reorder
        </div>
      </div>

      {/* AG Grid React Container */}
      <div
        className="ag-theme-quartz-dark w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0F1117]/40"
        style={{ height: '290px' }}
      >
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          rowHeight={84}
          headerHeight={36}
          animateRows={true}
          postSortRows={postSortRows}
          getRowClass={getRowClass}
          suppressCellFocus={true}
          suppressRowClickSelection={true}
          suppressColumnVirtualisation={true}
        />
      </div>

      {/* Human-in-the-Loop Confirmation Banner (Guardrail Exceeded) */}
      {phase === 'human_confirm' && (
        <div className="mt-4 p-4 rounded-xl border border-[#F5B94A]/30 bg-[#F5B94A]/10 backdrop-blur-md flex items-center justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F5B94A]">
              <span>⚠️ Guardrail Alert: Manual 1-Click Confirmation Required</span>
            </div>
            <p className="text-xs text-[#9AA3B2] mt-0.5">
              Winning bid is ${Math.min(...merchants.map((m) => m.currentBid)).toFixed(2)}, which exceeds your auto-capture limit of ${autoCaptureLimit.toFixed(2)}. Spend cap is ${maxSpendCap.toFixed(2)}.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => selectScenario('lowball')}
              className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs text-[#9AA3B2] hover:text-[#F2F4F8] transition-colors"
            >
              Reject & Void
            </button>
            <button
              onClick={() =>
                handlePartialCapture(
                  authId || 'AUTH-89K2M',
                  Math.min(...merchants.map((m) => m.currentBid)),
                  maxSpendCap,
                  'MANUAL_CONFIRMED'
                )
              }
              className="px-4 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#08090C] font-semibold text-xs transition-all active:scale-[0.98]"
            >
              Confirm Capture & Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiddingTable;
