"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal, Zap, Clock, Palette, Cpu } from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

const CATEGORIES = [
  { value: "",         label: "All",      icon: null },
  { value: "Tech",     label: "Tech",     icon: <Cpu size={11} /> },
  { value: "Creative", label: "Creative", icon: <Palette size={11} /> },
];

const TIME_FILTERS = [
  { value: "",          label: "Upcoming" },
  { value: "now",       label: "Now" },
  { value: "today",     label: "Today" },
  { value: "tomorrow",  label: "Tomorrow" },
];

export function Filters() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const q          = searchParams.get("q")          ?? "";
  const source     = searchParams.get("source")     ?? "";
  const category   = searchParams.get("category")   ?? "";
  const timeFilter = searchParams.get("timeFilter") ?? "";
  const dateFrom   = searchParams.get("dateFrom")   ?? "";
  const dateTo     = searchParams.get("dateTo")     ?? "";

  const [localQ, setLocalQ] = useState(q);

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      return params.toString();
    },
    [searchParams]
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    router.push(`${pathname}?${createQueryString({ q: value })}`);
  }, 350);

  const handleSearchChange = (value: string) => {
    setLocalQ(value);
    debouncedSearch(value);
  };

  const handleCategory   = (v: string) => router.push(`${pathname}?${createQueryString({ category: v })}`);
  const handleTimeFilter = (v: string) => router.push(`${pathname}?${createQueryString({ timeFilter: v })}`);
  const handleDate       = (key: "dateFrom" | "dateTo", v: string) =>
    router.push(`${pathname}?${createQueryString({ [key]: v })}`);

  const clearAll = () => {
    setLocalQ("");
    router.push(pathname);
  };

  const hasFilters = q || source || category || timeFilter || dateFrom || dateTo;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <Input
          value={localQ}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search events, venues, tags..."
          className="pl-10 h-11 bg-white border-gray-200 focus:border-gray-400 text-sm placeholder:text-gray-400 rounded-xl shadow-sm"
        />
        {localQ && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category + Time + Date filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 mr-1">
          <SlidersHorizontal size={13} className="text-gray-400" />
        </div>

        {/* Category toggle */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => handleCategory(c.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                category === c.value
                  ? c.value === "Tech"
                    ? "bg-blue-500 text-white shadow-sm"
                    : c.value === "Creative"
                      ? "bg-pink-500 text-white shadow-sm"
                      : "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>

        {/* Time filter */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {TIME_FILTERS.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTimeFilter(t.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeFilter === t.value
                  ? t.value === "now"
                    ? "bg-green-500 text-white shadow-sm"
                    : "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.value === "now" && <Zap size={10} />}
              {t.value === "today" && <Clock size={10} />}
              {t.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDate("dateFrom", e.target.value)}
            className="h-8 px-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-600 focus:outline-none focus:border-gray-400 shadow-sm cursor-pointer"
          />
          <span className="text-gray-300 text-xs">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDate("dateTo", e.target.value)}
            className="h-8 px-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-600 focus:outline-none focus:border-gray-400 shadow-sm cursor-pointer"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2 text-xs text-gray-400 hover:text-gray-700"
          >
            <X size={11} className="mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {q && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-200 border text-xs gap-1">
              &quot;{q}&quot;<button onClick={() => handleSearchChange("")}><X size={10} /></button>
            </Badge>
          )}
          {category && (
            <Badge variant="secondary" className={`border text-xs gap-1 ${category === "Tech" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-pink-50 text-pink-600 border-pink-200"}`}>
              {category}<button onClick={() => handleCategory("")}><X size={10} /></button>
            </Badge>
          )}
          {timeFilter && (
            <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200 border text-xs gap-1 capitalize">
              {timeFilter}<button onClick={() => handleTimeFilter("")}><X size={10} /></button>
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-200 border text-xs gap-1">
              From {dateFrom}<button onClick={() => handleDate("dateFrom", "")}><X size={10} /></button>
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-200 border text-xs gap-1">
              To {dateTo}<button onClick={() => handleDate("dateTo", "")}><X size={10} /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
