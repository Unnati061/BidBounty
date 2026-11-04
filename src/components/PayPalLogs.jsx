import React from 'react';

const PayPalLogs = ({ apiLogs, setActiveView }) => {
  return (
    <section className="space-y-5 pt-2">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-base font-semibold text-[#F2F4F8]">PayPal Sandbox API Telemetry</h2>
          <p className="text-xs text-[#9AA3B2] mt-0.5">
            Real-time payloads for Orders v2, Authorize, Partial Capture, Void, and Sandbox Mock Tracking.
          </p>
        </div>
        <button
          onClick={() => setActiveView('arena')}
          className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-[#0F1117] text-xs text-[#9AA3B2] hover:text-[#F2F4F8]"
        >
          Back to Arena
        </button>
      </div>

      {apiLogs.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#9AA3B2] border border-white/[0.06] bg-[#0F1117] rounded-xl">
          No PayPal API telemetry recorded yet. Authorize a bounty in the Live Arena to inspect calls.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06] border border-white/[0.06] bg-[#0F1117] rounded-xl">
          {apiLogs.map((log) => (
            <div key={log.id} className="p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <div className="flex items-center gap-2.5">
                  <span className="text-[#38BDF8] font-medium">{log.method}</span>
                  <span className="text-[#F2F4F8]">{log.endpoint}</span>
                </div>
                <span className="text-[#9AA3B2]">
                  {log.status} · {log.timestamp}
                </span>
              </div>
              <p className="text-[#9AA3B2]">{log.summary}</p>
              <pre className="text-[11px] font-mono text-[#9AA3B2] bg-[#08090C] p-3 rounded-lg border border-white/[0.06] overflow-x-auto">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PayPalLogs;
