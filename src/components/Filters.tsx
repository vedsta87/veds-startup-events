"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

const SOURCES = [
  { value: "", label: "All Sources" },
  { value: "doorkeeper", label: "Doorkeeper" },
  { value: "luma", label: "Luma" },
];

export function Filters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const source = searchParams.get("source") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const [localQ, setLocalQ] = useState(q);

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
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

  const handleSource = (value: string) => {
    router.push(`${pathname}?${createQueryString({ source: value })}`);
  };

  const handleDate = (key: "dateFrom" | "dateTo", value: string) => {
    router.push(`${pathname}?${createQueryString({ [key]: value })}`);
  };

  const clearAll = () => {
    setLocalQ("");
    router.push(pathname);
  };

  const hasFilters = q || source || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <Input
          value={localQ}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search events, venues, tags..."
          className="pl-10 h-11 bg-white border-gray-200 focus:border-gray-400 text-sm placeholder:text-gray-400 rounded-xl shadow-sm"
        />
        {localQ && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Source + Date filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Filters</span>
        </div>

        {/* Source toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleSource(s.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                source === s.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDate("dateFrom", e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-600 focus:outline-none focus:border-gray-400 cursor-pointer shadow-sm"
          />
          <span className="text-gray-300 text-xs">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDate("dateTo", e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-600 focus:outline-none focus:border-gray-400 cursor-pointer shadow-sm"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X size={12} className="mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-200 border text-xs gap-1">
              &quot;{q}&quot;
              <button onClick={() => handleSearchChange("")}><X size={10} /></button>
            </Badge>
          )}
          {source && (
            <Badge variant="secondary" className="bg-purple-50 text-purple-600 border-purple-200 border text-xs gap-1 capitalize">
              {source}
              <button onClick={() => handleSource("")}><X size={10} /></button>
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200 border text-xs gap-1">
              From {dateFrom}
              <button onClick={() => handleDate("dateFrom", "")}><X size={10} /></button>
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200 border text-xs gap-1">
              To {dateTo}
              <button onClick={() => handleDate("dateTo", "")}><X size={10} /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
