"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useMapEvents, type FetchParams } from "@/hooks/useEvents";
import { useSearchParams } from "next/navigation";
import { Event } from "@/lib/mockEvents";
import { format } from "date-fns";
import { Calendar, MapPin, Users, ExternalLink, Navigation, Loader2, AlertCircle } from "lucide-react";
import { TOKYO_CENTER } from "@/lib/geocoder";
import { useEffect } from "react";

// ── Custom marker icons ────────────────────────────────────────────────────

function makePinIcon(color: string, emoji: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
    html: `
      <div style="
        width:36px;height:44px;
        display:flex;flex-direction:column;
        align-items:center;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
      ">
        <div style="
          width:32px;height:32px;
          background:${color};
          border-radius:50%;
          border:2.5px solid #fff;
          display:flex;align-items:center;justify-content:center;
          font-size:15px;
          line-height:1;
        ">${emoji}</div>
        <div style="
          width:0;height:0;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-top:10px solid ${color};
          margin-top:-1px;
        "></div>
      </div>
    `,
  });
}

const TECH_ICON     = makePinIcon("#3B82F6", "⚡");
const CREATIVE_ICON = makePinIcon("#EC4899", "🎨");

// ── Navigate button URL ────────────────────────────────────────────────────

function navigateUrl(event: Event): string {
  const query = encodeURIComponent(event.address || event.venue);
  // Works on iOS (Apple Maps), Android (Google Maps), desktop (Google Maps)
  const isIOS = typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) return `maps://maps.apple.com/?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// ── Fly-to on filter change ────────────────────────────────────────────────

function MapFitter({ events }: { events: Event[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = events.filter(
      (e) => e.lat !== undefined && e.lng !== undefined
    );
    if (valid.length === 0) {
      map.setView(TOKYO_CENTER, 12);
      return;
    }
    if (valid.length === 1) {
      map.setView([valid[0].lat!, valid[0].lng!], 14);
      return;
    }
    const bounds = L.latLngBounds(
      valid.map((e) => [e.lat!, e.lng!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  // Re-fit only when event set changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.map((e) => e.id).join(",")]);

  return null;
}

// ── Event popup card ──────────────────────────────────────────────────────

function EventPopup({ event }: { event: Event }) {
  const isNow =
    new Date() >= new Date(event.date) &&
    new Date() <= new Date(event.endDate ?? new Date(new Date(event.date).getTime() + 2 * 3600000));

  return (
    <div className="min-w-[260px] max-w-[300px]">
      {/* Category + "Live" badge row */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${
            event.category === "Tech" ? "bg-blue-500" : "bg-pink-500"
          }`}
        >
          {event.category}
        </span>
        {isNow && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-500 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
            Live
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-gray-900 leading-snug mb-2 line-clamp-2">
        {event.title}
      </h3>

      {/* Meta */}
      <div className="space-y-1 mb-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="text-blue-400 shrink-0" />
          <span>{format(new Date(event.date), "EEE, MMM d · h:mm a")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={11} className="text-pink-400 shrink-0" />
          <span className="truncate">{event.venue}</span>
        </div>
        {event.attendees > 0 && (
          <div className="flex items-center gap-1.5">
            <Users size={11} className="text-gray-400 shrink-0" />
            <span>{event.attendees} going</span>
          </div>
        )}
        {event.price && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase">Price</span>
            <span className="font-medium text-gray-700">{event.price}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
        >
          <ExternalLink size={11} />
          View Event
        </a>
        <a
          href={navigateUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          <Navigation size={11} />
          Navigate
        </a>
      </div>
    </div>
  );
}

// ── Legend overlay ────────────────────────────────────────────────────────

function MapLegend({ total, stale }: { total: number; stale: boolean }) {
  return (
    <div className="absolute bottom-6 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-3 py-2 flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm" />
        <span className="text-gray-600">Tech</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-pink-500 border border-white shadow-sm" />
        <span className="text-gray-600">Creative</span>
      </div>
      <div className="w-px h-4 bg-gray-200" />
      <span className="text-gray-500">
        {total} event{total !== 1 ? "s" : ""}
        {stale && (
          <span className="ml-1.5 text-amber-500" title="Showing cached data — refreshing…">
            ·&nbsp;refreshing
          </span>
        )}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MapInner() {
  const searchParams = useSearchParams();
  const params: FetchParams = {
    q:          searchParams.get("q")          ?? "",
    source:     searchParams.get("source")     ?? "",
    category:   searchParams.get("category")   ?? "",
    timeFilter: searchParams.get("timeFilter") ?? "",
    dateFrom:   searchParams.get("dateFrom")   ?? "",
    dateTo:     searchParams.get("dateTo")     ?? "",
  };

  const { data, isLoading, isError } = useMapEvents(params);
  const events = (data?.events ?? []).filter(
    (e) => e.lat !== undefined && e.lng !== undefined
  );

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={TOKYO_CENTER}
        zoom={12}
        className="w-full h-full z-0"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapFitter events={events} />

        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat!, event.lng!]}
            icon={event.category === "Creative" ? CREATIVE_ICON : TECH_ICON}
          >
            <Popup minWidth={260} maxWidth={320} closeButton={true}>
              <EventPopup event={event} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Loading / error overlays */}
      {isLoading && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-gray-500" size={28} />
            <p className="text-sm text-gray-500">Loading events…</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={14} />
          Failed to load events
        </div>
      )}

      {!isLoading && <MapLegend total={events.length} stale={data?.stale ?? false} />}
    </div>
  );
}
