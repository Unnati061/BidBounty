// Deterministic Merchant Agent Seed Data ($200 Wholesale Cost)
export const INITIAL_MERCHANTS = [
  {
    id: 'apex',
    botName: 'ApexBot',
    storeName: 'Apex Wholesale',
    variant: 'apex',
    listingPrice: 248.0,
    wholesaleCost: 200.0,
    hardFloor: 220.0,
    currentBid: 248.0,
    delta: null,
    deltaKey: 0,
    sweepKey: 0,
    state: 'idle',
    statusLabel: 'Standby',
    thought: 'Ready. Awaiting binding PayPal authorization to unlock private wholesale bids.'
  },
  {
    id: 'wave',
    botName: 'WaveBot',
    storeName: 'SoundWave Direct',
    variant: 'wave',
    listingPrice: 250.0,
    wholesaleCost: 200.0,
    hardFloor: 224.0,
    currentBid: 250.0,
    delta: null,
    deltaKey: 0,
    sweepKey: 0,
    state: 'idle',
    statusLabel: 'Standby',
    thought: 'Channel3 retail feed synced ($250.00). Floor reserve locked at $224.00.'
  },
  {
    id: 'metro',
    botName: 'MetroBot',
    storeName: 'Metro Audio',
    variant: 'metro',
    listingPrice: 255.0,
    wholesaleCost: 200.0,
    hardFloor: 229.0,
    currentBid: 255.0,
    delta: null,
    deltaKey: 0,
    sweepKey: 0,
    state: 'idle',
    statusLabel: 'Standby',
    thought: 'Private floor locked at $229.00 (12.7% minimum gross margin).'
  }
];

// Exact Margin Helper
export const calcMargin = (bid, cost) => (((bid - cost) / bid) * 100).toFixed(1);
