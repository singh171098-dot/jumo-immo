"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { TrendingUp } from "lucide-react";
import { formatPricePerM2 } from "../../lib/utils/formatters";
import type { DVFTrendPoint } from "../../lib/dvf";

interface DVFTrendChartProps {
  trend: DVFTrendPoint[];
}

function CustomTooltip({ active, payload, label }: Partial<TooltipContentProps<ValueType, NameType>>) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload as DVFTrendPoint;
  return (
    <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-0.5">Année {label}</p>
      <p className="text-sm font-bold text-blue-400">{formatPricePerM2(point.averagePricePerM2)}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">
        {new Intl.NumberFormat("fr-FR").format(point.transactionCount)} transactions
      </p>
    </div>
  );
}

export default function DVFTrendChart({ trend }: DVFTrendChartProps) {
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
          <TrendingUp size={16} className="text-blue-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Évolution du marché sur 5 ans</p>
          <p className="text-gray-500 text-xs">Prix moyen au m² (DVF)</p>
        </div>
      </div>

      {trend.length < 2 ? (
        <p className="text-xs text-gray-500 mt-3">
          Historique insuffisant pour afficher une tendance fiable
        </p>
      ) : (
        <div className="h-56 mt-3 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="year" stroke="#7A8599" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#7A8599" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 100) / 10}k€`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="averagePricePerM2" stroke="#3B82F6" strokeWidth={2.5}
                dot={{ r: 3, fill: "#3B82F6" }} activeDot={{ r: 5, fill: "#3B82F6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
