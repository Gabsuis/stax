"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useBuildings } from "@/lib/hooks/useBuildings"
import Sidebar from "@/components/Sidebar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import ThemeToggle from "@/components/ThemeToggle"
import { Search, Plus, ChevronDown, FileText, User } from "lucide-react"

type InvoiceStatus = "in_progress" | "approved" | "sent_to_client" | "paid" | "cancelled"

interface Invoice {
  id: string
  docNum: string
  type: string
  amount: string
  recipient: string
  file: string
  status: InvoiceStatus
  issueDate: string
  broker: string
}

const STATUS_KEYS: Record<InvoiceStatus, string> = {
  in_progress: "statusInProgress",
  approved: "statusApproved",
  sent_to_client: "statusSentToClient",
  paid: "statusPaid",
  cancelled: "statusCancelled",
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  approved: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  sent_to_client: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/15 text-red-500",
}

const STATUSES: InvoiceStatus[] = ["in_progress", "approved", "sent_to_client", "paid", "cancelled"]

const DEMO_INVOICES: Invoice[] = [
  { id: "1", docNum: "INV-2026-001", type: "Commission", amount: "₪45,000", recipient: "AppsFlyer", file: "inv-001.pdf", status: "paid", issueDate: "2026-01-15", broker: "Yoram" },
  { id: "2", docNum: "INV-2026-002", type: "Commission", amount: "₪32,500", recipient: "Monday.com", file: "inv-002.pdf", status: "sent_to_client", issueDate: "2026-01-28", broker: "Nir" },
  { id: "3", docNum: "INV-2026-003", type: "Management Fee", amount: "₪18,200", recipient: "Gav-Yam Group", file: "inv-003.pdf", status: "approved", issueDate: "2026-02-03", broker: "Yoram" },
  { id: "4", docNum: "INV-2026-004", type: "Commission", amount: "₪67,800", recipient: "Wix.com", file: "inv-004.pdf", status: "in_progress", issueDate: "2026-02-10", broker: "Yoram" },
  { id: "5", docNum: "INV-2026-005", type: "Consulting", amount: "₪12,000", recipient: "Fiverr", file: "inv-005.pdf", status: "paid", issueDate: "2026-02-15", broker: "Nir" },
  { id: "6", docNum: "INV-2026-006", type: "Commission", amount: "₪28,400", recipient: "Playtika", file: "", status: "in_progress", issueDate: "2026-03-01", broker: "Nir" },
  { id: "7", docNum: "INV-2026-007", type: "Commission", amount: "₪55,000", recipient: "Ampa Capital", file: "inv-007.pdf", status: "cancelled", issueDate: "2026-03-05", broker: "Yoram" },
  { id: "8", docNum: "INV-2026-008", type: "Management Fee", amount: "₪22,100", recipient: "Alony Hetz", file: "inv-008.pdf", status: "sent_to_client", issueDate: "2026-03-12", broker: "Yoram" },
]

export default function InvoicingPage() {
  const t = useTranslations("invoicing")
  const { buildings } = useBuildings()
  const [search, setSearch] = useState("")
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [invoices, setInvoices] = useState(DEMO_INVOICES)

  const filtered = invoices.filter(
    (inv) =>
      !search ||
      inv.docNum.toLowerCase().includes(search.toLowerCase()) ||
      inv.recipient.toLowerCase().includes(search.toLowerCase()) ||
      inv.broker.toLowerCase().includes(search.toLowerCase())
  )

  const updateStatus = (id: string, status: InvoiceStatus) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)))
    setOpenDropdown(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar buildings={buildings} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-7">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display tracking-tight">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all">
              <Plus className="w-4 h-4" />
              {t("create")}
            </button>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full ps-9 pe-3 py-2.5 rounded-lg glass text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <button className="inline-flex items-center gap-2 glass px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
              <User className="w-4 h-4" />
              Broker
            </button>
          </div>

          {/* Table */}
          <div className="glass-strong rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[
                    t("colDocNum"),
                    t("colType"),
                    t("colAmount"),
                    t("colRecipient"),
                    t("colFile"),
                    t("colStatus"),
                    t("colIssueDate"),
                    t("colBroker"),
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-start"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border/50 hover:bg-primary/[0.03] transition-colors"
                  >
                    <td className="px-4 py-4 text-sm font-medium font-mono">{inv.docNum}</td>
                    <td className="px-4 py-4 text-sm">{inv.type}</td>
                    <td className="px-4 py-4 text-sm font-medium">{inv.amount}</td>
                    <td className="px-4 py-4 text-sm">{inv.recipient}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {inv.file ? (
                        <span className="inline-flex items-center gap-1 hover:text-primary cursor-pointer transition-colors">
                          <FileText className="w-3.5 h-3.5" />
                          {inv.file}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-4 relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === inv.id ? null : inv.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${STATUS_COLORS[inv.status]}`}
                      >
                        {t(STATUS_KEYS[inv.status])}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {openDropdown === inv.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute top-full start-4 mt-1 z-50 glass-strong rounded-xl py-1.5 min-w-[160px] shadow-2xl shadow-black/40">
                            {STATUSES.map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(inv.id, s)}
                                className={`w-full text-start px-4 py-2 text-sm transition-colors ${
                                  inv.status === s
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                                }`}
                              >
                                {t(STATUS_KEYS[s])}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{inv.issueDate}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {inv.broker}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      {t("noInvoices")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
