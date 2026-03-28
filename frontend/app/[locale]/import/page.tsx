"use client"

import { useState, useRef, useCallback } from "react"
import { useTranslations, useLocale } from "next-intl"
import Sidebar from "@/components/Sidebar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import ThemeToggle from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { useBuildings } from "@/lib/hooks/useBuildings"
import {
  Sparkles, Upload, Mail, ClipboardPaste, Check, Building2,
  Layers, Users, Loader2, Info, FileText, X, ChevronDown, ChevronUp,
  AlertCircle, Shield, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { ExtractionResult, BuildingExtraction } from "@/lib/agents/schemas"
import type { DuplicateResult } from "@/lib/duplicate-check"
import StackingPlanEditor, { lobbySignToEditor, editorToLobbySign, type EditorBuilding } from "@/components/StackingPlanEditor"
import { useRecentImports } from "@/lib/hooks/useRecentImports"
import { formatDistanceToNow } from "date-fns"

type ImportSource = "paste" | "document" | "email"

type ProcessingStage = "idle" | "uploading" | "analyzing" | "extracting" | "checking" | "validating" | "saving" | "done" | "error"

type DuplicateAction = "insert" | "replace" | "merge" | "skip"

interface ProcessingState {
  stage: ProcessingStage
  message: string
  step?: number
  total?: number
}

export default function ImportPage() {
  const t = useTranslations("import")
  const locale = useLocale()
  const { buildings } = useBuildings()
  const { imports: recentImports, refetch: refetchImports } = useRecentImports()
  const [source, setSource] = useState<ImportSource>("document")
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState<ProcessingState>({ stage: "idle", message: "" })
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([])
  const [autoSaved, setAutoSaved] = useState(false)
  const [imported, setImported] = useState(false)
  const [expandedBuilding, setExpandedBuilding] = useState<number | null>(null)
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<number, { action: DuplicateAction; existing_id?: string }>>({})
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [historyPreview, setHistoryPreview] = useState<{ url: string; name: string } | null>(null)
  const [lobbySign, setLobbySign] = useState<{ building_name: string; building_name_en: string; address: string; city: string; city_en: string; entrance: string; floor_count: number; floors: { floor_number: string; tenants: string[]; has_vacancy: boolean }[] }[] | null>(null)
  const [editorBuildings, setEditorBuildings] = useState<EditorBuilding[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [warningMessage, setWarningMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sourceOptions = [
    { value: "document" as const, icon: Upload, label: t("sources.document") },
    { value: "paste" as const, icon: ClipboardPaste, label: t("sources.paste") },
    { value: "email" as const, icon: Mail, label: t("sources.email") },
  ]

  const acceptedTypes = ".pdf,.png,.jpg,.jpeg"

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const handleProcess = async () => {
    setResult(null)
    setImported(false)
    setErrorMessage("")

    const formData = new FormData()

    if (source === "document" && file) {
      formData.append("file", file)
    } else if (source === "paste" && text.trim()) {
      // Send text as a .txt blob
      const blob = new Blob([text], { type: "text/plain" })
      formData.append("file", blob, "pasted-text.txt")
    } else {
      return
    }

    setProcessing({ stage: "uploading", message: "Uploading..." })

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/import/process`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok || !response.body) {
        setProcessing({ stage: "error", message: "Request failed" })
        setErrorMessage("Server returned an error")
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let eventType = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6))
              if (eventType === "progress") {
                setProcessing({ stage: data.stage as ProcessingStage, message: data.message, step: data.step, total: data.total })
              } else if (eventType === "warning") {
                setWarningMessage(data.message)
              } else if (eventType === "result") {
                setResult(data as ExtractionResult)
                setDocumentId(data._document_id ?? null)
                setDuplicates(data._duplicates ?? [])
                setAutoSaved(data._auto_saved ?? false)
                setLobbySign(data._lobby_sign ?? null)
                if (data._lobby_sign) setEditorBuildings(lobbySignToEditor(data._lobby_sign))
                setPreviewUrl(data._preview_url ?? null)
                setProcessing({ stage: "done", message: data._auto_saved ? "Imported successfully" : "Extraction complete — review duplicates" })
              } else if (eventType === "error") {
                setProcessing({ stage: "error", message: data.message })
                setErrorMessage(data.message)
              } else if (eventType === "done") {
                if (processing.stage !== "error") {
                  setProcessing({ stage: "done", message: "Done" })
                }
              }
            } catch { /* ignore parse errors in stream */ }
            eventType = ""
          }
        }
      }
    } catch (err) {
      setProcessing({ stage: "error", message: "Connection failed" })
      setErrorMessage(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const handleClear = () => {
    setText("")
    setFile(null)
    setResult(null)
    setDocumentId(null)
    setDuplicates([])
    setAutoSaved(false)
    setImported(false)
    setProcessing({ stage: "idle", message: "" })
    setErrorMessage("")
    setWarningMessage("")
    setLobbySign(null)
    setEditorBuildings([])
    setPreviewUrl(null)
    setShowPreview(false)
    setExpandedBuilding(null)
    setDuplicateDecisions({})
    setSaving(false)
  }

  const handleSaveWithDecisions = async () => {
    if (!result || !documentId) return
    setSaving(true)

    try {
      // Build decisions array: duplicates get the broker's choice, others get "insert"
      const duplicateIndexes = new Set(duplicates.map((d) => d.extracted_index))
      const decisions = result.buildings.map((_, i) => {
        if (duplicateIndexes.has(i)) {
          const decision = duplicateDecisions[i]
          return {
            extracted_index: i,
            action: decision?.action ?? ("skip" as DuplicateAction),
            existing_id: decision?.existing_id,
          }
        }
        return { extracted_index: i, action: "insert" as DuplicateAction }
      })

      // For lobby signs, rebuild extraction.buildings from the editor state
      // so user edits (name, city, tenants, etc.) are actually saved
      let extraction = result
      if (lobbySign && editorBuildings.length > 0) {
        extraction = {
          ...result,
          buildings: editorBuildings.map((b) => ({
            name: b.name || b.nameEn || '',
            name_en: b.nameEn || undefined,
            address: b.address || undefined,
            city: b.city || undefined,
            city_en: b.cityEn || undefined,
            class: undefined,
            floor_count: b.floorCount || undefined,
            floors: b.floors.map((f) => ({
              floor_number: f.floorNumber,
              total_sqm: f.tenants.reduce((sum, t) => sum + (t.sqm || 0), 0),
              blocks: f.tenants.map((t) => ({
                tenant_name: t.isVacant ? undefined : t.name || undefined,
                sqm: t.sqm || 0,
                status: (t.isVacant ? 'vacant' : 'occupied') as 'vacant' | 'occupied',
                lease_start: t.leaseStart || undefined,
                lease_end: t.leaseEnd || undefined,
                rent_per_sqm: t.rentPerSqm || undefined,
                management_fee_sqm: t.managementFeeSqm || undefined,
                delivery_condition: t.deliveryCondition || undefined,
                is_sublease: t.isSublease || undefined,
                sublease_tenant: t.subleaseTenant || undefined,
                notes: t.notes || undefined,
              })),
            })),
            _confidence: 0.9,
          })),
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/import/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          extraction,
          decisions,
        }),
      })

      if (response.ok) {
        setImported(true)
        refetchImports()
      } else {
        const err = await response.json()
        setErrorMessage(err.error || "Save failed")
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const isProcessing = processing.stage !== "idle" && processing.stage !== "done" && processing.stage !== "error"
  const canProcess = source === "document" ? !!file : source === "paste" ? !!text.trim() : false

  // Validate that every building has at least a name and city before allowing save
  const hasMissingFields = result ? (() => {
    if (lobbySign && editorBuildings.length > 0) {
      return editorBuildings.some(b => !b.name.trim() || (!b.city.trim() && !b.cityEn.trim()))
    }
    return result.buildings.some(b => !b.name?.trim() || (!b.city?.trim() && !b.city_en?.trim()))
  })() : false

  const confidenceColor = (c?: number) => {
    if (!c) return "text-muted-foreground"
    if (c >= 0.8) return "text-lease-green"
    if (c >= 0.5) return "text-lease-amber"
    return "text-lease-red"
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
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
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

              {/* Document upload */}
              {source === "document" && (
                <div className="glass-strong rounded-2xl overflow-hidden">
                  {!file ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "p-12 flex flex-col items-center justify-center min-h-[400px] gap-4 cursor-pointer transition-all",
                        dragOver ? "bg-primary/5 border-2 border-dashed border-primary/30" : "hover:bg-white/[0.02]"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptedTypes}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center transition-all",
                        dragOver
                          ? "bg-primary/20 border border-primary/30"
                          : "bg-lease-green/10 border border-lease-green/20"
                      )}>
                        <Upload className={cn("w-7 h-7", dragOver ? "text-primary" : "text-lease-green")} />
                      </div>
                      <p className="text-sm text-muted-foreground text-center max-w-sm">
                        {t("dropzone")}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        PDF, PNG, JPG
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(0)} KB · {file.type || "unknown"}
                          </div>
                        </div>
                        <button onClick={() => setFile(null)} className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Progress with step bar */}
                      <AnimatePresence>
                        {isProcessing && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 px-4 py-4 rounded-xl bg-primary/5 border border-primary/10"
                          >
                            <div className="flex items-center gap-3">
                              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                              <span className="text-sm text-primary flex-1">{processing.message}</span>
                              {processing.step && processing.total && (
                                <span className="text-xs text-primary/60 font-mono">{processing.step}/{processing.total}</span>
                              )}
                            </div>
                            {processing.step && processing.total && (
                              <div className="flex gap-1">
                                {Array.from({ length: processing.total }, (_, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "h-1.5 flex-1 rounded-full transition-all duration-500",
                                      i < processing.step!
                                        ? "bg-primary"
                                        : i === processing.step!
                                        ? "bg-primary/40 animate-pulse"
                                        : "bg-primary/10"
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Warning (duplicate document) */}
                      {warningMessage && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-sm text-amber-400">{warningMessage}</span>
                        </div>
                      )}

                      {/* Error */}
                      {processing.stage === "error" && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-lease-red/5 border border-lease-red/10">
                          <AlertCircle className="w-4 h-4 text-lease-red shrink-0" />
                          <span className="text-sm text-lease-red">{errorMessage}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Info className="w-3.5 h-3.5" />
                          <span>{t("tip")}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={handleClear}>
                            {t("clear")}
                          </Button>
                          <Button size="sm" onClick={handleProcess} disabled={isProcessing}>
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            {isProcessing ? t("processing") : t("process")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Text paste */}
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
                      <Button size="sm" onClick={handleProcess} disabled={!canProcess || isProcessing}>
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {isProcessing ? t("processing") : t("process")}
                      </Button>
                    </div>
                  </div>
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

              {/* Extraction results */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="glass-strong rounded-2xl p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">{t("parsed")}</h3>
                      <div className="flex items-center gap-2">
                        {previewUrl && (
                          <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="text-xs text-primary hover:text-primary/80 transition-colors px-2.5 py-1 rounded-full glass"
                          >
                            {showPreview ? "Hide Original" : "View Original"}
                          </button>
                        )}
                        <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full glass">
                          {lobbySign ? "lobby sign" : result.document_type.replace(/_/g, " ")} · {result.language}
                        </span>
                      </div>
                    </div>

                    {/* Document preview */}
                    {showPreview && previewUrl && (
                      <div className="glass rounded-xl overflow-hidden">
                        <img src={previewUrl} alt="Original document" className="w-full max-h-[400px] object-contain bg-black/20" />
                      </div>
                    )}

                    {/* ── LOBBY SIGN: Editable stacking plan ── */}
                    {lobbySign && editorBuildings.length > 0 && (
                      <StackingPlanEditor
                        buildings={editorBuildings}
                        onChange={(updated) => {
                          setEditorBuildings(updated)
                          // Sync back to lobbySign for saving
                          setLobbySign(editorToLobbySign(updated))
                        }}
                        previewUrl={previewUrl}
                        showPreview={showPreview}
                        compact
                        locale={locale}
                      />
                    )}

                    {/* ── VACANCY LISTING: Building cards ── */}
                    {!lobbySign && (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                            <Building2 className="w-4 h-4 text-lease-green shrink-0" />
                            <div>
                              <div className="text-sm font-medium">{result.buildings.length}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("buildingDetected")}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                            <Layers className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <div className="text-sm font-medium">
                                {result.buildings.reduce((sum, b) => sum + (b.floors?.length ?? 0), 0)}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("floorsDetected", { count: 0 })}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                            <Users className="w-4 h-4 text-lease-amber shrink-0" />
                            <div>
                              <div className="text-sm font-medium">
                                {result.buildings.reduce((sum, b) =>
                                  sum + (b.floors?.reduce((fs, f) =>
                                    fs + (f.blocks?.filter(bl => bl.status === "occupied").length ?? 0), 0) ?? 0), 0
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("tenantsDetected", { count: 0 })}</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {result.buildings.map((building, idx) => (
                            <BuildingCard
                              key={idx}
                              building={building}
                              expanded={expandedBuilding === idx}
                              onToggle={() => setExpandedBuilding(expandedBuilding === idx ? null : idx)}
                              confidenceColor={confidenceColor}
                              locale={locale}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Duplicate review */}
                    {duplicates.length > 0 && !autoSaved && !imported && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                          <AlertCircle className="w-4 h-4" />
                          {duplicates.length} existing building(s) found — choose how to handle
                        </div>
                        {duplicates.map((dup) => {
                          const match = dup.matches[0]
                          if (!match) return null
                          const extracted = result.buildings[dup.extracted_index]
                          const decision = duplicateDecisions[dup.extracted_index]

                          // Check if new data actually has anything useful to compare
                          const hasNewData = extracted && (
                            extracted.address || extracted.asking_rent_sqm ||
                            extracted.floors?.length || extracted.vacant_sqm
                          )

                          return (
                            <div key={dup.extracted_index} className="glass rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">
                                  &ldquo;{dup.building_name}&rdquo; = &ldquo;{match.name}&rdquo;
                                  <span className="text-xs text-muted-foreground ms-2">
                                    {Math.round(match.similarity * 100)}% match
                                  </span>
                                </div>
                              </div>

                              {hasNewData ? (
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="text-muted-foreground font-medium">Field</div>
                                  <div className="text-muted-foreground font-medium">Existing</div>
                                  <div className="text-muted-foreground font-medium">New</div>
                                  {/* Only show rows where new data exists */}
                                  {extracted?.address && (<><div>Address</div><div>{match.address || "—"}</div><div className="text-lease-green">{extracted.address}</div></>)}
                                  {extracted?.total_sqm && (<><div>Total sqm</div><div>{match.total_sqm?.toLocaleString() || "—"}</div><div className="text-lease-green">{extracted.total_sqm.toLocaleString()}</div></>)}
                                  {extracted?.asking_rent_sqm && (<><div>Rent/sqm</div><div>{match.asking_rent_sqm ? `₪${match.asking_rent_sqm}` : "—"}</div><div className="text-lease-green">₪{extracted.asking_rent_sqm}</div></>)}
                                  {extracted?.floors?.length ? (<><div>Floors</div><div>{match.floor_count || "—"}</div><div className="text-lease-green">{extracted.floors.length} floor(s)</div></>) : null}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No new data to compare — the import only found the name. Recommend: <span className="text-amber-400">Skip</span></p>
                              )}

                              <div className="flex gap-2">
                                {(["merge", "replace", "skip"] as const).map((action) => (
                                  <button
                                    key={action}
                                    onClick={() => setDuplicateDecisions((prev) => ({
                                      ...prev,
                                      [dup.extracted_index]: { action, existing_id: match.id },
                                    }))}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                      decision?.action === action
                                        ? action === "merge" ? "bg-lease-green/20 text-lease-green border border-lease-green/30"
                                          : action === "replace" ? "bg-lease-red/20 text-lease-red border border-lease-red/30"
                                          : "bg-muted/30 text-muted-foreground border border-border"
                                        : "glass text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {action === "merge" ? "Merge new data" : action === "replace" ? "Replace" : "Skip"}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setDuplicateDecisions((prev) => ({
                                    ...prev,
                                    [dup.extracted_index]: { action: "insert" },
                                  }))}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    decision?.action === "insert"
                                      ? "bg-primary/20 text-primary border border-primary/30"
                                      : "glass text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  Keep Both
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Success / Import button */}
                    {autoSaved || imported ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-3 py-6"
                      >
                        <div className="w-12 h-12 rounded-full bg-lease-green/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-lease-green" />
                        </div>
                        <p className="text-sm text-lease-green font-medium">
                          {autoSaved
                            ? `${result.buildings.length} building(s) imported successfully`
                            : t("imported")}
                        </p>
                        <a href={`/${locale}/buildings`} className="text-xs text-primary hover:underline">
                          View in Buildings →
                        </a>
                      </motion.div>
                    ) : (
                      <>
                        {hasMissingFields && (
                          <p className="text-xs text-lease-red flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            Every building must have a name and city before saving.
                          </p>
                        )}
                        <Button
                          onClick={handleSaveWithDecisions}
                          disabled={saving || hasMissingFields || (duplicates.length > 0 && Object.keys(duplicateDecisions).length < duplicates.length)}
                          className="w-full"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : duplicates.length > 0 ? (
                            Object.keys(duplicateDecisions).length < duplicates.length
                              ? `Review all duplicates (${Object.keys(duplicateDecisions).length}/${duplicates.length})`
                              : "Save with selected actions"
                          ) : (
                            t("importBtn")
                          )}
                        </Button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right sidebar: import history */}
            <div className="glass-strong rounded-2xl p-6 h-fit">
              <h3 className="text-base font-semibold mb-4">{t("recentImports")}</h3>
              <div className="space-y-2">
                {recentImports.length === 0 && (
                  <p className="text-sm text-muted-foreground/50">{t("noRecent")}</p>
                )}
                {recentImports.map((doc) => {
                  const isCompleted = doc.ai_status === "completed"
                  const isFailed = doc.ai_status === "failed"
                  const isImage = doc.file_type?.startsWith("image/")

                  return (
                    <button
                      key={doc.id}
                      onClick={async () => {
                        if (doc.storage_path) {
                          const { supabaseBrowser } = await import("@/lib/supabase-client")
                          const { data } = await supabaseBrowser.storage.from("documents").createSignedUrl(doc.storage_path, 3600)
                          if (data?.signedUrl) {
                            setHistoryPreview({ url: data.signedUrl, name: doc.file_name })
                          }
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-start"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
                        isCompleted ? "bg-lease-green/10 border-lease-green/15" :
                        isFailed ? "bg-lease-red/10 border-lease-red/15" :
                        "bg-primary/10 border-primary/15"
                      )}>
                        {isImage ? (
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate" title={doc.file_name}>
                          {doc.file_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                          {doc.building_count > 0 && <span>· {doc.building_count} bldg</span>}
                          {isFailed && <span className="text-lease-red">· failed</span>}
                        </div>
                      </div>
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 text-lease-green shrink-0" />
                      ) : isFailed ? (
                        <AlertCircle className="w-3.5 h-3.5 text-lease-red shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* History document preview modal */}
            <AnimatePresence>
              {historyPreview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-8"
                  onClick={() => setHistoryPreview(null)}
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-background/95 backdrop-blur-2xl border border-border rounded-2xl max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                      <span className="text-sm font-medium truncate">{historyPreview.name}</span>
                      <button onClick={() => setHistoryPreview(null)} className="w-7 h-7 flex items-center justify-center rounded-full glass hover:bg-white/[0.06]">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="p-4 overflow-auto max-h-[calc(85vh-48px)]">
                      <img src={historyPreview.url} alt={historyPreview.name} className="w-full rounded-lg" />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}

function BuildingCard({
  building, expanded, onToggle, confidenceColor, locale
}: {
  building: BuildingExtraction
  expanded: boolean
  onToggle: () => void
  confidenceColor: (c?: number) => string
  locale: string
}) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-3 text-start hover:bg-white/[0.02] transition-colors">
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {locale === "he" ? building.name : (building.name_en || building.name)}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
            {building.address && <span>{building.address}</span>}
            {building.total_sqm && <span>· {building.total_sqm.toLocaleString()} sqm</span>}
            {building.asking_rent_sqm && <span>· ₪{building.asking_rent_sqm}/sqm</span>}
          </div>
        </div>
        {building._confidence !== undefined && (
          <div className="flex items-center gap-1.5">
            <Shield className={cn("w-3 h-3", confidenceColor(building._confidence))} />
            <span className={cn("text-xs font-mono", confidenceColor(building._confidence))}>
              {Math.round(building._confidence * 100)}%
            </span>
          </div>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {/* Building details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {building.class && (
                  <div className="glass rounded-lg px-3 py-2">
                    <div className="text-muted-foreground">Class</div>
                    <div className="font-medium">{building.class}</div>
                  </div>
                )}
                {building.floor_count && (
                  <div className="glass rounded-lg px-3 py-2">
                    <div className="text-muted-foreground">Floors</div>
                    <div className="font-medium">{building.floor_count}</div>
                  </div>
                )}
                {building.vacant_sqm !== undefined && (
                  <div className="glass rounded-lg px-3 py-2">
                    <div className="text-muted-foreground">Vacant</div>
                    <div className="font-medium">{building.vacant_sqm.toLocaleString()} sqm</div>
                  </div>
                )}
                {building.management_fee_sqm && (
                  <div className="glass rounded-lg px-3 py-2">
                    <div className="text-muted-foreground">Mgmt Fee</div>
                    <div className="font-medium">₪{building.management_fee_sqm}/sqm</div>
                  </div>
                )}
              </div>

              {/* Floors */}
              {building.floors && building.floors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Floors</div>
                  {building.floors.map((floor, fi) => (
                    <div key={fi} className="glass rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">Floor {floor.floor_number}</span>
                        {floor.total_sqm && <span className="text-muted-foreground">{floor.total_sqm} sqm</span>}
                      </div>
                      {floor.blocks && floor.blocks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {floor.blocks.map((block, bi) => (
                            <span
                              key={bi}
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-md",
                                block.status === "vacant"
                                  ? "bg-lease-red/10 text-lease-red border border-lease-red/20"
                                  : "bg-lease-green/10 text-lease-green border border-lease-green/20"
                              )}
                            >
                              {block.tenant_name || "Vacant"} · {block.sqm}sqm
                              {block.is_sublease && " (sublease)"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
