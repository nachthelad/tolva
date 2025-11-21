"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HoaSummary } from "@/types/hoa"

interface HoaTableProps {
  currentSummary: HoaSummary | null
  previousSummary: HoaSummary | null
  comparison: any
  showAmounts: boolean
}

export function HoaTable({ currentSummary, previousSummary, comparison, showAmounts }: HoaTableProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-"
    if (!showAmounts) return "****"
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const statusChipClass = (status: string) => {
    switch (status) {
      case "new":
        return "inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
      case "removed":
        return "inline-flex rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300"
      case "increased":
        return "inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300"
      case "decreased":
        return "inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
      default:
        return "inline-flex rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400"
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "New"
      case "removed":
        return "Removed"
      case "increased":
        return "Increased"
      case "decreased":
        return "Decreased"
      default:
        return "No changes"
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Details by category</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparison between{" "}
          {currentSummary?.periodLabel ?? "the last period"} and{" "}
          {previousSummary
            ? previousSummary.periodLabel
            : "without history"}
          .
        </p>
      </CardHeader>
      <CardContent>
        {!currentSummary ? (
          <div className="text-sm text-slate-500 py-6 text-center">
            No data for this unit.
          </div>
        ) : !previousSummary ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              No other period to compare. Categories of the last month:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(currentSummary.rubros ?? []).map((rubro) => (
                <div
                  key={`${rubro.rubroNumber}-${rubro.label}`}
                  className="rounded-lg border bg-card px-4 py-3"
                >
                  <p className="text-sm text-slate-400">
                    {rubro.label ?? `Rubro ${rubro.rubroNumber}`}
                  </p>
                  <p className="text-lg font-semibold text-slate-100">
                    {formatCurrency(rubro.total)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Note: at least two periods are needed to show the comparison.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="py-2 pr-4 font-normal">Category</th>
                  <th className="py-2 pr-4 font-normal">
                    {previousSummary.periodLabel}
                  </th>
                  <th className="py-2 pr-4 font-normal">
                    {currentSummary.periodLabel}
                  </th>
                  <th className="py-2 pr-4 font-normal">Difference</th>
                  <th className="py-2 pr-4 font-normal">%</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rubroDiffs.map((diff: any) => (
                  <tr
                    key={diff.rubroKey}
                    className="border-t border-slate-800/60"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-100">
                        {diff.label}
                      </div>
                      <div className="text-xs text-slate-500">
                        Category {diff.rubroKey.split("::")[0]}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatCurrency(diff.previousTotal)}
                    </td>
                    <td className="py-3 pr-4 text-slate-100">
                      {formatCurrency(diff.currentTotal)}
                    </td>
                    <td
                      className={`py-3 pr-4 ${
                        diff.diffAmount > 0
                          ? "text-amber-400"
                          : diff.diffAmount < 0
                          ? "text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {diff.diffAmount === 0
                        ? "—"
                        : `${
                            diff.diffAmount > 0 ? "+" : "-"
                          }${formatCurrency(Math.abs(diff.diffAmount)).replace("ARS", "").trim()}`}
                    </td>
                    <td
                      className={`py-3 pr-4 ${
                        diff.diffPercent && diff.diffPercent > 20
                          ? "text-amber-400"
                          : diff.diffPercent && diff.diffPercent < -20
                          ? "text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {diff.diffPercent == null
                        ? "—"
                        : `${
                            diff.diffPercent > 0 ? "+" : ""
                          }${diff.diffPercent.toFixed(1)}%`}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={statusChipClass(diff.status)}>
                        {statusLabel(diff.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
