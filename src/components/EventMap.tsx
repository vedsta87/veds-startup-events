"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Loading map…</p>
      </div>
    </div>
  ),
});

export function EventMap() {
  return <MapInner />;
}
