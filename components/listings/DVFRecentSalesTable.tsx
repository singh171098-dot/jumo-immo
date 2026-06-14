import { ReceiptText } from "lucide-react";
import { formatPrice, formatPricePerM2 } from "../../lib/utils/formatters";
import type { DVFRecentSale } from "../../lib/dvf";

export interface DVFRecentSalesTableProps {
  sales: DVFRecentSale[];
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DVFRecentSalesTable({ sales }: DVFRecentSalesTableProps) {
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <ReceiptText size={16} className="text-emerald-400" />
        </div>
        <p className="text-white font-bold text-sm">Dernières ventes réelles dans le secteur</p>
      </div>

      {sales.length === 0 ? (
        <p className="text-xs text-gray-500">Aucune transaction récente dans ce secteur</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left min-w-[440px]">
            <thead>
              <tr className="text-[10px] text-gray-500 uppercase tracking-widest">
                <th className="px-1 py-1.5 font-medium">Date</th>
                <th className="px-1 py-1.5 font-medium">Type</th>
                <th className="px-1 py-1.5 font-medium">Surface</th>
                <th className="px-1 py-1.5 font-medium text-right">Prix total</th>
                <th className="px-1 py-1.5 font-medium text-right">Prix au m²</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sales.map((sale, index) => (
                <tr key={index} className="text-xs text-gray-300">
                  <td className="px-1 py-2 whitespace-nowrap">{formatDate(sale.date)}</td>
                  <td className="px-1 py-2 whitespace-nowrap">{sale.type}</td>
                  <td className="px-1 py-2 whitespace-nowrap">{sale.surface} m²</td>
                  <td className="px-1 py-2 whitespace-nowrap text-right font-semibold text-white">
                    {formatPrice(sale.price)}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-right text-blue-400">
                    {formatPricePerM2(sale.pricePerM2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
