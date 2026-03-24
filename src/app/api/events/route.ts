import { NextRequest, NextResponse } from "next/server";
import { mockEvents, Event } from "@/lib/mockEvents";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
  "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800&q=80",
  "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80",
];

function fallbackImage(seed: string) {
  const i = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
}

async function fetchDoorkeeper(params: {
  q: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}): Promise<Event[]> {
  const token = process.env.DOORKEEPER_API_TOKEN;
  if (!token) return [];

  const sp = new URLSearchParams({
    prefecture: "tokyo",
    locale: "en",
    page: String(params.page),
  });
  if (params.q) sp.set("q", params.q);
  if (params.dateFrom) sp.set("since", new Date(params.dateFrom).toISOString());
  if (params.dateTo) sp.set("until", new Date(params.dateTo).toISOString());

  const res = await fetch(`https://api.doorkeeper.jp/events?${sp}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];

  const data: Array<{ event: Record<string, unknown> }> = await res.json();
  return data.map(({ event: e }) => ({
    id: `dk-${e.id}`,
    title: String(e.title ?? ""),
    date: String(e.starts_at ?? ""),
    endDate: e.ends_at ? String(e.ends_at) : undefined,
    venue: String(e.venue_name ?? "Tokyo"),
    address: String(e.address ?? "Tokyo, Japan"),
    source: "doorkeeper" as const,
    tags: [],
    image: fallbackImage(String(e.id)),
    url: String(e.public_url ?? "https://www.doorkeeper.jp"),
    description: String(e.description ?? "").replace(/<[^>]+>/g, "").slice(0, 200),
    attendees: Number(e.participants ?? 0),
  }));
}

async function fetchLuma(params: {
  q: string;
  dateFrom: string;
}): Promise<Event[]> {
  const sp = new URLSearchParams({
    discover_place_api_id: "discplace-9H7asQEvWiv6DA9",
    pagination_limit: "50",
  });
  if (params.q) sp.set("query", params.q);

  const res = await fetch(
    `https://api.lu.ma/discover/get-paginated-events?${sp}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return [];

  const data: { entries?: Array<Record<string, unknown>> } = await res.json();
  const entries = data.entries ?? [];

  return entries
    .map((entry) => {
      const e = entry.event as Record<string, unknown> | undefined;
      if (!e) return null;
      const geo = e.geo_address_info as Record<string, string> | undefined;
      return {
        id: `luma-${e.api_id}`,
        title: String(e.name ?? ""),
        date: String(e.start_at ?? ""),
        endDate: e.end_at ? String(e.end_at) : undefined,
        venue: geo?.address ?? "Tokyo",
        address: geo?.full_address ?? geo?.city_state ?? "Tokyo, Japan",
        source: "luma" as const,
        tags: [],
        image: e.cover_url ? String(e.cover_url) : fallbackImage(String(e.api_id)),
        url: `https://lu.ma/${e.url}`,
        description: "",
        attendees: Number((entry as Record<string, unknown>).guest_count ?? 0),
      } satisfies Event;
    })
    .filter((e): e is Event => e !== null);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const source = searchParams.get("source") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // Fetch from real APIs in parallel, fall back to mock if both unavailable
  const [doorkeeperEvents, lumaEvents] = await Promise.all([
    source === "luma" ? [] : fetchDoorkeeper({ q, dateFrom, dateTo, page }),
    source === "doorkeeper" ? [] : fetchLuma({ q, dateFrom }),
  ]);

  const hasRealData = doorkeeperEvents.length > 0 || lumaEvents.length > 0;
  let events: Event[] = hasRealData
    ? [...doorkeeperEvents, ...lumaEvents]
    : [...mockEvents];

  // Client-side filter for mock fallback / Luma (which doesn't filter server-side)
  if (q && !hasRealData) {
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.venue.toLowerCase().includes(q)
    );
  }
  if (source === "doorkeeper" || source === "luma") {
    events = events.filter((e) => e.source === source);
  }
  if (dateFrom) {
    events = events.filter((e) => new Date(e.date) >= new Date(dateFrom));
  }
  if (dateTo) {
    events = events.filter((e) => new Date(e.date) <= new Date(dateTo));
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Doorkeeper is already paginated server-side; Luma + mock paginate here
  const start = hasRealData && doorkeeperEvents.length > 0 ? 0 : (page - 1) * limit;
  const paginated = hasRealData ? events.slice(0, limit) : events.slice(start, start + limit);
  const hasMore = hasRealData ? doorkeeperEvents.length === 25 : start + limit < events.length;

  return NextResponse.json({
    events: paginated,
    hasMore,
    total: events.length,
    page,
  });
}
