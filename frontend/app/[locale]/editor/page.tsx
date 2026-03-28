"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import Sidebar from "@/components/Sidebar"
import { useBuildings } from "@/lib/hooks/useBuildings"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import ThemeToggle from "@/components/ThemeToggle"
import StackingPlanEditor, { createBlankBuilding, type EditorBuilding } from "@/components/StackingPlanEditor"
import { FolderOpen, FilePlus, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase-client"

export default function EditorPage() {
  const t = useTranslations("editor")
  const locale = useLocale()
  const { buildings: dbBuildings } = useBuildings()
  const [editorBuildings, setEditorBuildings] = useState<EditorBuilding[]>([createBlankBuilding(5)])
  const [saved, setSaved] = useState(false)
  const [loadMenuOpen, setLoadMenuOpen] = useState(false)

  // Load existing building into editor
  const loadBuilding = async (buildingId: string) => {
    const { data: building } = await supabaseBrowser
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (!building) return

    const { data: floors } = await supabaseBrowser
      .from('floors')
      .select('*, tenant_blocks(*)')
      .eq('building_id', buildingId)
      .order('floor_number', { ascending: false })

    if (!floors) return

    const editorFloors = floors.map((f) => ({
      id: f.id,
      floorNumber: f.floor_number,
      hasVacancy: f.tenant_blocks?.some((b: { status: string }) => b.status === 'vacant') ?? false,
      tenants: f.tenant_blocks?.length
        ? f.tenant_blocks.map((b: { id: string; tenant_name: string | null; status: string }) => ({
            id: b.id,
            name: b.tenant_name || '',
            isVacant: b.status === 'vacant' || !b.tenant_name,
          }))
        : [{ id: Math.random().toString(36).slice(2, 9), name: '', isVacant: true }],
    }))

    setEditorBuildings([{
      id: building.id,
      name: building.name || '',
      nameEn: building.name_en || '',
      address: building.address || '',
      city: building.city || '',
      cityEn: building.city_en || '',
      entrance: '',
      floorCount: building.floor_count || floors.length,
      floors: editorFloors,
    }])

    setLoadMenuOpen(false)
    setSaved(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar buildings={dbBuildings} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-3xl font-display tracking-tight">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* New */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditorBuildings([createBlankBuilding(5)])
                  setSaved(false)
                }}
              >
                <FilePlus className="w-3.5 h-3.5" />
                {locale === "he" ? "חדש" : "New"}
              </Button>

              {/* Load existing */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLoadMenuOpen(!loadMenuOpen)}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {locale === "he" ? "טען בניין" : "Load Building"}
                </Button>
                {loadMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLoadMenuOpen(false)} />
                    <div className="absolute top-full end-0 mt-1 z-50 w-64 glass-strong rounded-xl border border-border shadow-2xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        {dbBuildings.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => loadBuilding(String(b.id))}
                            className="w-full text-start px-4 py-2.5 text-sm hover:bg-white/[0.04] transition-colors border-b border-border/30 last:border-0"
                          >
                            <div className="font-medium truncate">{locale === "he" ? b.name : (b.nameEn || b.name)}</div>
                            <div className="text-[10px] text-muted-foreground">{b.address}</div>
                          </button>
                        ))}
                        {dbBuildings.length === 0 && (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            {locale === "he" ? "אין בניינים" : "No buildings"}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>

          {/* Editor */}
          <StackingPlanEditor
            buildings={editorBuildings}
            onChange={(updated) => {
              setEditorBuildings(updated)
              setSaved(false)
            }}
            locale={locale}
          />

          {/* Save area */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {editorBuildings.some(b => !b.name.trim() || (!b.city.trim() && !b.cityEn.trim())) && (
              <p className="text-xs text-lease-red flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {locale === "he"
                  ? "כל בניין חייב שם ועיר לפני שמירה."
                  : "Every building must have a name and city before saving."}
              </p>
            )}
            {saved && (
              <div className="text-sm text-lease-green">
                {locale === "he" ? "נשמר בהצלחה" : "Saved successfully"}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
