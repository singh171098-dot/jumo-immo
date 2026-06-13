"use client";
import { Table2, BadgeCheck } from "lucide-react";
import { formatPrice } from "../../lib/utils/formatters";
import type { DVFComparable } from "./types";

interface ComparablesTableProps {
  city: string;
  postalCode: string;
  comparables: DVFComparable[];
}

export default function ComparablesTable({ city, postalCode, comparables }: ComparablesTableProps) {
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Table2 size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Transactions récentes à proximité</p>
            <p className="text-gray-500 text-xs">{postalCode ? `${city} (${postalCode})` : city}</p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 uppercase tracking-wide">
          <BadgeCheck size={11} /> Source : DVF — Données officielles notariales
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-2.5 font-semibold">Date</th>
              <th className="px-5 py-2.5 font-semibold">Type</th>
              <th className="px-5 py-2.5 font-semibold text-right">Surface</th>
              <th className="px-5 py-2.5 font-semibold text-right">Prix</th>
              <th className="px-5 py-2.5 font-semibold text-right">Prix/m²</th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((r) => (
              <tr key={r.id} className="border-t border-white/[0.05]">
                <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                <td className="px-5 py-3 text-gray-200">{r.propertyType}</td>
                <td className="px-5 py-3 text-right text-gray-400 whitespace-nowrap">{r.surface} m²</td>
                <td className="px-5 py-3 text-right text-white font-semibold whitespace-nowrap">{formatPrice(r.price)}</td>
                <td className="px-5 py-3 text-right text-blue-400 font-semibold whitespace-nowrap">{formatPrice(r.pricePerM2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
