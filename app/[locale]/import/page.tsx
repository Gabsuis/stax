"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import Sidebar from "@/components/Sidebar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { Button } from "@/components/ui/button"
import { buildings } from "@/data/buildings"
import { Sparkles, Upload, Mail, ClipboardPaste, Check, Building2, Layers, Users, Loader2, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

type ImportSource = "paste" | "excel" | "email"

interface MockResult {
  building: string
  floors: number
  tenants: number
}

export default function ImportPage() {
  const t = useTranslations("import")
  const locale = useLocale()
  const [source, setSource] = useState<ImportSource>("paste")
  const [text, setText] = useState("")
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<MockResult | null>(null)
  const [imported, setImported] = useState(false)

  const sourceOptions = [
    { value: "paste" as const, icon: ClipboardPaste, label: t("sources.paste") },
    { value: "excel" as const, icon: Upload, label: t("sources.excel") },
    { value: "email" as const, icon: Mail, label: t("sources.email") },
  ]

  const handleProcess = () => {
    if (!text.trim()) return
    setProcessing(true)
    setResult(null)
    setImported(false)

    // Mock AI processing delay
    setTimeout(() => {
      // Parse some basic info from the text for the mock
      const lines = text.split("\n").filter((l) => l.trim())
      const buildingName = lines[0]?.trim().split(",")[0] || "New Building"
      const floorMatches = text.match(/(\d+)\s*(floors|קומות|floor)/i)
      const floors = floorMatches ? parseInt(floorMatches[1]) : Math.floor(Math.random() * 10) + 5
      const tenants = Math.floor(lines.length * 0.7) + 2

      setResult({ building: buildingName, floors, tenants })
      setProcessing(false)
    }, 2500)
  }

  const handleImport = () => {
    setImported(true)
  }

  const handleClear = () => {
    setText("")
    setResult(null)
    setImported(false)
    setProcessing(false)
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
              <p className="text-sm text-muted-foreground mt-1.5">{t("subtitle")}</p>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-6">
            {/* Main input area */}
            <div className="space-y-5">
              {/* Source tabs */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-[0.15em] me-2">{t("sourceLabel")}</span>
                {sourceOptions.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSource(s.value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all",
                      source === s.value
                        ? "bg-primary text-primary-foreground"
                        : "glass text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Text input */}
              {source === "paste" && (
                <div className="glass-strong rounded-2xl overflow-hidden">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("placeholder")}
                    rows={16}
                    className="w-full bg-transparent px-6 py-5 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/40"
                    dir="auto"
                  />
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="w-3.5 h-3.5" />
                      <span>{t("tip")}</span>
                    </div>
                    <div className="flex gap-2">
                      {text && (
                        <Button variant="ghost" size="sm" onClick={handleClear}>
                          {t("clear")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleProcess}
                        disabled={!text.trim() || processing}
                      >
                        {processing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {processing ? t("processing") : t("process")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Excel mock */}
              {source === "excel" && (
                <div className="glass-strong rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-lease-green/10 border border-lease-green/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-lease-green" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Drag & drop an Excel file here, or click to browse
                  </p>
                  <Button variant="outline" size="sm">
                    Browse Files
                  </Button>
                </div>
              )}

              {/* Email mock */}
              {source === "email" && (
                <div className="glass-strong rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Forward building data emails to<br />
                    <span className="text-foreground font-medium font-mono text-xs">import@stax.co.il</span>
                  </p>
                  <p className="text-xs text-muted-foreground">AI will parse and import automatically</p>
                </div>
              )}

              {/* Parsed results */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="glass-strong rounded-2xl p-6"
                  >
                    <h3 className="text-base font-semibold mb-4">{t("parsed")}</h3>
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                        <Building2 className="w-4 h-4 text-lease-green shrink-0" />
                        <div>
                          <div className="text-sm font-medium truncate">{result.building}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("buildingDetected")}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                        <Layers className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{result.floors}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("floorsDetected", { count: result.floors })}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                        <Users className="w-4 h-4 text-lease-amber shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{result.tenants}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("tenantsDetected", { count: result.tenants })}</div>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleImport}
                      disabled={imported}
                      className="w-full"
                    >
                      {imported ? (
                        <>
                          <Check className="w-4 h-4" />
                          Imported
                        </>
                      ) : (
                        t("importBtn")
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right sidebar: recent imports */}
            <div className="glass-strong rounded-2xl p-6 h-fit">
              <h3 className="text-base font-semibold mb-4">{t("recentImports")}</h3>
              <div className="space-y-3">
                {/* Mock recent imports */}
                {[
                  { name: "Ampa Tower", date: "2026-03-14", floors: 15 },
                  { name: "Gav Yam Center", date: "2026-03-12", floors: 14 },
                  { name: "Maskit Tower", date: "2026-03-10", floors: 9 },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-lease-green/10 border border-lease-green/15 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-lease-green" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.date} · {item.floors} floors
                      </div>
                    </div>
                    <Check className="w-3.5 h-3.5 text-lease-green shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
