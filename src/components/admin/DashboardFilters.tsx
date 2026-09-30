"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RANGE_LABELS: Record<string, string> = {
  "7": "Últimos 7 días",
  "30": "Últimos 30 días",
  "90": "Últimos 90 días",
  all: "Todo",
};

export function DashboardFilters({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? "all";
  const categoryId = searchParams.get("categoryId") ?? "ALL";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/admin/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Período</span>
        <Select value={range} onValueChange={(v) => v && update("range", v)}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue>{(v: string) => RANGE_LABELS[v] ?? RANGE_LABELS.all}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RANGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Categoría</span>
        <Select value={categoryId} onValueChange={(v) => v && update("categoryId", v)}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue placeholder="Todas">
              {(v: string) => categories.find((c) => c.id === v)?.name ?? "Todas"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
