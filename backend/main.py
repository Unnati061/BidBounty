import asyncio
import json
import os
import uuid
import time
from typing import AsyncGenerator, Optional
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

# Load environment variables
load_dotenv()

app = FastAPI(
    title="BidBounty Backend – PayPal Autonomous RFQ Terminal",
    version="1.0.0",
    description="Backend API for BidBounty PayPal Hackathon: Channel3 Feed, Multi-Product Multi-Agent SSE Stream, and Real PayPal Sandbox APIs"
)

# Enable CORS for Vite dev server (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PayPal Sandbox Configuration
PAYPAL_ENV = os.getenv("PAYPAL_ENV", "sandbox")
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_ENV == "sandbox" else "https://api-m.paypal.com"
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")

# Cached token store
_token_cache = {
    "token": None,
    "expires_at": 0,
    "is_real": False
}


# ============================================================================
# CHANNEL3 MULTI-PRODUCT CATALOG & DETERMINISTIC MERCHANT FLOORS
# ============================================================================
PRODUCTS_CATALOG = {
    "sony_xm5": {
        "id": "sony_xm5",
        "product_id": "sony_xm5",
        "title": "Sony WH-1000XM5 Wireless Noise-Canceling Headphones",
        "short_name": "Sony WH-1000XM5",
        "brand": "Sony",
        "sku": "WH1000XM5/B",
        "retail_baseline": 251.00,
        "wholesale_cost": 200.00,
        "default_cap": 240.00,
        "lowball_cap": 195.00,
        "auto_capture_limit": 220.00,
        "currency": "USD",
        "channel3_verified": True,
        "categories": ["Consumer Electronics", "Audio", "Headphones"],
        "merchants": {
            "apex": {
                "id": "apex",
                "botName": "ApexBot",
                "storeName": "Apex Wholesale",
                "variant": "apex",
                "listingPrice": 248.0,
                "wholesaleCost": 200.0,
                "hardFloor": 220.0,  # 9.1% min margin
            },
            "wave": {
                "id": "wave",
                "botName": "WaveBot",
                "storeName": "SoundWave Direct",
                "variant": "wave",
                "listingPrice": 250.0,
                "wholesaleCost": 200.0,
                "hardFloor": 224.0,  # 10.7% min margin
            },
            "metro": {
                "id": "metro",
                "botName": "MetroBot",
                "storeName": "Metro Audio",
                "variant": "metro",
                "listingPrice": 255.0,
                "wholesaleCost": 200.0,
                "hardFloor": 229.0,  # 12.7% min margin
            }
        }
    },
    "dell_4k": {
        "id": "dell_4k",
        "product_id": "dell_4k",
        "title": "Dell U3223QE 4K UltraSharp USB-C Hub Monitor",
        "short_name": "Dell U3223QE 4K",
        "brand": "Dell",
        "sku": "DELL-U3223QE",
        "retail_baseline": 450.00,
        "wholesale_cost": 380.00,
        "default_cap": 410.00,
        "lowball_cap": 375.00,
        "auto_capture_limit": 405.00,
        "currency": "USD",
        "channel3_verified": True,
        "categories": ["Computers & Accessories", "Monitors", "4K Displays"],
        "merchants": {
            "apex": {
                "id": "apex",
                "botName": "ApexBot",
                "storeName": "Apex Wholesale",
                "variant": "apex",
                "listingPrice": 445.0,
                "wholesaleCost": 380.0,
                "hardFloor": 395.0,  # 3.8% min margin
            },
            "wave": {
                "id": "wave",
                "botName": "WaveBot",
                "storeName": "SoundWave Direct",
                "variant": "wave",
                "listingPrice": 448.0,
                "wholesaleCost": 380.0,
                "hardFloor": 405.0,  # 6.2% min margin
            },
            "metro": {
                "id": "metro",
                "botName": "MetroBot",
                "storeName": "Metro Audio",
                "variant": "metro",
                "listingPrice": 450.0,
                "wholesaleCost": 380.0,
                "hardFloor": 415.0,  # 8.4% min margin
            }
        }
    },
    "herman_miller": {
        "id": "herman_miller",
        "product_id": "herman_miller",
        "title": "Herman Miller Aeron Ergonomic Office Chair",
        "short_name": "Herman Miller Aeron",
        "brand": "Herman Miller",
        "sku": "HM-AERON-B",
        "retail_baseline": 1200.00,
        "wholesale_cost": 950.00,
        "default_cap": 1050.00,
        "lowball_cap": 940.00,
        "auto_capture_limit": 1020.00,
        "currency": "USD",
        "channel3_verified": True,
        "categories": ["Office Furniture", "Ergonomic Seating", "Chairs"],
        "merchants": {
            "apex": {
                "id": "apex",
                "botName": "ApexBot",
                "storeName": "Apex Wholesale",
                "variant": "apex",
                "listingPrice": 1180.0,
                "wholesaleCost": 950.0,
                "hardFloor": 990.0,  # 4.0% min margin
            },
            "wave": {
                "id": "wave",
                "botName": "WaveBot",
                "storeName": "SoundWave Direct",
                "variant": "wave",
                "listingPrice": 1190.0,
                "wholesaleCost": 950.0,
                "hardFloor": 1020.0,  # 6.9% min margin
            },
            "metro": {
                "id": "metro",
                "botName": "MetroBot",
                "storeName": "Metro Audio",
                "variant": "metro",
                "listingPrice": 1200.0,
                "wholesaleCost": 950.0,
                "hardFloor": 1040.0,  # 8.7% min margin
            }
        }
    }
}


def normalize_product_id(pid: str) -> str:
    """Normalizes incoming product ID query variations."""
    if not pid:
        return "sony_xm5"
    p = pid.lower().strip().replace("-", "_")
    if "dell" in p or "monitor" in p:
        return "dell_4k"
    if "herman" in p or "aeron" in p or "chair" in p:
        return "herman_miller"
    return "sony_xm5"


def calc_margin(bid: float, cost: float) -> float:
    """Calculates exact gross margin percentage."""
    if bid <= 0:
        return 0.0
    return round(((bid - cost) / bid) * 100, 1)


# ============================================================================
# 1. PAYPAL AUTHENTICATION (BEARER TOKEN)
# ============================================================================
async def get_paypal_bearer_token() -> str:
    """
    Retrieves a PayPal OAuth2 Bearer token from PayPal Sandbox.
    Caches token in-memory until expiry.
    If credentials are missing or sandbox is unreachable, yields a fallback mock token.
    """
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    if not PAYPAL_CLIENT_ID or PAYPAL_CLIENT_ID in ("sb", "test", "YOUR_CLIENT_ID") or not PAYPAL_CLIENT_SECRET:
        mock_token = f"MOCK_TOKEN_SBX_{uuid.uuid4().hex[:12]}"
        _token_cache["token"] = mock_token
        _token_cache["expires_at"] = now + 3600
        _token_cache["is_real"] = False
        return mock_token

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{PAYPAL_API_BASE}/v1/oauth2/token",
                auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
                headers={"Accept": "application/json", "Accept-Language": "en_US"},
                data={"grant_type": "client_credentials"}
            )
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)
                _token_cache["token"] = token
                _token_cache["expires_at"] = now + expires_in - 60
                _token_cache["is_real"] = True
                print(f"[PayPal Auth] Successfully obtained Sandbox Bearer token (expires in {expires_in}s)")
                return token
            else:
                print(f"[PayPal Auth] Sandbox returned {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[PayPal Auth Exception]: {e}")

    fallback_token = f"MOCK_TOKEN_SBX_{uuid.uuid4().hex[:12]}"
    _token_cache["token"] = fallback_token
    _token_cache["expires_at"] = now + 3600
    _token_cache["is_real"] = False
    return fallback_token


# ============================================================================
# 2. PAYPAL PYDANTIC SCHEMAS
# ============================================================================
class CreateOrderRequest(BaseModel):
    buyer_cap: float = 240.0
    currency: str = "USD"
    product_id: Optional[str] = "sony_xm5"


class AuthorizeOrderRequest(BaseModel):
    order_id: str


class CaptureOrderRequest(BaseModel):
    authorization_id: str
    buyer_cap: float
    winning_bid: float
    order_id: Optional[str] = None


class VoidOrderRequest(BaseModel):
    authorization_id: str
    reason: Optional[str] = "BELOW_FLOOR_MARGIN"


class TrackOrderRequest(BaseModel):
    order_id: Optional[str] = None
    capture_id: Optional[str] = None
    carrier: str = "FEDEX"
    tracking_number: Optional[str] = "SIM-SBX-443844607820"


# ============================================================================
# 3. PAYPAL SANDBOX REST ENDPOINTS
# ============================================================================

@app.post("/api/paypal/create-order")
async def create_paypal_order(req: CreateOrderRequest):
    """
    Creates a PayPal order with intent='AUTHORIZE' for the buyer's max cap.
    Calls PayPal POST /v2/checkout/orders.
    """
    prod_key = normalize_product_id(req.product_id or "sony_xm5")
    prod = PRODUCTS_CATALOG.get(prod_key, PRODUCTS_CATALOG["sony_xm5"])

    token = await get_paypal_bearer_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "Prefer": "return=representation"
    }
    payload = {
        "intent": "AUTHORIZE",
        "purchase_units": [
            {
                "reference_id": f"BOUNTY-{prod_key.upper()}-{uuid.uuid4().hex[:6].upper()}",
                "description": f"{prod['title']} Autonomous RFQ Bounty",
                "amount": {
                    "currency_code": req.currency,
                    "value": f"{req.buyer_cap:.2f}"
                }
            }
        ],
        "application_context": {
            "brand_name": "BidBounty",
            "landing_page": "NO_PREFERENCE",
            "user_action": "CONTINUE",
            "return_url": "http://localhost:5173",
            "cancel_url": "http://localhost:5173"
        }
    }

    if _token_cache.get("is_real"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{PAYPAL_API_BASE}/v2/checkout/orders", headers=headers, json=payload)
                if res.status_code in (200, 201):
                    data = res.json()
                    order_id = data.get("id")
                    print(f"[PayPal] Real Sandbox Order Created: {order_id} (Status: {data.get('status')})")
                    return {
                        "orderID": order_id,
                        "id": order_id,
                        "status": data.get("status", "CREATED"),
                        "intent": "AUTHORIZE",
                        "buyer_cap": req.buyer_cap,
                        "product_id": prod_key,
                        "raw": data
                    }
                else:
                    print(f"[create-order error]: {res.status_code} {res.text}")
        except Exception as e:
            print(f"[create-order error]: {e}")

    # Deterministic Mock Order ID for offline fallback
    mock_order_id = f"ORD-SBX-{uuid.uuid4().hex[:8].upper()}" if req.buyer_cap >= min(m["hardFloor"] for m in prod["merchants"].values()) else "ORD-SBX-LOWBALL1"
    return {
        "orderID": mock_order_id,
        "id": mock_order_id,
        "status": "CREATED",
        "intent": "AUTHORIZE",
        "buyer_cap": req.buyer_cap,
        "product_id": prod_key,
        "amount": {"currency_code": req.currency, "value": f"{req.buyer_cap:.2f}"},
        "sandbox_mock": True
    }


@app.post("/api/paypal/authorize")
async def authorize_paypal_order(req: AuthorizeOrderRequest):
    """
    Authorizes the approved PayPal order.
    Calls PayPal POST /v2/checkout/orders/{order_id}/authorize.
    Returns the binding authorization_id.
    """
    token = await get_paypal_bearer_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "Prefer": "return=representation"
    }

    if _token_cache.get("is_real"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{PAYPAL_API_BASE}/v2/checkout/orders/{req.order_id}/authorize",
                    headers=headers,
                    json={}
                )
                if res.status_code in (200, 201):
                    data = res.json()
                    auths = data.get("purchase_units", [{}])[0].get("payments", {}).get("authorizations", [])
                    auth_id = auths[0].get("id") if auths else f"AUTH-{uuid.uuid4().hex[:8].upper()}"
                    print(f"[PayPal] Real Order Authorized: {req.order_id} -> Auth ID: {auth_id}")
                    return {
                        "order_id": req.order_id,
                        "authorization_id": auth_id,
                        "status": "COMPLETED",
                        "raw": data
                    }
                else:
                    print(f"[PayPal authorize notice]: {res.status_code} {res.text}")
        except Exception as e:
            print(f"[authorize error]: {e}")

    # Fallback authorization ID
    mock_auth_id = "AUTH-89K2M" if "LOWBALL" not in req.order_id else "AUTH-41V9X"
    return {
        "order_id": req.order_id,
        "authorization_id": mock_auth_id,
        "status": "CREATED",
        "validity": "29-day window / 3-day honor period",
        "sandbox_mock": True
    }


@app.post("/api/paypal/capture")
async def capture_paypal_authorization(req: CaptureOrderRequest):
    """
    Partial capture of the winning bid and automatic release of excess hold.
    SERVER-ENFORCED GUARDRAIL: winning_bid MUST be <= buyer_cap.
    Calls PayPal POST /v2/payments/authorizations/{authorization_id}/capture with final_capture: true.
    """
    if req.winning_bid > req.buyer_cap:
        raise HTTPException(
            status_code=400,
            detail=f"Guardrail violation: Winning bid ${req.winning_bid:.2f} exceeds buyer max cap ${req.buyer_cap:.2f}"
        )

    released_amount = round(req.buyer_cap - req.winning_bid, 2)
    token = await get_paypal_bearer_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "Prefer": "return=representation"
    }
    payload = {
        "amount": {
            "currency_code": "USD",
            "value": f"{req.winning_bid:.2f}"
        },
        "final_capture": True,
        "note_to_payer": f"BidBounty Partial Capture: Paid ${req.winning_bid:.2f}. Excess authorized hold of ${released_amount:.2f} has been released."
    }

    if _token_cache.get("is_real"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{PAYPAL_API_BASE}/v2/payments/authorizations/{req.authorization_id}/capture",
                    headers=headers,
                    json=payload
                )
                if res.status_code in (200, 201):
                    data = res.json()
                    capture_id = data.get("id")
                    print(f"[PayPal] Real Authorization Captured: {req.authorization_id} -> Capture ID: {capture_id}")
                    return {
                        "capture_id": capture_id,
                        "authorization_id": req.authorization_id,
                        "status": "COMPLETED",
                        "captured_amount": req.winning_bid,
                        "released_amount": released_amount,
                        "final_capture": True,
                        "raw": data
                    }
                else:
                    print(f"[PayPal capture notice]: {res.status_code} {res.text}")
        except Exception as e:
            print(f"[capture error]: {e}")

    # Fallback capture ID
    mock_cap_id = "CAP-77M4P"
    return {
        "capture_id": mock_cap_id,
        "id": mock_cap_id,
        "authorization_id": req.authorization_id,
        "status": "COMPLETED",
        "final_capture": True,
        "captured_amount": req.winning_bid,
        "released_amount": released_amount,
        "currency": "USD",
        "sandbox_mock": True
    }


@app.post("/api/paypal/void")
async def void_paypal_authorization(req: VoidOrderRequest):
    """
    Cancels/voids the authorized hold if a lowball bounty is rejected or expires below merchant floors.
    Calls PayPal POST /v2/payments/authorizations/{authorization_id}/void.
    """
    token = await get_paypal_bearer_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    if _token_cache.get("is_real"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{PAYPAL_API_BASE}/v2/payments/authorizations/{req.authorization_id}/void",
                    headers=headers
                )
                if res.status_code in (200, 204):
                    print(f"[PayPal] Real Authorization Voided: {req.authorization_id}")
                    return {
                        "authorization_id": req.authorization_id,
                        "status": "VOIDED",
                        "reason": req.reason,
                        "amount_charged": 0.00
                    }
                else:
                    print(f"[PayPal void notice]: {res.status_code} {res.text}")
        except Exception as e:
            print(f"[void error]: {e}")

    return {
        "authorization_id": req.authorization_id,
        "status": "VOIDED",
        "reason": req.reason,
        "amount_charged": 0.00,
        "sandbox_mock": True
    }


@app.post("/api/paypal/track")
async def register_paypal_tracking(req: TrackOrderRequest):
    """
    Registers proof of fulfillment / sandbox mock tracking for Buyer & Merchant Protection eligibility.
    Calls PayPal POST /v2/checkout/orders/{order_id}/track.
    """
    order_id = req.order_id or "ORD-SBX-89K2M"
    tracking_number = req.tracking_number or "SIM-SBX-443844607820"
    carrier = req.carrier or "FEDEX"

    token = await get_paypal_bearer_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    payload = {
        "capture_id": req.capture_id or "CAP-77M4P",
        "tracking_number": tracking_number,
        "carrier": carrier,
        "status": "SHIPPED",
        "notify_payer": True
    }

    if _token_cache.get("is_real"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/track",
                    headers=headers,
                    json=payload
                )
                if res.status_code in (200, 201):
                    print(f"[PayPal] Tracking Registered: Order {order_id} -> {tracking_number}")
                    return res.json()
                else:
                    print(f"[PayPal track notice]: {res.status_code} {res.text}")
        except Exception as e:
            print(f"[track error]: {e}")

    return {
        "status": "CREATED",
        "order_id": order_id,
        "capture_id": req.capture_id or "CAP-77M4P",
        "carrier": carrier,
        "tracking_number": tracking_number,
        "sandbox_mock": True
    }


# ============================================================================
# 4. CHANNEL3 & SSE STREAM ENDPOINTS (MULTI-PRODUCT SUPPORT)
# ============================================================================

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "BidBounty Backend",
        "paypal_env": PAYPAL_ENV,
        "paypal_client_id_prefix": PAYPAL_CLIENT_ID[:8] + "...",
        "has_paypal_secret": bool(PAYPAL_CLIENT_SECRET),
        "supported_products": list(PRODUCTS_CATALOG.keys())
    }


@app.get("/api/product")
async def get_product(product_id: str = Query("sony_xm5", description="Product ID: sony_xm5, dell_4k, or herman_miller")):
    """
    Channel3 API Live Feed Simulation with Multi-Product support:
    - sony_xm5 (Sony WH-1000XM5: Retail $251, Wholesale $200)
    - dell_4k (Dell U3223QE 4K Monitor: Retail $450, Wholesale $380)
    - herman_miller (Herman Miller Aeron: Retail $1200, Wholesale $950)
    """
    prod_key = normalize_product_id(product_id)
    prod = PRODUCTS_CATALOG.get(prod_key, PRODUCTS_CATALOG["sony_xm5"])
    return {
        **prod,
        "seeded_merchants": list(prod["merchants"].values())
    }


async def generate_bounty_stream(
    request: Request,
    buyer_cap: float,
    product_id: str = "sony_xm5"
) -> AsyncGenerator[str, None]:
    """
    SSE stream emitting deterministic bidding ticks every 1.5 seconds.
    Supports all 3 Channel3 products:
    - sony_xm5: Floors $220 / $224 / $229 -> Apex wins @ $223.50 (Cap $240)
    - dell_4k: Floors $395 / $405 / $415 -> Apex wins @ $404.00 (Cap $410)
    - herman_miller: Floors $990 / $1020 / $1040 -> Apex wins @ $1018.50 (Cap $1050)
    - Lowball: If buyer_cap < min(floors), halts bots with BELOW_FLOOR_MARGIN refusal.
    """
    prod_key = normalize_product_id(product_id)
    prod = PRODUCTS_CATALOG.get(prod_key, PRODUCTS_CATALOG["sony_xm5"])
    merchants = prod["merchants"]
    cost = prod["wholesale_cost"]
    floors = {k: v["hardFloor"] for k, v in merchants.items()}

    is_lowball = buyer_cap < min(floors.values())

    # =========================================================================
    # SCENARIO A: LOWBALL REFUSAL (BELOW ALL MERCHANT FLOORS)
    # =========================================================================
    if is_lowball:
        tick_0 = [
            {
                **merchants["apex"],
                "currentBid": merchants["apex"]["listingPrice"],
                "bid": merchants["apex"]["listingPrice"],
                "delta": None,
                "deltaKey": 0,
                "sweepKey": 0,
                "margin": calc_margin(merchants["apex"]["listingPrice"], cost),
                "state": "scanning",
                "status": "Evaluating",
                "statusLabel": "Evaluating",
                "thought": f"Evaluating buyer ${buyer_cap:.2f} cap against ${floors['apex']:.2f} private floor...",
                "reasoning": f"Evaluating buyer ${buyer_cap:.2f} cap against ${floors['apex']:.2f} private floor..."
            },
            {
                **merchants["wave"],
                "currentBid": merchants["wave"]["listingPrice"],
                "bid": merchants["wave"]["listingPrice"],
                "delta": None,
                "deltaKey": 0,
                "sweepKey": 0,
                "margin": calc_margin(merchants["wave"]["listingPrice"], cost),
                "state": "scanning",
                "status": "Evaluating",
                "statusLabel": "Evaluating",
                "thought": f"Evaluating buyer ${buyer_cap:.2f} cap against ${floors['wave']:.2f} private floor...",
                "reasoning": f"Evaluating buyer ${buyer_cap:.2f} cap against ${floors['wave']:.2f} private floor..."
            },
            {
                **merchants["metro"],
                "currentBid": merchants["metro"]["listingPrice"],
                "bid": merchants["metro"]["listingPrice"],
                "delta": None,
                "deltaKey": 0,
                "sweepKey": 0,
                "margin": calc_margin(merchants["metro"]["listingPrice"], cost),
                "state": "scanning",
                "status": "Evaluating",
                "statusLabel": "Evaluating",
                "thought": f"Evaluating buyer ${buyer_cap:.2f} cap against ${floors['metro']:.2f} private floor...",
                "reasoning": f"Evaluating buyer ${buyer_cap:.2f} cap against ${floors['metro']:.2f} private floor..."
            }
        ]
        yield json.dumps({
            "tick": 0,
            "stage": "evaluating",
            "is_complete": False,
            "lowest_bid": min(m["listingPrice"] for m in merchants.values()),
            "merchants": tick_0,
            "product_id": prod_key
        })

        await asyncio.sleep(1.5)
        if await request.is_disconnected():
            return

        tick_1 = [
            {
                **merchants["apex"],
                "currentBid": merchants["apex"]["listingPrice"],
                "bid": merchants["apex"]["listingPrice"],
                "delta": None,
                "deltaKey": 0,
                "sweepKey": 0,
                "margin": calc_margin(floors["apex"], cost),
                "state": "floor",
                "status": "BELOW_FLOOR_MARGIN",
                "statusLabel": "BELOW_FLOOR_MARGIN",
                "thought": f"Refused: Buyer ${buyer_cap:.2f} cap is below our ${floors['apex']:.2f} hard floor ({calc_margin(floors['apex'], cost)}% min margin).",
                "reasoning": f"Refused: Buyer ${buyer_cap:.2f} cap is below our ${floors['apex']:.2f} hard floor ({calc_margin(floors['apex'], cost)}% min margin)."
            },
            {
                **merchants["wave"],
                "currentBid": merchants["wave"]["listingPrice"],
                "bid": merchants["wave"]["listingPrice"],
                "delta": None,
                "deltaKey": 0,
                "sweepKey": 0,
                "margin": calc_margin(floors["wave"], cost),
                "state": "floor",
                "status": "BELOW_FLOOR_MARGIN",
                "statusLabel": "BELOW_FLOOR_MARGIN",
                "thought": f"Refused: Buyer ${buyer_cap:.2f} cap is below our ${floors['wave']:.2f} hard floor ({calc_margin(floors['wave'], cost)}% min margin).",
                "reasoning": f"Refused: Buyer ${buyer_cap:.2f} cap is below our ${floors['wave']:.2f} hard floor ({calc_margin(floors['wave'], cost)}% min margin)."
            },
            {
                **merchants["metro"],
                "currentBid": merchants["metro"]["listingPrice"],
                "bid": merchants["metro"]["listingPrice"],
                "delta": None,
                "deltaKey": 0,
                "sweepKey": 0,
                "margin": calc_margin(floors["metro"], cost),
                "state": "floor",
                "status": "BELOW_FLOOR_MARGIN",
                "statusLabel": "BELOW_FLOOR_MARGIN",
                "thought": f"Refused: Buyer ${buyer_cap:.2f} cap is below our ${floors['metro']:.2f} hard floor ({calc_margin(floors['metro'], cost)}% min margin).",
                "reasoning": f"Refused: Buyer ${buyer_cap:.2f} cap is below our ${floors['metro']:.2f} hard floor ({calc_margin(floors['metro'], cost)}% min margin)."
            }
        ]
        yield json.dumps({
            "tick": 1,
            "stage": "halted_below_floor",
            "is_complete": True,
            "void_authorization": True,
            "lowest_bid": None,
            "merchants": tick_1,
            "product_id": prod_key
        })
        return

    # =========================================================================
    # SCENARIO B: DETERMINISTIC 6-TICK MULTI-AGENT BIDDING CASCADE
    # =========================================================================

    if prod_key == "sony_xm5":
        # SONY WH-1000XM5: Retail $251.00, Cost $200.00, Cap $240.00
        # Floors: Metro $229.00, Wave $224.00, Apex $220.00 -> Winner: Apex @ $223.50
        plan = [
            # Tick 1: Opening entrance. MetroBot takes early lead at $236.00
            {
                "tick": 1,
                "leader_id": "metro",
                "lowest_bid": 236.0,
                "merchants": [
                    {**merchants["metro"], "currentBid": 236.0, "bid": 236.0, "delta": 19.0, "deltaKey": 1, "sweepKey": 1, "margin": calc_margin(236.0, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Taking early Round 1 lead at $236.00 (-7.5% below retail list)."},
                    {**merchants["apex"], "currentBid": 238.0, "bid": 238.0, "delta": 10.0, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(238.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "PayPal authorization verified. Opening wholesale bid at $238.00."},
                    {**merchants["wave"], "currentBid": 239.0, "bid": 239.0, "delta": 11.0, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(239.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": f"Entering below buyer ${buyer_cap:.2f} spend cap at $239.00."}
                ]
            },
            # Tick 2: WaveBot undercuts to $231.00
            {
                "tick": 2,
                "leader_id": "wave",
                "lowest_bid": 231.0,
                "merchants": [
                    {**merchants["wave"], "currentBid": 231.0, "bid": 231.0, "delta": 8.0, "deltaKey": 2, "sweepKey": 1, "margin": calc_margin(231.0, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Undercutting Metro Audio to $231.00 to capture first position."},
                    {**merchants["apex"], "currentBid": 233.0, "bid": 233.0, "delta": 5.0, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(233.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Stepping down to $233.00 while maintaining 14.2% gross margin."},
                    {**merchants["metro"], "currentBid": 236.0, "bid": 236.0, "delta": None, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(236.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Holding at $236.00. Analyzing SoundWave Direct counter-bid."}
                ]
            },
            # Tick 3: MetroBot halts at floor $229.00; ApexBot steps into lead at $228.00
            {
                "tick": 3,
                "leader_id": "apex",
                "lowest_bid": 228.0,
                "merchants": [
                    {**merchants["apex"], "currentBid": 228.0, "bid": 228.0, "delta": 5.0, "deltaKey": 3, "sweepKey": 2, "margin": calc_margin(228.0, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Metro Audio stopped at floor. Stepping into the lead at $228.00."},
                    {**merchants["wave"], "currentBid": 231.0, "bid": 231.0, "delta": None, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(231.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Preparing counter-bid against Apex Wholesale."},
                    {**merchants["metro"], "currentBid": 229.0, "bid": 229.0, "delta": 7.0, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(229.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $229.00 (12.7% minimum floor margin). Holding position."}
                ]
            },
            # Tick 4: WaveBot undercuts to $225.50
            {
                "tick": 4,
                "leader_id": "wave",
                "lowest_bid": 225.5,
                "merchants": [
                    {**merchants["wave"], "currentBid": 225.5, "bid": 225.5, "delta": 5.5, "deltaKey": 3, "sweepKey": 2, "margin": calc_margin(225.5, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Pushing counter-offer to $225.50 ($1.50 above our $224.00 floor)."},
                    {**merchants["apex"], "currentBid": 228.0, "bid": 228.0, "delta": None, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(228.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Analyzing SoundWave Direct aggressive drop to $225.50."},
                    {**merchants["metro"], "currentBid": 229.0, "bid": 229.0, "delta": None, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(229.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $229.00. Cannot bid lower."}
                ]
            },
            # Tick 5: WaveBot hits $224.00 floor; ApexBot tests at $224.50
            {
                "tick": 5,
                "leader_id": "wave",
                "lowest_bid": 224.0,
                "merchants": [
                    {**merchants["wave"], "currentBid": 224.0, "bid": 224.0, "delta": 1.5, "deltaKey": 4, "sweepKey": 0, "margin": calc_margin(224.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $224.00 (10.7% minimum floor margin). Cannot bid lower."},
                    {**merchants["apex"], "currentBid": 224.5, "bid": 224.5, "delta": 3.5, "deltaKey": 4, "sweepKey": 0, "margin": calc_margin(224.5, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Testing SoundWave Direct reserve threshold at $224.50..."},
                    {**merchants["metro"], "currentBid": 229.0, "bid": 229.0, "delta": None, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(229.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $229.00. Cannot bid lower."}
                ]
            },
            # Tick 6: ApexBot wins at $223.50
            {
                "tick": 6,
                "is_complete": True,
                "winner_id": "apex",
                "winning_bid": 223.5,
                "lowest_bid": 223.5,
                "savings": 27.5,
                "leader_id": "apex",
                "merchants": [
                    {**merchants["apex"], "currentBid": 223.5, "bid": 223.5, "delta": 1.0, "deltaKey": 5, "sweepKey": 3, "margin": calc_margin(223.5, cost), "state": "winner", "status": "Winner", "statusLabel": "Winner", "thought": "Winning bid locked at $223.50 ($0.50 under SoundWave's floor, 10.5% margin)."},
                    {**merchants["wave"], "currentBid": 224.0, "bid": 224.0, "delta": None, "deltaKey": 4, "sweepKey": 0, "margin": calc_margin(224.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $224.00. Cannot bid lower."},
                    {**merchants["metro"], "currentBid": 229.0, "bid": 229.0, "delta": None, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(229.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $229.00. Cannot bid lower."}
                ]
            }
        ]

    elif prod_key == "dell_4k":
        # DELL U3223QE 4K MONITOR: Retail $450.00, Cost $380.00, Cap $410.00
        # Floors: Metro $415.00, Wave $405.00, Apex $395.00 -> Winner: Apex @ $404.00
        plan = [
            # Tick 1: Opening entrance. Metro halts at $415.00 floor (> $410 cap); Wave takes lead @ $409.50
            {
                "tick": 1,
                "leader_id": "wave",
                "lowest_bid": 409.5,
                "merchants": [
                    {**merchants["wave"], "currentBid": 409.5, "bid": 409.5, "delta": 38.5, "deltaKey": 1, "sweepKey": 1, "margin": calc_margin(409.5, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": f"Opening below buyer ${buyer_cap:.2f} cap at $409.50 (-9.0% below retail list)."},
                    {**merchants["apex"], "currentBid": 410.0, "bid": 410.0, "delta": 35.0, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(410.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "PayPal authorization verified. Opening wholesale bid at $410.00 cap."},
                    {**merchants["metro"], "currentBid": 415.0, "bid": 415.0, "delta": 35.0, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(415.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $415.00 (8.4% min floor margin). Holding reserve."}
                ]
            },
            # Tick 2: ApexBot undercuts WaveBot to $407.50
            {
                "tick": 2,
                "leader_id": "apex",
                "lowest_bid": 407.5,
                "merchants": [
                    {**merchants["apex"], "currentBid": 407.5, "bid": 407.5, "delta": 2.5, "deltaKey": 2, "sweepKey": 1, "margin": calc_margin(407.5, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Undercutting SoundWave Direct to $407.50 to take the lead."},
                    {**merchants["wave"], "currentBid": 409.5, "bid": 409.5, "delta": None, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(409.5, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Evaluating counter-offer against Apex Wholesale."},
                    {**merchants["metro"], "currentBid": 415.0, "bid": 415.0, "delta": None, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(415.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $415.00. Cannot bid lower than floor."}
                ]
            },
            # Tick 3: WaveBot counters down to $406.00
            {
                "tick": 3,
                "leader_id": "wave",
                "lowest_bid": 406.0,
                "merchants": [
                    {**merchants["wave"], "currentBid": 406.0, "bid": 406.0, "delta": 3.5, "deltaKey": 2, "sweepKey": 1, "margin": calc_margin(406.0, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Stepping down to $406.00 ($1.00 above our $405.00 floor)."},
                    {**merchants["apex"], "currentBid": 407.5, "bid": 407.5, "delta": None, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(407.5, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Analyzing SoundWave Direct aggressive counter-bid at $406.00."},
                    {**merchants["metro"], "currentBid": 415.0, "bid": 415.0, "delta": None, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(415.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $415.00. Standing down."}
                ]
            },
            # Tick 4: ApexBot steps down to $405.50
            {
                "tick": 4,
                "leader_id": "apex",
                "lowest_bid": 405.5,
                "merchants": [
                    {**merchants["apex"], "currentBid": 405.5, "bid": 405.5, "delta": 2.0, "deltaKey": 3, "sweepKey": 2, "margin": calc_margin(405.5, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Stepping down to $405.50 while preserving 6.3% margin."},
                    {**merchants["wave"], "currentBid": 406.0, "bid": 406.0, "delta": None, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(406.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Preparing final counter-offer near reserve floor threshold."},
                    {**merchants["metro"], "currentBid": 415.0, "bid": 415.0, "delta": None, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(415.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $415.00. Cannot bid lower."}
                ]
            },
            # Tick 5: WaveBot hits $405.00 floor; Apex tests
            {
                "tick": 5,
                "leader_id": "wave",
                "lowest_bid": 405.0,
                "merchants": [
                    {**merchants["wave"], "currentBid": 405.0, "bid": 405.0, "delta": 1.0, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(405.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $405.00 (6.2% minimum floor margin). Cannot bid lower."},
                    {**merchants["apex"], "currentBid": 405.5, "bid": 405.5, "delta": None, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(405.5, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Testing SoundWave Direct reserve threshold at $405.50..."},
                    {**merchants["metro"], "currentBid": 415.0, "bid": 415.0, "delta": None, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(415.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $415.00. Cannot bid lower."}
                ]
            },
            # Tick 6: ApexBot locks winner at $404.00
            {
                "tick": 6,
                "is_complete": True,
                "winner_id": "apex",
                "winning_bid": 404.0,
                "lowest_bid": 404.0,
                "savings": 46.0,
                "leader_id": "apex",
                "merchants": [
                    {**merchants["apex"], "currentBid": 404.0, "bid": 404.0, "delta": 1.5, "deltaKey": 4, "sweepKey": 3, "margin": calc_margin(404.0, cost), "state": "winner", "status": "Winner", "statusLabel": "Winner", "thought": "Winning bid locked at $404.00 ($1.00 under SoundWave's floor, 5.9% margin)."},
                    {**merchants["wave"], "currentBid": 405.0, "bid": 405.0, "delta": None, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(405.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $405.00. Cannot bid lower."},
                    {**merchants["metro"], "currentBid": 415.0, "bid": 415.0, "delta": None, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(415.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $415.00. Cannot bid lower."}
                ]
            }
        ]

    else:
        # HERMAN MILLER AERON: Retail $1200.00, Cost $950.00, Cap $1050.00
        # Floors: Metro $1040.00, Wave $1020.00, Apex $990.00 -> Winner: Apex @ $1018.50
        plan = [
            # Tick 1: Opening entrance. MetroBot takes early lead at $1048.00
            {
                "tick": 1,
                "leader_id": "metro",
                "lowest_bid": 1048.0,
                "merchants": [
                    {**merchants["metro"], "currentBid": 1048.0, "bid": 1048.0, "delta": 152.0, "deltaKey": 1, "sweepKey": 1, "margin": calc_margin(1048.0, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Taking early Round 1 lead at $1048.00 (-12.7% below retail list)."},
                    {**merchants["wave"], "currentBid": 1049.0, "bid": 1049.0, "delta": 141.0, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(1049.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": f"Entering below buyer ${buyer_cap:.2f} cap at $1049.00."},
                    {**merchants["apex"], "currentBid": 1050.0, "bid": 1050.0, "delta": 130.0, "deltaKey": 1, "sweepKey": 0, "margin": calc_margin(1050.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "PayPal authorization verified. Opening wholesale bid at $1050.00 cap."}
                ]
            },
            # Tick 2: WaveBot undercuts to $1035.00
            {
                "tick": 2,
                "leader_id": "wave",
                "lowest_bid": 1035.0,
                "merchants": [
                    {**merchants["wave"], "currentBid": 1035.0, "bid": 1035.0, "delta": 14.0, "deltaKey": 2, "sweepKey": 1, "margin": calc_margin(1035.0, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Undercutting Metro Audio to $1035.00 to capture first position."},
                    {**merchants["apex"], "currentBid": 1038.0, "bid": 1038.0, "delta": 12.0, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(1038.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Stepping down to $1038.00 while maintaining 8.5% gross margin."},
                    {**merchants["metro"], "currentBid": 1044.0, "bid": 1044.0, "delta": 4.0, "deltaKey": 2, "sweepKey": 0, "margin": calc_margin(1044.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Holding at $1044.00. Analyzing SoundWave counter-bid."}
                ]
            },
            # Tick 3: MetroBot hits $1040.00 floor; ApexBot leads at $1028.00
            {
                "tick": 3,
                "leader_id": "apex",
                "lowest_bid": 1028.0,
                "merchants": [
                    {**merchants["apex"], "currentBid": 1028.0, "bid": 1028.0, "delta": 10.0, "deltaKey": 3, "sweepKey": 2, "margin": calc_margin(1028.0, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Metro Audio stopped at floor. Stepping into the lead at $1028.00."},
                    {**merchants["wave"], "currentBid": 1032.0, "bid": 1032.0, "delta": 3.0, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(1032.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Preparing counter-bid against Apex Wholesale."},
                    {**merchants["metro"], "currentBid": 1040.0, "bid": 1040.0, "delta": 4.0, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(1040.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $1040.00 (8.7% minimum floor margin). Holding position."}
                ]
            },
            # Tick 4: WaveBot undercuts to $1022.00
            {
                "tick": 4,
                "leader_id": "wave",
                "lowest_bid": 1022.0,
                "merchants": [
                    {**merchants["wave"], "currentBid": 1022.0, "bid": 1022.0, "delta": 10.0, "deltaKey": 4, "sweepKey": 2, "margin": calc_margin(1022.0, cost), "state": "bidding", "status": "Leading", "statusLabel": "Leading", "thought": "Pushing counter-offer to $1022.00 ($2.00 above our $1020.00 floor)."},
                    {**merchants["apex"], "currentBid": 1025.0, "bid": 1025.0, "delta": 3.0, "deltaKey": 4, "sweepKey": 0, "margin": calc_margin(1025.0, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Analyzing SoundWave Direct aggressive drop to $1022.00."},
                    {**merchants["metro"], "currentBid": 1040.0, "bid": 1040.0, "delta": None, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(1040.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $1040.00. Cannot bid lower."}
                ]
            },
            # Tick 5: WaveBot hits $1020.00 floor; Apex tests at $1020.50
            {
                "tick": 5,
                "leader_id": "wave",
                "lowest_bid": 1020.0,
                "merchants": [
                    {**merchants["wave"], "currentBid": 1020.0, "bid": 1020.0, "delta": 2.0, "deltaKey": 5, "sweepKey": 0, "margin": calc_margin(1020.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $1020.00 (6.9% minimum floor margin). Cannot bid lower."},
                    {**merchants["apex"], "currentBid": 1020.5, "bid": 1020.5, "delta": 4.5, "deltaKey": 5, "sweepKey": 0, "margin": calc_margin(1020.5, cost), "state": "bidding", "status": "Bidding", "statusLabel": "Bidding", "thought": "Testing SoundWave Direct reserve threshold at $1020.50..."},
                    {**merchants["metro"], "currentBid": 1040.0, "bid": 1040.0, "delta": None, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(1040.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $1040.00. Cannot bid lower."}
                ]
            },
            # Tick 6: ApexBot wins at $1018.50
            {
                "tick": 6,
                "is_complete": True,
                "winner_id": "apex",
                "winning_bid": 1018.5,
                "lowest_bid": 1018.5,
                "savings": 181.5,
                "leader_id": "apex",
                "merchants": [
                    {**merchants["apex"], "currentBid": 1018.5, "bid": 1018.5, "delta": 2.0, "deltaKey": 6, "sweepKey": 3, "margin": calc_margin(1018.5, cost), "state": "winner", "status": "Winner", "statusLabel": "Winner", "thought": "Winning bid locked at $1018.50 ($1.50 under SoundWave's floor, 6.7% margin)."},
                    {**merchants["wave"], "currentBid": 1020.0, "bid": 1020.0, "delta": None, "deltaKey": 5, "sweepKey": 0, "margin": calc_margin(1020.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $1020.00. Cannot bid lower."},
                    {**merchants["metro"], "currentBid": 1040.0, "bid": 1040.0, "delta": None, "deltaKey": 3, "sweepKey": 0, "margin": calc_margin(1040.0, cost), "state": "floor", "status": "Floor reached", "statusLabel": "Floor reached", "thought": "Floor reached at $1040.00. Cannot bid lower."}
                ]
            }
        ]

    # Stream out the plan ticks every 1.5s
    for step in plan:
        # Sync reasoning with thought
        for m in step["merchants"]:
            if "thought" in m and "reasoning" not in m:
                m["reasoning"] = m["thought"]

        payload = {
            **step,
            "product_id": prod_key
        }
        yield json.dumps(payload)

        if not step.get("is_complete", False):
            await asyncio.sleep(1.5)
            if await request.is_disconnected():
                return


@app.get("/api/bounty/stream")
async def bounty_stream(
    request: Request,
    cap: float = Query(240.0, description="Buyer Max Spend Cap"),
    product_id: str = Query("sony_xm5", description="Product identifier (sony_xm5, dell_4k, herman_miller)")
):
    """
    SSE Bidding Stream with 1.5-second time-warp tick loop.
    Accepts ?cap={buyer_cap} and ?product_id={product_id}.
    Emits JSON payload with current bid, margin, status, and reasoning for each bot.
    """
    return EventSourceResponse(generate_bounty_stream(request, cap, product_id))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
