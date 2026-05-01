import { NextRequest, NextResponse } from "next/server";
import { mockEvents, Event, EventCategory } from "@/lib/mockEvents";
import { classifyEvent } from "@/lib/sources.config";
import { getEvents } from "@/lib/scraper.worker";
import { geocodeAddress, TOKYO_CENTER } from "@/lib/geocoder";

// ── Time filter helpers ────────────────────────────────────────────────────

function toJST(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function isHappeningNow(event: Event): boolean {
  const now = new Date();
  const start = new Date(event.date);
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000); // assume 2h if no endDate
  return now >= start && now <= end;
}

function isToday(event: Event): boolean {
  const nowJST = toJST(new Date());
  const startJST = toJST(new Date(event.date));
  return (
    startJST.getFullYear() === nowJST.getFullYear() &&
    startJST.getMonth() === nowJST.getMonth() &&
    startJST.getDate() === nowJST.getDate()
  );
}

function isTomorrow(event: Event): boolean {
  const nowJST = toJST(new Date());
  const tomorrowJST = new Date(nowJST);
  tomorrowJST.setDate(nowJST.getDate() + 1);
  const startJST = toJST(new Date(event.date));
  return (
    startJST.getFullYear() === tomorrowJST.getFullYear() &&
    startJST.getMonth() === tomorrowJST.getMonth() &&
    startJST.getDate() === tomorrowJST.getDate()
  );
}

// ── Geocode events that lack coordinates ──────────────────────────────────

function withCoords(event: Event): Event {
  if (event.lat !== undefined && event.lng !== undefined) return event;
  const coords = geocodeAddress(event.address, event.url) ??
    geocodeAddress(event.venue, event.url) ??
    TOKYO_CENTER;
  return { ...event, lat: coords[0], lng: coords[1] };
}

// ── Convert scraped ProcessedEvent → Event ─────────────────────────────────

// ProcessedEvent is structurally compatible with Event — only a cast needed
function asEvent(e: Record<string, unknown>): Event {
  return e as unknown as Event;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q           = searchParams.get("q")?.toLowerCase() ?? "";
  const source      = searchParams.get("source") ?? "";
  const category    = (searchParams.get("category") ?? "") as EventCategory | "";
  const timeFilter  = searchParams.get("timeFilter") ?? ""; // now | today | tomorrow
  const dateFrom    = searchParams.get("dateFrom") ?? "";
  const dateTo      = searchParams.get("dateTo") ?? "";
  const page        = parseInt(searchParams.get("page") ?? "1");
  const limit       = parseInt(searchParams.get("limit") ?? "20");
  const all         = searchParams.get("all") === "true"; // map view: skip pagination

  // ── Database-First: try scraped cache, fall back to mock ─────────────────
  const { events: scraped, stale } = await getEvents(
    "tokyo",
    category || undefined
  );

  const hasScraper = scraped.length > 0;

  // Build base list: scraped events take priority; mock data fills gaps
  let events: Event[] = hasScraper
    ? scraped.map((e) => asEvent(e as unknown as Record<string, unknown>))
    : mockEvents.map((e) =>
        category ? { ...e, category: category as EventCategory } : e
      );

  // ── Apply filters ─────────────────────────────────────────────────────────
  if (q) {
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.venue.toLowerCase().includes(q)
    );
  }

  if (category) {
    events = events.filter((e) => e.category === category);
  }

  if (source) {
    events = events.filter((e) => e.source === source);
  }

  if (timeFilter === "now") {
    events = events.filter(isHappeningNow);
  } else if (timeFilter === "today") {
    events = events.filter(isToday);
  } else if (timeFilter === "tomorrow") {
    events = events.filter(isTomorrow);
  } else {
    // Default: only show upcoming events
    const now = new Date();
    events = events.filter((e) => new Date(e.date) >= now);
  }

  if (dateFrom) {
    events = events.filter((e) => new Date(e.date) >= new Date(dateFrom));
  }

  if (dateTo) {
    events = events.filter((e) => new Date(e.date) <= new Date(dateTo));
  }

  // ── Ensure every event has a category and coordinates ────────────────────
  events = events
    .map((e) =>
      e.category
        ? e
        : { ...e, category: classifyEvent(e.title, e.tags, "Tech") as EventCategory }
    )
    .map(withCoords);

  // ── Sort by date ascending ────────────────────────────────────────────────
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ── Paginate (skip when map view requests all) ────────────────────────────
  const total = events.length;

  if (all) {
    return NextResponse.json({ events, total, stale });
  }

  const start    = (page - 1) * limit;
  const paginated = events.slice(start, start + limit);
  const hasMore  = start + limit < total;

  return NextResponse.json({ events: paginated, hasMore, total, page, stale });
}
