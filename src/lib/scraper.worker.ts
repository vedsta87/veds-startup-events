/**
 * scraper.worker.ts — Server-side only. Do not import in client components.
 *
 * Implements:
 *  - Zod validation for all scraped events
 *  - URL-based + Title+Date deduplication across sources
 *  - In-memory 6-hour cache (Database-First strategy)
 *  - Individual adapters for 9 event sources
 *  - Fire-and-forget background refresh (wire into waitUntil() for edge runtimes)
 */

import { z } from "zod";
import { classifyEvent, SOURCES, type EventCategory, type SourceId } from "./sources.config";

// ── Zod schema ─────────────────────────────────────────────────────────────

const ScrapedEventSchema = z.object({
  title: z.string().min(1, "Title required"),
  date: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }).optional(),
  venue: z.string().min(1, "Venue required"),
  address: z.string().min(1, "Address required for geocoding"),
  url: z.string().url("URL required for deduplication"),
  source: z.enum([
    "eventbrite", "luma", "meetup",
    "tokyoartbeat", "timeout", "residentadvisor",
    "venturecafe", "tokyodev", "doorkeeper",
  ]),
  description: z.string().default(""),
  image: z.string().optional(),
  tags: z.array(z.string()).default([]),
  price: z.string().optional(),
  attendees: z.number().int().min(0).default(0),
});

type ScrapedEvent = z.infer<typeof ScrapedEventSchema>;

export interface ProcessedEvent extends ScrapedEvent {
  id: string;
  category: EventCategory;
  image: string;
  scrapedAt: string;
}

// ── Deduplication engine ───────────────────────────────────────────────────

class DeduplicationEngine {
  private seenUrls = new Set<string>();
  private seenTitleDates = new Set<string>();

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach((p) =>
        u.searchParams.delete(p)
      );
      return `${u.host.toLowerCase()}${u.pathname.replace(/\/$/, "")}`;
    } catch {
      return url.toLowerCase().trim();
    }
  }

  private titleDateKey(title: string, date: string): string {
    const norm = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");
    return `${norm}::${date.slice(0, 10)}`; // YYYY-MM-DD granularity
  }

  isDuplicate(event: Pick<ScrapedEvent, "url" | "title" | "date">): boolean {
    return (
      this.seenUrls.has(this.normalizeUrl(event.url)) ||
      this.seenTitleDates.has(this.titleDateKey(event.title, event.date))
    );
  }

  register(event: Pick<ScrapedEvent, "url" | "title" | "date">): void {
    this.seenUrls.add(this.normalizeUrl(event.url));
    this.seenTitleDates.add(this.titleDateKey(event.title, event.date));
  }
}

// ── In-memory cache ────────────────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry {
  events: ProcessedEvent[];
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const pendingRefresh = new Set<string>();

function cacheKey(city: string, category?: EventCategory): string {
  return `${city.toLowerCase()}:${category ?? "all"}`;
}

function isStale(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt > CACHE_TTL_MS;
}

// ── Shared utilities ───────────────────────────────────────────────────────

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
  "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800&q=80",
  "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80",
];

function seedImage(seed: string): string {
  const i = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function htmlFetch(url: string): Promise<string> {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

function safeIso(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}

function generateId(source: string, url: string): string {
  const hash = [...url].reduce((a, c) => a + c.charCodeAt(0), 0).toString(36);
  return `${source}-${hash}`;
}

function finalize(
  raw: ScrapedEvent,
  dedup: DeduplicationEngine
): ProcessedEvent | null {
  if (dedup.isDuplicate(raw)) return null;
  dedup.register(raw);
  const cfg = SOURCES[raw.source as SourceId];
  return {
    ...raw,
    id: generateId(raw.source, raw.url),
    image: raw.image || seedImage(raw.url),
    category: classifyEvent(raw.title, raw.tags, cfg?.defaultCategory ?? "Tech"),
    scrapedAt: new Date().toISOString(),
  };
}

// ── Adapter: Eventbrite ────────────────────────────────────────────────────

async function scrapeEventbrite(city: string): Promise<ScrapedEvent[]> {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) return [];

  const base = new URLSearchParams({
    "location.address": `${city}, Japan`,
    "location.within": "20km",
    "start_date.range_start": new Date().toISOString(),
    expand: "venue,ticket_classes",
    page_size: "50",
  });

  const [techRes, creativeRes] = await Promise.allSettled([
    fetch(`https://www.eventbriteapi.com/v3/events/search/?${base}&q=tech+startup`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`https://www.eventbriteapi.com/v3/events/search/?${base}&q=art+music+festival`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const results: ScrapedEvent[] = [];

  for (const settled of [techRes, creativeRes]) {
    if (settled.status !== "fulfilled" || !settled.value.ok) continue;

    const data: {
      events?: Array<{
        name: { text: string };
        start: { utc: string };
        end: { utc: string };
        url: string;
        description?: { text?: string } | null;
        is_free: boolean;
        ticket_classes?: Array<{ cost?: { display: string } }>;
        venue?: { name: string; address: { localized_address_display: string } } | null;
      }>;
    } = await settled.value.json();

    for (const e of data.events ?? []) {
      const price = e.is_free
        ? "Free"
        : (e.ticket_classes?.[0]?.cost?.display ?? undefined);

      const parsed = ScrapedEventSchema.safeParse({
        title: e.name.text,
        date: e.start.utc.endsWith("Z") ? e.start.utc : `${e.start.utc}Z`,
        endDate: safeIso(e.end.utc),
        venue: e.venue?.name ?? city,
        address: e.venue?.address.localized_address_display ?? `${city}, Japan`,
        url: e.url,
        source: "eventbrite",
        description: e.description?.text?.slice(0, 300) ?? "",
        price,
        tags: [],
      });
      if (parsed.success) results.push(parsed.data);
    }
  }

  return results;
}

// ── Adapter: Luma ──────────────────────────────────────────────────────────

async function scrapeLuma(_city: string): Promise<ScrapedEvent[]> {
  const sp = new URLSearchParams({
    discover_place_api_id: "discplace-9H7asQEvWiv6DA9", // Tokyo hub
    pagination_limit: "50",
  });

  const res = await fetch(`https://api.lu.ma/discover/get-paginated-events?${sp}`);
  if (!res.ok) return [];

  const data: { entries?: Array<Record<string, unknown>> } = await res.json();
  const results: ScrapedEvent[] = [];

  for (const entry of data.entries ?? []) {
    const e = entry.event as Record<string, unknown> | undefined;
    if (!e) continue;
    const geo = e.geo_address_info as Record<string, string> | undefined;

    const parsed = ScrapedEventSchema.safeParse({
      title: String(e.name ?? ""),
      date: String(e.start_at ?? ""),
      endDate: e.end_at ? String(e.end_at) : undefined,
      venue: geo?.address ?? "Tokyo",
      address: geo?.full_address ?? geo?.city_state ?? "Tokyo, Japan",
      url: `https://lu.ma/${e.url}`,
      source: "luma",
      image: e.cover_url ? String(e.cover_url) : undefined,
      attendees: Number((entry as Record<string, unknown>).guest_count ?? 0),
      tags: [],
    });
    if (parsed.success) results.push(parsed.data);
  }

  return results;
}

// ── Adapter: Meetup ────────────────────────────────────────────────────────

async function scrapeMeetup(city: string): Promise<ScrapedEvent[]> {
  // REST v2 legacy endpoint — no OAuth needed for public events
  const sp = new URLSearchParams({
    country: "JP",
    city,
    topic: "technology",
    time: ",1m",
    page: "50",
    sign: "false",
    status: "upcoming",
    ...(process.env.MEETUP_API_KEY ? { key: process.env.MEETUP_API_KEY } : {}),
  });

  const res = await fetch(`https://api.meetup.com/2/open_events?${sp}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const data: {
    results?: Array<{
      name: string;
      time: number;
      duration?: number;
      venue?: { name: string; address_1?: string; city?: string };
      event_url: string;
      description?: string;
      yes_rsvp_count: number;
      fee?: { amount: number; currency: string };
    }>;
  } = await res.json();

  const results: ScrapedEvent[] = [];

  for (const e of data.results ?? []) {
    const start = new Date(e.time).toISOString();
    const end = e.duration ? new Date(e.time + e.duration).toISOString() : undefined;
    const addr = [e.venue?.address_1, e.venue?.city, "Japan"].filter(Boolean).join(", ");

    const parsed = ScrapedEventSchema.safeParse({
      title: e.name,
      date: start,
      endDate: end,
      venue: e.venue?.name ?? city,
      address: addr || `${city}, Japan`,
      url: e.event_url,
      source: "meetup",
      description: e.description?.replace(/<[^>]+>/g, "").slice(0, 300) ?? "",
      attendees: e.yes_rsvp_count,
      price: e.fee ? `${e.fee.currency} ${e.fee.amount}` : "Free",
      tags: [],
    });
    if (parsed.success) results.push(parsed.data);
  }

  return results;
}

// ── Adapter: Tokyo Art Beat ────────────────────────────────────────────────
// Site is partially SSR. Upgrade to Puppeteer if selector yield drops below ~5 events.

async function scrapeTokyoArtBeat(): Promise<ScrapedEvent[]> {
  const { load } = await import("cheerio");
  const html = await htmlFetch("https://www.tokyoartbeat.com/events");
  const $ = load(html);
  const results: ScrapedEvent[] = [];

  $("article, [class*='EventCard'], [class*='event-card'], [class*='event-item']").each((_, el) => {
    const title = $(el).find("h2, h3, [class*='title'], [class*='Title']").first().text().trim();
    const dateAttr =
      $(el).find("time").first().attr("datetime") ??
      $(el).find("[class*='date'], [class*='Date']").first().text().trim();
    const href = $(el).find("a[href]").first().attr("href") ?? "";
    const image = $(el).find("img").first().attr("src") ?? $(el).find("img").first().attr("data-src");
    const venue = $(el).find("[class*='venue'], [class*='location']").first().text().trim();

    if (!title || !href) return;

    const url = href.startsWith("http") ? href : `https://www.tokyoartbeat.com${href}`;
    const date = safeIso(dateAttr) ?? new Date().toISOString();

    const parsed = ScrapedEventSchema.safeParse({
      title,
      date,
      venue: venue || "Tokyo",
      address: `${venue || "Tokyo"}, Japan`,
      url,
      source: "tokyoartbeat",
      image,
      tags: ["art", "exhibition", "gallery"],
    });
    if (parsed.success) results.push(parsed.data);
  });

  return results;
}

// ── Adapter: TimeOut Tokyo ─────────────────────────────────────────────────
// JS-heavy sections may be empty; Puppeteer gives full yield.

async function scrapeTimeOutTokyo(): Promise<ScrapedEvent[]> {
  const { load } = await import("cheerio");
  const html = await htmlFetch("https://www.timeout.com/tokyo/events");
  const $ = load(html);
  const results: ScrapedEvent[] = [];

  $("article, [class*='card'], [class*='Card'], [class*='listing']").each((_, el) => {
    const title = $(el).find("h3, h4, [class*='title'], [class*='Title']").first().text().trim();
    const dateAttr =
      $(el).find("time").first().attr("datetime") ??
      $(el).find("[class*='date'], [class*='Date']").first().text().trim();
    const href = $(el).find("a[href]").first().attr("href") ?? "";
    const venue = $(el).find("[class*='venue'], [class*='location']").first().text().trim();
    const image = $(el).find("img").first().attr("src") ?? $(el).find("img").first().attr("data-src");

    if (!title || !href) return;

    const url = href.startsWith("http") ? href : `https://www.timeout.com${href}`;
    const date = safeIso(dateAttr) ?? new Date().toISOString();

    const parsed = ScrapedEventSchema.safeParse({
      title,
      date,
      venue: venue || "Tokyo",
      address: `${venue || "Tokyo"}, Japan`,
      url,
      source: "timeout",
      image,
      tags: ["culture", "festival"],
    });
    if (parsed.success) results.push(parsed.data);
  });

  return results;
}

// ── Adapter: Resident Advisor ──────────────────────────────────────────────
// RA is a Next.js SPA; event data is embedded in __NEXT_DATA__ on first load.

async function scrapeResidentAdvisor(): Promise<ScrapedEvent[]> {
  const html = await htmlFetch("https://ra.co/events/jp/tokyo");
  const results: ScrapedEvent[] = [];

  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return results;

  try {
    const nextData = JSON.parse(match[1]);
    const listings: unknown[] =
      nextData?.props?.pageProps?.data?.eventListings?.data ??
      nextData?.props?.pageProps?.listings ??
      [];

    for (const item of listings) {
      const e = (item as Record<string, unknown>).event ?? item;
      if (typeof e !== "object" || !e) continue;
      const ev = e as Record<string, unknown>;
      if (!ev.title || !ev.date) continue;

      const parsed = ScrapedEventSchema.safeParse({
        title: String(ev.title),
        date: safeIso(String(ev.date)) ?? new Date().toISOString(),
        endDate: safeIso(ev.endTime as string | undefined),
        venue: (ev.venue as Record<string, unknown>)?.name ?? "Tokyo",
        address: [
          (ev.venue as Record<string, unknown>)?.address,
          ((ev.venue as Record<string, unknown>)?.area as Record<string, unknown>)?.name,
          "Tokyo, Japan",
        ]
          .filter(Boolean)
          .join(", "),
        url: `https://ra.co/events/${ev.id}`,
        source: "residentadvisor",
        image: (ev.flyer as Record<string, unknown>)?.filename as string | undefined,
        price: (ev.cost as string | undefined) ?? undefined,
        tags: ["music", "DJ", "club"],
      });
      if (parsed.success) results.push(parsed.data);
    }
  } catch {
    // __NEXT_DATA__ shape changed — switch to Puppeteer for reliable extraction
  }

  return results;
}

// ── Adapter: Venture Café Tokyo ────────────────────────────────────────────
// Runs Thursday Gatherings weekly at Shinagawa — mostly static HTML.

async function scrapeVentureCafe(): Promise<ScrapedEvent[]> {
  const { load } = await import("cheerio");
  const html = await htmlFetch("https://venturecafetokyo.org/sessions/");
  const $ = load(html);
  const results: ScrapedEvent[] = [];

  $(".session, article, [class*='event'], [class*='session-item'], .tribe-event").each((_, el) => {
    const title = $(el).find("h2, h3, .title, [class*='title']").first().text().trim();
    const dateAttr =
      $(el).find("time").first().attr("datetime") ??
      $(el).find(".date, [class*='date']").first().text().trim();
    const href = $(el).find("a[href]").first().attr("href") ?? "";
    const image = $(el).find("img").first().attr("src");

    if (!title || !href) return;

    const url = href.startsWith("http") ? href : `https://venturecafetokyo.org${href}`;
    const date = safeIso(dateAttr) ?? new Date().toISOString();

    const parsed = ScrapedEventSchema.safeParse({
      title,
      date,
      venue: "Venture Café Tokyo",
      address: "3-1-8 Higashishinagawa, Shinagawa-ku, Tokyo",
      url,
      source: "venturecafe",
      image,
      price: "Free",
      tags: ["startup", "networking", "innovation", "Thursday Gathering"],
    });
    if (parsed.success) results.push(parsed.data);
  });

  return results;
}

// ── Adapter: TokyoDev ──────────────────────────────────────────────────────

async function scrapeTokyoDev(): Promise<ScrapedEvent[]> {
  const { load } = await import("cheerio");
  const html = await htmlFetch("https://www.tokyodev.com/events");
  const $ = load(html);
  const results: ScrapedEvent[] = [];

  $("article, [class*='event'], li[class*='event'], .event-item").each((_, el) => {
    const title = $(el).find("h2, h3, [class*='title']").first().text().trim();
    const dateAttr =
      $(el).find("time").first().attr("datetime") ??
      $(el).find("[class*='date']").first().text().trim();
    const href = $(el).find("a[href]").first().attr("href") ?? "";
    const description = $(el).find("p, [class*='description']").first().text().trim();
    const venue = $(el).find("[class*='venue'], [class*='location']").first().text().trim();

    if (!title || !href) return;

    const url = href.startsWith("http") ? href : `https://www.tokyodev.com${href}`;
    const date = safeIso(dateAttr) ?? new Date().toISOString();

    const parsed = ScrapedEventSchema.safeParse({
      title,
      date,
      venue: venue || "Tokyo",
      address: venue ? `${venue}, Tokyo, Japan` : "Tokyo, Japan",
      url,
      source: "tokyodev",
      description: description.slice(0, 300),
      tags: ["dev", "engineering", "english-friendly"],
    });
    if (parsed.success) results.push(parsed.data);
  });

  return results;
}

// ── Adapter: Doorkeeper ────────────────────────────────────────────────────

async function scrapeDoorkeeper(city: string): Promise<ScrapedEvent[]> {
  const token = process.env.DOORKEEPER_API_TOKEN;
  if (!token) return [];

  const sp = new URLSearchParams({
    prefecture: city.toLowerCase() === "tokyo" ? "tokyo" : city.toLowerCase(),
    locale: "en",
    page: "1",
    since: new Date().toISOString(),
  });

  const res = await fetch(`https://api.doorkeeper.jp/events?${sp}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];

  const data: Array<{ event: Record<string, unknown> }> = await res.json();
  const results: ScrapedEvent[] = [];

  for (const { event: e } of data) {
    const parsed = ScrapedEventSchema.safeParse({
      title: String(e.title ?? ""),
      date: String(e.starts_at ?? ""),
      endDate: e.ends_at ? String(e.ends_at) : undefined,
      venue: String(e.venue_name ?? city),
      address: String(e.address ?? `${city}, Japan`),
      url: String(e.public_url ?? "https://www.doorkeeper.jp"),
      source: "doorkeeper",
      description: String(e.description ?? "").replace(/<[^>]+>/g, "").slice(0, 300),
      attendees: Number(e.participants ?? 0),
      price: e.ticket_limit ? undefined : "Free",
      tags: [],
    });
    if (parsed.success) results.push(parsed.data);
  }

  return results;
}

// ── Orchestrator ───────────────────────────────────────────────────────────

interface ScrapeJob {
  city: string;
  category?: EventCategory;
}

async function runScrapers(job: ScrapeJob): Promise<ProcessedEvent[]> {
  const { city, category } = job;
  const dedup = new DeduplicationEngine();

  const settled = await Promise.allSettled([
    scrapeEventbrite(city),
    scrapeLuma(city),
    scrapeMeetup(city),
    scrapeTokyoArtBeat(),
    scrapeTimeOutTokyo(),
    scrapeResidentAdvisor(),
    scrapeVentureCafe(),
    scrapeTokyoDev(),
    scrapeDoorkeeper(city),
  ]);

  const raw: ScrapedEvent[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") raw.push(...r.value);
    // silently skip failed adapters — partial data beats a total failure
  }

  raw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const processed: ProcessedEvent[] = [];
  for (const event of raw) {
    const p = finalize(event, dedup);
    if (!p) continue;
    if (category && p.category !== category) continue;
    processed.push(p);
  }

  return processed;
}

// ── Public API — Database-First strategy ──────────────────────────────────

/**
 * Returns events from cache if fresh (< 6 hours).
 * On stale/miss: returns stale data immediately and queues a background refresh.
 * On cold start (no cache at all): waits for the initial scrape.
 *
 * For edge/serverless runtimes, pass the refresh promise to `waitUntil()` so
 * the function isn't torn down before the cache write completes.
 */
export async function getEvents(
  city = "tokyo",
  category?: EventCategory
): Promise<{ events: ProcessedEvent[]; stale: boolean }> {
  const key = cacheKey(city, category);
  const entry = cache.get(key);

  if (entry && !isStale(entry)) {
    return { events: entry.events, stale: false };
  }

  if (!pendingRefresh.has(key)) {
    pendingRefresh.add(key);
    void runScrapers({ city, category })
      .then((events) => {
        cache.set(key, { events, cachedAt: Date.now() });
      })
      .finally(() => {
        pendingRefresh.delete(key);
      });
  }

  if (entry) {
    return { events: entry.events, stale: true };
  }

  // Cold start — return empty immediately so API can fall back to mock data.
  // The background scrape above will populate cache for the next request.
  return { events: [], stale: true };
}

export function getCacheStatus(city = "tokyo", category?: EventCategory) {
  const key = cacheKey(city, category);
  const entry = cache.get(key);
  if (!entry) return { hasCached: false, isStale: true, cachedAt: null, eventCount: 0 };
  return {
    hasCached: true,
    isStale: isStale(entry),
    cachedAt: new Date(entry.cachedAt).toISOString(),
    eventCount: entry.events.length,
  };
}

export function invalidateCache(city?: string): void {
  if (city) {
    for (const key of cache.keys()) {
      if (key.startsWith(city.toLowerCase())) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}
