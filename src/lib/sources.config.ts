export type EventCategory = "Tech" | "Creative";

export const SOURCE_IDS = [
  "eventbrite",
  "luma",
  "meetup",
  "tokyoartbeat",
  "timeout",
  "residentadvisor",
  "venturecafe",
  "tokyodev",
  "doorkeeper",
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

export interface SourceConfig {
  id: SourceId;
  name: string;
  defaultCategory: EventCategory;
  baseUrl: string;
  type: "api" | "scrape";
  enabled: boolean;
  defaultTags: string[];
  rateLimitMs: number;
  requiresApiKey: boolean;
}

// ── Category classification signals ───────────────────────────────────────

const TECH_SIGNALS = [
  "startup", "ai", "artificial intelligence", "machine learning", "ml", "llm", "gpt",
  "blockchain", "web3", "crypto", "defi", "nft", "dao",
  "cloud", "devops", "kubernetes", "docker", "microservices", "serverless",
  "saas", "fintech", "healthtech", "edtech", "proptech", "climatetech", "deeptech",
  "hackathon", "pitch", "vc", "venture", "angel investor", "seed round",
  "developer", "dev", "coding", "software", "engineering", "programmer",
  "tech", "founder", "product", "data science", "analytics", "data engineering",
  "cybersecurity", "infosec", "quantum", "robotics", "iot", "ar", "vr",
  "react", "python", "javascript", "typescript", "golang", "rust", "java",
  "agritech", "mobility", "autonomous", "open source",
] as const;

const CREATIVE_SIGNALS = [
  "art", "music", "gallery", "exhibition", "festival", "expo",
  "concert", "dj", "dance", "theater", "theatre", "opera",
  "film", "cinema", "movie", "photography", "fashion", "craft",
  "illustration", "painting", "sculpture", "installation", "mural",
  "performance", "live music", "club", "creative", "culture",
  "manga", "anime", "pop-up", "artist", "residency",
  "jam session", "open mic", "spoken word", "poetry",
] as const;

/**
 * Scores a title + tags against Tech and Creative signal lists.
 * Falls back to the source's defaultCategory on a tie.
 */
export function classifyEvent(
  title: string,
  tags: string[],
  defaultCategory: EventCategory
): EventCategory {
  const text = [title, ...tags].join(" ").toLowerCase();
  let tech = 0;
  let creative = 0;
  for (const s of TECH_SIGNALS) if (text.includes(s)) tech++;
  for (const s of CREATIVE_SIGNALS) if (text.includes(s)) creative++;
  if (tech > creative) return "Tech";
  if (creative > tech) return "Creative";
  return defaultCategory;
}

// ── Source registry ────────────────────────────────────────────────────────

export const SOURCES: Record<SourceId, SourceConfig> = {
  // ── Major platforms ──────────────────────────────────────────────────────
  eventbrite: {
    id: "eventbrite",
    name: "Eventbrite",
    defaultCategory: "Tech",
    baseUrl: "https://www.eventbriteapi.com",
    type: "api",
    enabled: true,
    defaultTags: [],
    rateLimitMs: 1000,
    requiresApiKey: true,
  },
  luma: {
    id: "luma",
    name: "Luma",
    defaultCategory: "Tech",
    baseUrl: "https://api.lu.ma",
    type: "api",
    enabled: true,
    defaultTags: [],
    rateLimitMs: 500,
    requiresApiKey: false,
  },
  meetup: {
    id: "meetup",
    name: "Meetup",
    defaultCategory: "Tech",
    baseUrl: "https://api.meetup.com",
    type: "api",
    enabled: true,
    defaultTags: [],
    rateLimitMs: 1000,
    requiresApiKey: false,
  },

  // ── Creative sources ─────────────────────────────────────────────────────
  tokyoartbeat: {
    id: "tokyoartbeat",
    name: "Tokyo Art Beat",
    defaultCategory: "Creative",
    baseUrl: "https://www.tokyoartbeat.com",
    type: "scrape",
    enabled: true,
    defaultTags: ["art", "exhibition", "gallery"],
    rateLimitMs: 2000,
    requiresApiKey: false,
  },
  timeout: {
    id: "timeout",
    name: "TimeOut Tokyo",
    defaultCategory: "Creative",
    baseUrl: "https://www.timeout.com",
    type: "scrape",
    enabled: true,
    defaultTags: ["festival", "culture", "events"],
    rateLimitMs: 2000,
    requiresApiKey: false,
  },
  residentadvisor: {
    id: "residentadvisor",
    name: "Resident Advisor",
    defaultCategory: "Creative",
    baseUrl: "https://ra.co",
    type: "scrape",
    enabled: true,
    defaultTags: ["music", "DJ", "club"],
    rateLimitMs: 2000,
    requiresApiKey: false,
  },

  // ── Tech sources ─────────────────────────────────────────────────────────
  venturecafe: {
    id: "venturecafe",
    name: "Venture Café Tokyo",
    defaultCategory: "Tech",
    baseUrl: "https://venturecafetokyo.org",
    type: "scrape",
    enabled: true,
    defaultTags: ["startup", "networking", "innovation"],
    rateLimitMs: 1500,
    requiresApiKey: false,
  },
  tokyodev: {
    id: "tokyodev",
    name: "TokyoDev",
    defaultCategory: "Tech",
    baseUrl: "https://www.tokyodev.com",
    type: "scrape",
    enabled: true,
    defaultTags: ["dev", "engineering"],
    rateLimitMs: 1500,
    requiresApiKey: false,
  },

  // ── Legacy / existing ────────────────────────────────────────────────────
  doorkeeper: {
    id: "doorkeeper",
    name: "Doorkeeper",
    defaultCategory: "Tech",
    baseUrl: "https://api.doorkeeper.jp",
    type: "api",
    enabled: true,
    defaultTags: [],
    rateLimitMs: 500,
    requiresApiKey: true,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function getEnabledSources(): SourceConfig[] {
  return Object.values(SOURCES).filter((s) => s.enabled);
}

export function getSourcesByCategory(category: EventCategory): SourceConfig[] {
  return Object.values(SOURCES).filter(
    (s) => s.enabled && s.defaultCategory === category
  );
}

export function getSource(id: SourceId): SourceConfig {
  return SOURCES[id];
}
