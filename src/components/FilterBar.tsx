"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import type { RegionFilter, StarFilter, StatusFilter } from "@/types";

interface FilterBarProps {
  search: string;
  stars: StarFilter;
  region: RegionFilter;
  status: StatusFilter;
  onSearchChange: (v: string) => void;
  onStarsChange: (v: StarFilter) => void;
  onRegionChange: (v: RegionFilter) => void;
  onStatusChange: (v: StatusFilter) => void;
}

export function FilterBar({
  search,
  stars,
  region,
  status,
  onSearchChange,
  onStarsChange,
  onRegionChange,
  onStatusChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-4 px-8 border-b border-warm-border bg-parchment">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[280px]">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search restaurant or chef…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 text-small"
        />
      </div>

      {/* Stars */}
      <div className="w-[140px]">
        <Select value={stars} onValueChange={(v) => onStarsChange(v as StarFilter)}>
          <SelectTrigger className="text-small">
            <SelectValue placeholder="All Stars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stars</SelectItem>
            <SelectItem value="3">✶✶✶ Three Stars</SelectItem>
            <SelectItem value="2">✶✶ Two Stars</SelectItem>
            <SelectItem value="1">✶ One Star</SelectItem>
            <SelectItem value="0">— No Stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Region */}
      <div className="w-[180px]">
        <Select value={region} onValueChange={(v) => onRegionChange(v as RegionFilter)}>
          <SelectTrigger className="text-small">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            <SelectItem value="Europe">Europe</SelectItem>
            <SelectItem value="Asia">Asia</SelectItem>
            <SelectItem value="Americas">Americas</SelectItem>
            <SelectItem value="Middle East & Africa">Middle East & Africa</SelectItem>
            <SelectItem value="Oceania">Oceania</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="w-[180px]">
        <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
          <SelectTrigger className="text-small">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_contacted">Not Contacted</SelectItem>
            <SelectItem value="researching">Researching</SelectItem>
            <SelectItem value="draft_ready">Draft Ready</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="followup_due">Follow-up Due</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
