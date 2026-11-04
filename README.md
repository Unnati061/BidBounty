# BidBounty — Autonomous Reverse-Checkout & RFQ Terminal

[![PayPal AI Hackathon](https://img.shields.io/badge/PayPal%20AI%20Hackathon-2026-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![AG Grid](https://img.shields.io/badge/AG%20Grid-Custom%20Renderers-E0234E?style=for-the-badge&logo=aggrid&logoColor=white)](https://ag-grid.com)
[![APIMatic](https://img.shields.io/badge/APIMatic-OpenAPI%20Spec-4A90E2?style=for-the-badge)](https://www.apimatic.io)
[![Channel3](https://img.shields.io/badge/Channel3-Live%20Feed-10B981?style=for-the-badge)](https://channel3.tv)

**Live app:** [bidbounty-frontend.onrender.com](https://bidbounty-frontend.onrender.com)

> **Elevator Pitch:** E-commerce today is fundamentally broken: buyers waste hours hunting coupon codes and comparing tabs, while retailers pay astronomical advertising fees for uncertain conversions. **BidBounty** flips the entire commerce paradigm through an **Autonomous Reverse-Checkout & Request-For-Quote (RFQ) Terminal**. Instead of browsing static prices, buyers declare their maximum spend cap and lock in a binding PayPal authorization hold. Autonomous merchant agents then compete live in a high-frequency descending auction to capture the guaranteed order without dropping below their private gross margins. Once a winning bid locks in, BidBounty automatically executes a server-guarded partial capture, instantly releases excess funds back to the buyer, and registers package tracking for complete PayPal Seller and Buyer Protection.

---

## System Architecture

![BidBounty System Architecture Diagram](./docs/architecture.png)

---

## Sponsor Tracks Hit

### 1. PayPal Sandbox APIs (End-to-End Autonomous Settlement)
BidBounty implements the entire lifecycle of PayPal's v2 REST APIs with **zero shortcuts**:
- **Authorize Intent (`POST /v2/checkout/orders`)**: Initializes orders with `intent: "AUTHORIZE"` bound to the buyer's maximum spend cap (e.g., \$240.00). The buyer guarantees liquidity without any upfront debit.
- **Order Authorization (`POST /v2/checkout/orders/{id}/authorize`)**: Executed via the real `@paypal/react-paypal-js` modal. Locks an honor-period hold for the full amount and unlocks private RFQ quoting for merchant bots.
- **Server-Enforced Partial Capture (`POST /v2/payments/authorizations/{id}/capture`)**: A backend server guardrail validates that `winning_bid <= buyer_cap`. It executes a partial capture for the exact winning price (e.g., \$223.50) with `final_capture: true`. PayPal automatically releases the remaining \$16.50 hold back to the buyer immediately in a single atomic transaction.
- **Instant Void Protection (`POST /v2/payments/authorizations/{id}/void`)**: If a buyer submits a lowball bounty below all merchant reserve margins (e.g., \$195.00), all merchant bots refuse, triggering an automatic void request. The buyer is charged \$0.00 with immediate hold release.
- **Proof of Fulfillment (`POST /v2/checkout/orders/{id}/track`)**: Automatically registers tracking information (carrier: `FEDEX`, mock tracking number) with PayPal to maintain Seller Protection eligibility.

### 2. AG Grid (Custom-Engineered Real-Time Trading Terminal)
The live bidding terminal uses **AG Grid React** customized to match our dark `#08090C` / `#0F1117` terminal aesthetic:
- **Built-in Animated Row Reordering**: Uses `animateRows={true}` and `getRowId` mapped to persistent merchant IDs (`apex`, `wave`, `metro`). When an agent places a new lowest bid, AG Grid smoothly animates the row to the top position.
- **Custom Cell Renderers**:
  - `MerchantCellRenderer`: Renders `MiniRobot` status avatars and live gross margin percentages.
  - `PriceFloorTrackCellRenderer`: Dynamic SVG track with hard floor ticks, buyer spend cap tick, list price indicators, and smooth animated bid sliders.
  - `ReasoningCellRenderer`: Geist Sans typewriter animation streaming the autonomous thought processes of each agent in real time.
  - `LiveBidCellRenderer`: Custom `OdometerPrice` rolling number wheels paired with animated delta discount chips (`-$5.50`).
  - `StatusCellRenderer`: Semantic state badges (`Standby`, `Leading`, `Floor reached`, `Winner`, `BELOW_FLOOR_MARGIN`).

### 3. APIMatic (Merchant SDK & OpenAPI 3.0 Webhook Spec)
To empower any third-party merchant to deploy an autonomous bidding bot:
- Created [`merchant-webhook-openapi.yaml`](./merchant-webhook-openapi.yaml), a complete OpenAPI 3.0 specification defining the `POST /v1/bounty/evaluate` webhook contract.
- External merchants receive incoming RFQ events (`bounty_id`, `product_id`, `buyer_cap`, `current_lowest_bid`) and respond with autonomous bid decisions (`bid_price`, `merchant_margin`, `status`).
- Through APIMatic's CodeGen platform, merchants can generate idiomatic client SDKs in Python, TypeScript, Java, C#, and Go with automated documentation.
- Integrated a direct "View Merchant SDK & Docs (Powered by APIMatic)" portal directly inside the `MerchantStudio` UI.

### 4. Channel3 (Live Verified Catalog Feeds)
- Integrated dynamic product switching across 3 distinct consumer categories:
  1. **Sony WH-1000XM5** (Retail: \$251.00 · Wholesale Base: \$200.00 · Default Cap: \$240.00)
  2. **Dell U3223QE 4K Monitor** (Retail: \$450.00 · Wholesale Base: \$380.00 · Default Cap: \$410.00)
  3. **Herman Miller Aeron** (Retail: \$1200.00 · Wholesale Base: \$950.00 · Default Cap: \$1050.00)
- Endpoints (`GET /api/product` and `GET /api/bounty/stream`) anchor real-time agent valuations to verified retail baselines.

---

## Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Unnati061/BidBounty.git
cd BidBounty
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in your PayPal Sandbox Developer credentials:
```env
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_ENV=sandbox

VITE_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
```

### 3. Start the FastAPI Backend
```bash
# Create and activate virtual environment (optional)
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Launch FastAPI server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will be live at `http://localhost:8000`. You can test health via `http://localhost:8000/api/health` and browse Swagger docs at `http://localhost:8000/docs`.

### 4. Start the Vite React Frontend
In a new terminal window:
```bash
# Install frontend dependencies
npm install

# Launch Vite dev server
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## Demo Walkthrough & Testing Scenarios

BidBounty features preset scenarios in the top navigation bar:

1. **Happy Path — Multi-Agent Price Drop**:
   - Select the **Sony WH-1000XM5** with Max Spend Cap at **\$240.00**.
   - Click the gold **PayPal** button to authorize with a sandbox personal account, or click the cyan **Authorize \$240.00** button for instant sandbox testing.
   - Watch the 6-tick descending bidding stream. MetroBot leads first at \$236, WaveBot undercuts to \$231, Metro halts at \$229 floor, Wave halts at \$224 floor, and ApexBot wins at **\$223.50**.
   - Notice the **Settlement Stepper**:
     - Step 1: Pre-authorized hold for \$240.00.
     - Step 2: Partial capture executed for \$223.50; excess \$16.50 released.
     - Step 3: Package tracking registered (`SIM-SBX-443844607820`).
   - "Deal Locked" celebration toast appears with savings count-up to \$27.50.

2. **Lowball Path — Automatic Void**:
   - Toggle the **Scenario** switch to **Lowball**.
   - Spend cap drops to **\$195.00** (below all merchant reserve floors: \$220, \$224, \$229).
   - Authorize the bounty. The bots evaluate the cap against their margins and instantly refuse (`BELOW_FLOOR_MARGIN`).
   - The backend triggers `POST /v2/payments/authorizations/{id}/void`, canceling the hold and charging the buyer **\$0.00**.

3. **Multi-Product Selection**:
   - Use the dropdown in the Hero bar to switch to the **Dell U3223QE 4K Monitor** (\$410 cap) or **Herman Miller Aeron** (\$1050 cap).
   - Notice how the Price Floor Track slider, wholesale base, and agent floors dynamically recalibrate for each category.

4. **Live Audit Ledger & Studio**:
   - Click **PayPal Logs** in the header to view the live JSON payloads of all PayPal REST calls.
   - Click **Merchant Studio** to adjust merchant floor margins or review the APIMatic OpenAPI webhook specification.

---

## Project Structure

```
BidBounty/
├── docs/
│   └── architecture.png            # System architecture diagram
├── backend/
│   ├── main.py                     # FastAPI app: PayPal v2, Channel3, SSE generator
│   └── requirements.txt            # Python dependencies
├── src/
│   ├── components/
│   │   ├── ArenaHeader.jsx         # Live lowest bid, savings counter, 3-step stepper
│   │   ├── BiddingTable.jsx        # AG Grid terminal with 5 custom cell renderers
│   │   ├── DealToast.jsx           # Animated deal locked confirmation toast
│   │   ├── Header.jsx              # App header, view toggle & scenario selector
│   │   ├── HeroProductBar.jsx      # Channel3 dropdown, cap input & PayPal SDK buttons
│   │   ├── MerchantStudio.jsx      # Merchant floor configurations & APIMatic portal
│   │   ├── MiniRobot.jsx           # SVG animated merchant bot avatar
│   │   ├── OdometerPrice.jsx       # Rolling digit price odometer animation
│   │   ├── PayPalLogs.jsx          # Live REST API audit logging table
│   │   ├── PrecisionRobot.jsx      # Detailed robot illustration
│   │   └── TypewriterThought.jsx   # Geist Sans typewriter thought stream
│   ├── data/
│   │   └── merchants.js            # Merchant initial states and margin helpers
│   ├── App.jsx                     # Master state machine & PayPal orchestration
│   ├── index.css                   # AG Grid dark theme overrides & hairline borders
│   └── main.jsx                    # React root entry point
├── merchant-webhook-openapi.yaml   # APIMatic OpenAPI 3.0 specification
├── render.yaml                     # Production deployment blueprint
├── package.json                    # Frontend dependencies & scripts
├── tailwind.config.js              # Custom Tailwind configuration
└── vite.config.js                  # Vite bundler configuration
```

---

## License & Acknowledgments

Built for the **PayPal AI Hackathon 2026**. Special thanks to the teams at **PayPal**, **AG Grid**, **APIMatic**, and **Channel3** for the developer platforms and APIs that made this project possible.
