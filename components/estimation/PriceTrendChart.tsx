"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { TrendingUp } from "lucide-react";
import { formatPrice } from "../../lib/utils/formatters";
import type { DVFTrendPoint } from "./types";

interface PriceTrendChartProps {
  city: string;
  trend: DVFTrendPoint[];
}

function CustomTooltip({ active, payload, label }: Partial<TooltipContentProps<ValueType, NameType>>) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-0.5">Année {label}</p>
      <p className="text-sm font-bold text-emerald-400">{formatPrice(Number(payload[0].value))} / m²</p>
    </div>
  );
}

export default function PriceTrendChart({ city, trend }: PriceTrendChartProps) {
  const yearRange = trend.length > 1
    ? `${trend[0].year} – ${trend[trend.length - 1].year}`
    : `${trend[0]?.year ?? ""}`;

  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <TrendingUp size={16} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Évolution du prix au m²</p>
          <p className="text-gray-500 text-xs">{city} · {yearRange}</p>
        </div>
      </div>

      <div className="h-56 mt-3 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" stroke="#7A8599" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#7A8599" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${Math.round(v / 100) / 10}k€`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="averagePricePerM2" stroke="#059669" strokeWidth={2.5}
              fill="url(#priceTrendGradient)" activeDot={{ r: 4, fill: "#059669" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-gray-600 mt-2">
        Estimation indicative basée sur les données DVF du secteur
      </p>
    </div>
  );
}
