import React, { useState } from 'react';
import MiniRobot from './MiniRobot';
import {
  ChevronRight,
  ExternalLink,
  Code2,
  BookOpen,
  Sparkles,
  Layers,
  CheckCircle2,
  Copy,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { calcMargin } from '../data/merchants';

const SDK_CODE_SNIPPETS = {
  typescript: `// Auto-generated via APIMatic TypeScript SDK
import { BidBountyMerchantClient } from 'bidbounty-merchant-sdk';

const client = new BidBountyMerchantClient({
  webhookSecret: process.env.BIDBOUNTY_WEBHOOK_SECRET,
  merchantId: 'apex_wholesale_01'
});

// Express / Next.js Webhook Handler
export async function handleBountyEvaluation(req, res) {
  const {
    bounty_id,
    product_id,
    buyer_cap,
    current_lowest_bid,
    wholesale_cost_baseline,
    paypal_auth_id
  } = req.body;

  // 1. Guardrail: Verify PayPal Authorization Hold
  if (!paypal_auth_id) {
    return res.status(401).json({ status: 'UNVERIFIED_FUNDS' });
  }

  // 2. Private Reserve Margin Protection ($220.00 Floor)
  const MY_HARD_FLOOR = 220.00;
  if (buyer_cap < MY_HARD_FLOOR) {
    return res.json({
      bounty_id,
      status: 'BELOW_FLOOR',
      bid_price: MY_HARD_FLOOR,
      merchant_margin: ((MY_HARD_FLOOR - wholesale_cost_baseline) / MY_HARD_FLOOR) * 100,
      reasoning: \`Buyer cap $\${buyer_cap} is below our $220.00 private floor.\`
    });
  }

  // 3. Formulate Autonomous Undercut Bid
  const targetBid = Math.max(MY_HARD_FLOOR, current_lowest_bid - 0.50);
  const marginPct = ((targetBid - wholesale_cost_baseline) / targetBid) * 100;

  return res.json({
    bounty_id,
    status: 'BID',
    bid_price: targetBid,
    merchant_margin: Math.round(marginPct * 10) / 10,
    reasoning: \`Undercutting lowest bid to $\${targetBid.toFixed(2)} (margin: \${marginPct.toFixed(1)}%).\`,
    inventory_units_available: 48,
    guaranteed_delivery_days: 2,
    carrier_preference: 'FEDEX'
  });
}`,
  python: `# Auto-generated via APIMatic Python SDK
from bidbounty_merchant_sdk import BidBountyClient
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

app = FastAPI(title="Merchant Agent Autonomous Webhook")

class BountyRequest(BaseModel):
    bounty_id: str
    product_id: str
    buyer_cap: float
    current_lowest_bid: float
    wholesale_cost_baseline: float = 200.00
    paypal_auth_id: str

@app.post("/v1/bounty/evaluate")
async def evaluate_bounty(payload: BountyRequest):
    # 1. Enforce PayPal Auth Verification
    if not payload.paypal_auth_id:
        raise HTTPException(status_code=401, detail="UNVERIFIED_PAYPAL_FUNDS")

    MY_HARD_FLOOR = 220.00

    # 2. Hard Price Floor Check
    if payload.buyer_cap < MY_HARD_FLOOR:
        return {
            "bounty_id": payload.bounty_id,
            "status": "BELOW_FLOOR",
            "bid_price": MY_HARD_FLOOR,
            "merchant_margin": round(((MY_HARD_FLOOR - payload.wholesale_cost_baseline) / MY_HARD_FLOOR) * 100, 1),
            "reasoning": f"Buyer cap \${payload.buyer_cap:.2f} violates our \${MY_HARD_FLOOR:.2f} floor."
        }

    # 3. Dynamic Counter-Bid Calculation
    counter_bid = max(MY_HARD_FLOOR, round(payload.current_lowest_bid - 0.50, 2))
    margin = round(((counter_bid - payload.wholesale_cost_baseline) / counter_bid) * 100, 1)

    return {
        "bounty_id": payload.bounty_id,
        "status": "BID",
        "bid_price": counter_bid,
        "merchant_margin": margin,
        "reasoning": f"Counter-bid calculated at \${counter_bid:.2f} with {margin}% margin.",
        "inventory_units_available": 48,
        "guaranteed_delivery_days": 2,
        "carrier_preference": "FEDEX"
    }`,
  curl: `# Direct cURL Webhook Ping Simulation
curl -X POST https://api.bidbounty.market/v1/bounty/evaluate \\
  -H "Content-Type: application/json" \\
  -H "X-BidBounty-Signature: sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" \\
  -d '{
    "bounty_id": "bty_99d10e82-2f3b-48c0",
    "product_id": "sony-wh-1000xm5",
    "product_title": "Sony WH-1000XM5 Wireless Noise-Canceling Headphones",
    "buyer_cap": 240.00,
    "current_lowest_bid": 231.00,
    "wholesale_cost_baseline": 200.00,
    "paypal_auth_id": "AUTH-89K2M",
    "tick_sequence": 3,
    "time_left_seconds": 10.5
  }'`
};

const MerchantStudio = ({
  merchants,
  setMerchants,
  setActiveView
}) => {
  const [activeTab, setActiveTab] = useState('apimatic'); // 'apimatic' | 'floors'
  const [selectedLanguage, setSelectedLanguage] = useState('typescript');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(SDK_CODE_SNIPPETS[selectedLanguage]);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <section className="space-y-6 pt-2 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
              APIMatic Partner Integration
            </span>
            <span className="text-white/20">•</span>
            <span className="text-xs text-[#9AA3B2] font-mono">OpenAPI 3.0.3 Ready</span>
          </div>
          <h2 className="text-lg font-semibold text-[#F2F4F8] tracking-tight">
            Merchant Agent Policy & APIMatic SDK Studio
          </h2>
          <p className="text-xs text-[#9AA3B2] mt-0.5">
            Configure autonomous merchant floor rules and inspect APIMatic-generated SDKs for multi-agent bidding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-Tab Navigation Bar */}
          <div className="flex items-center p-1 rounded-lg bg-[#0F1117] border border-white/[0.06] text-xs">
            <button
              onClick={() => setActiveTab('apimatic')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'apimatic'
                  ? 'bg-[#38BDF8] text-[#08090C] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#F2F4F8]'
              }`}
            >
              APIMatic Webhook & SDK
            </button>
            <button
              onClick={() => setActiveTab('floors')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'floors'
                  ? 'bg-[#38BDF8] text-[#08090C] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#F2F4F8]'
              }`}
            >
              Price Floor Reserves
            </button>
          </div>

          <button
            onClick={() => setActiveView('arena')}
            className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-[#0F1117] text-xs text-[#9AA3B2] hover:text-[#F2F4F8] flex items-center gap-1 transition-colors"
          >
            Back to Arena <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: APIMATIC WEBHOOK SDK & OPENAPI SPEC TAB (FEATURED)           */}
      {/* ==================================================================== */}
      {activeTab === 'apimatic' && (
        <div className="space-y-6">
          {/* Rule 3 Hero Action Banner */}
          <div className="p-6 rounded-2xl border border-[#38BDF8]/30 bg-gradient-to-r from-[#0F1117] via-[#0F1117] to-[#38BDF8]/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-2 z-10 max-w-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F5B94A]" />
                <span className="text-xs font-mono font-medium text-[#F5B94A] tracking-wider uppercase">
                  APIMatic Developer Platform
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#F2F4F8]">
                Turn OpenAPI specs into production SDKs in 7+ languages
              </h3>
              <p className="text-xs text-[#9AA3B2] leading-relaxed">
                External e-commerce sellers join BidBounty by implementing our <code className="text-[#38BDF8] font-mono">POST /v1/bounty/evaluate</code> webhook. Using APIMatic, merchants generate type-safe SDKs, validation models, and portal documentation in TypeScript, Python, C#, Java, Go, Ruby, and PHP.
              </p>
            </div>

            {/* RULE 3 REQUIREMENT: Highly Visible Styled Button pointing to #apimatic-docs */}
            <div className="z-10 shrink-0">
              <a
                href="#apimatic-docs"
                className="h-11 px-5 rounded-xl bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#08090C] font-bold text-xs flex items-center gap-2.5 shadow-lg shadow-[#38BDF8]/20 transition-all hover:scale-[1.02] active:scale-[0.99]"
              >
                <BookOpen className="w-4 h-4 text-[#08090C]" />
                <span>View Merchant SDK &amp; Docs (Powered by APIMatic)</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#08090C]" />
              </a>
            </div>

            {/* Subtle background glow */}
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#38BDF8]/5 blur-3xl pointer-events-none" />
          </div>

          {/* APIMatic OpenAPI Contract Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0F1117] space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#38BDF8]">
                <Layers className="w-3.5 h-3.5" />
                <span>Contract Specification</span>
              </div>
              <div className="text-sm font-semibold text-[#F2F4F8]">
                merchant-webhook-openapi.yaml
              </div>
              <p className="text-[11px] text-[#9AA3B2] leading-relaxed">
                OpenAPI 3.0.3 specification defining autonomous webhook payloads, PayPal authorization proof, and merchant margins.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0F1117] space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#34D399]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Buyer Funds</span>
              </div>
              <div className="text-sm font-semibold text-[#F2F4F8]">
                Zero Risk Autonomous Bidding
              </div>
              <p className="text-[11px] text-[#9AA3B2] leading-relaxed">
                Bids are only requested after a buyer locks binding PayPal authorization (<code className="text-[#34D399] font-mono">AUTH-89K2M</code>). Merchant inventory is never reserved on spec.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0F1117] space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#F5B94A]">
                <Code2 className="w-3.5 h-3.5" />
                <span>APIMatic CodeGen</span>
              </div>
              <div className="text-sm font-semibold text-[#F2F4F8]">
                7+ Languages Auto-Generated
              </div>
              <p className="text-[11px] text-[#9AA3B2] leading-relaxed">
                Publish client libraries to npm, PyPI, and NuGet automatically with APIMatic's continuous SDK generator pipeline.
              </p>
            </div>
          </div>

          {/* Interactive Code & Docs Preview Section */}
          <div
            id="apimatic-docs"
            className="rounded-2xl border border-white/[0.08] bg-[#0F1117] overflow-hidden scroll-mt-6"
          >
            {/* Header / Language Selector Bar */}
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-4 bg-[#08090C]/60">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-xs font-mono text-[#F2F4F8] font-medium">
                  POST /v1/bounty/evaluate
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20">
                  APIMatic SDK Demo
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 rounded-lg bg-[#0F1117] border border-white/[0.06] text-xs">
                  {['typescript', 'python', 'curl'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        selectedLanguage === lang
                          ? 'bg-white/10 text-[#38BDF8] font-medium'
                          : 'text-[#9AA3B2] hover:text-[#F2F4F8]'
                      }`}
                    >
                      {lang === 'typescript' ? 'TypeScript' : lang === 'python' ? 'Python' : 'cURL'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1 rounded-lg border border-white/[0.06] bg-[#0F1117] hover:border-white/20 text-xs text-[#9AA3B2] hover:text-[#F2F4F8] flex items-center gap-1.5 transition-colors"
                >
                  {copiedSnippet ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                      <span className="text-[#34D399]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Block */}
            <div className="p-5 font-mono text-xs overflow-x-auto bg-[#08090C]/90 text-[#F2F4F8] leading-relaxed">
              <pre>{SDK_CODE_SNIPPETS[selectedLanguage]}</pre>
            </div>

            {/* Schema Reference Footer */}
            <div className="p-4 border-t border-white/[0.06] bg-[#0F1117] flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-[#9AA3B2]">
                <span className="font-mono text-[#38BDF8]">OpenAPI Input:</span>
                <span>bounty_id, product_id, buyer_cap, current_lowest_bid, paypal_auth_id</span>
              </div>
              <div className="flex items-center gap-2 text-[#9AA3B2]">
                <span className="font-mono text-[#34D399]">Output:</span>
                <span>bid_price, merchant_margin, status</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: AGENT PRICE FLOOR CONFIGURATION TAB                           */}
      {/* ==================================================================== */}
      {activeTab === 'floors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {merchants.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-xl border border-white/[0.06] bg-[#0F1117] space-y-4"
              >
                <div className="flex items-center gap-3">
                  <MiniRobot variant={m.variant} state="idle" />
                  <div>
                    <h3 className="text-sm font-medium text-[#F2F4F8]">{m.storeName}</h3>
                    <span className="text-xs text-[#9AA3B2]">{m.botName}</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-white/[0.06] text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#9AA3B2]">Channel3 Listing</span>
                    <span className="font-mono text-[#F2F4F8]">${m.listingPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9AA3B2]">Wholesale Cost</span>
                    <span className="font-mono text-[#F2F4F8]">${m.wholesaleCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#F2F4F8]">Hard Price Floor ($)</span>
                    <input
                      type="number"
                      value={m.hardFloor}
                      onChange={(e) => {
                        const val = Math.max(205, Math.min(245, Number(e.target.value)));
                        setMerchants((prev) =>
                          prev.map((item) => (item.id === m.id ? { ...item, hardFloor: val } : item))
                        );
                      }}
                      className="w-20 bg-transparent border-b border-white/15 focus:border-[#38BDF8] py-0.5 text-right font-mono text-[#F2F4F8] outline-none"
                    />
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-[#9AA3B2]">Min Floor Margin</span>
                    <span className="font-mono text-[#38BDF8]">
                      {calcMargin(m.hardFloor, m.wholesaleCost)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0F1117] flex items-center justify-between text-xs">
            <span className="text-[#9AA3B2]">
              Changes to hard floors are instantly respected by the backend multi-agent evaluation engine.
            </span>
            <button
              onClick={() => setActiveTab('apimatic')}
              className="text-[#38BDF8] hover:underline flex items-center gap-1 font-medium"
            >
              Inspect APIMatic Webhook Specification <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default MerchantStudio;
