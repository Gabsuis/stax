"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Link } from "@/i18n/navigation"
import { buildings } from "@/data/buildings"
import { getLeaseColor } from "@/lib/leaseColors"
import { ArrowLeft, ArrowRight, LayoutDashboard, PenTool, Building2, Layers, TrendingUp, Zap } from "lucide-react"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { useLocale } from "next-intl"

function HeroStack() {
  const building = buildings[0]
  const reversedFloors = [...building.floors].reverse()

  return (
    <div className="relative">
      <div className="absolute inset-0 blur-3xl opacity-20"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.15), transparent 70%)" }}
      />
      <div className="relative flex flex-col gap-[3px] w-full max-w-[400px]">
        {reversedFloors.map((floor, i) => (
          <motion.div
            key={floor.floor}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.04, duration: 0.3, ease: "easeOut" }}
            className="flex gap-[2px]"
          >
            {floor.blocks.map((block) => {
              const pct = (block.sqm / floor.totalSqm) * 100
              const isVacant = block.status === "vacant"
              const color = getLeaseColor(block.leaseEnd)

              return (
                <div
                  key={block.id}
                  className="h-[22px] rounded-[3px] flex items-center justify-center"
                  style={{
                    width: `${pct}%`,
                    minWidth: "8px",
                    ...(isVacant
                      ? {
                          background: "rgba(255,255,255,0.03)",
                          border: "1px dashed rgba(255,255,255,0.12)",
                        }
                      : {
                          background: `${color}18`,
                          borderInlineStart: `2px solid ${color}`,
                        }),
                  }}
                >
                  {pct > 25 && !isVacant && (
                    <span className="text-[8px] text-white/40 truncate px-1">{block.tenantName}</span>
                  )}
                </div>
              )
            })}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const t = useTranslations()
  const locale = useLocale()
  const isRtl = locale === "he"
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  const totalSqm = buildings.reduce((s, b) => s + b.totalSqm, 0)
  const totalBuildings = buildings.length

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight">{t("common.stax")}</span>
            <span className="text-[10px] text-muted-foreground">{t("common.version")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              href="/editor"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              {t("nav.editor")}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-foreground text-background px-4 py-1.5 rounded-md font-medium hover:bg-foreground/90 transition-colors"
            >
              {t("nav.dashboard")}
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 bg-secondary/80 border border-border rounded-full px-3 py-1 mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">{t("landing.badge")}</span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5"
              >
                {t("landing.title1")}
                <br />
                <span className="text-muted-foreground">{t("landing.title2")}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-md mb-8 leading-relaxed"
              >
                {t("landing.subtitle")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-center gap-3"
              >
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  {t("landing.ctaDashboard")}
                  <Arrow className="w-4 h-4" />
                </Link>
                <Link
                  href="/editor"
                  className="inline-flex items-center gap-2 bg-secondary border border-border px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  {t("landing.ctaEditor")}
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex items-center gap-6 mt-10 pt-6 border-t border-border"
              >
                <div>
                  <div className="text-2xl font-bold tabular-nums">{totalBuildings}</div>
                  <div className="text-xs text-muted-foreground">{t("landing.buildings")}</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <div className="text-2xl font-bold tabular-nums">{Math.round(totalSqm / 1000)}K</div>
                  <div className="text-xs text-muted-foreground">{t("landing.totalSqm")}</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <div className="text-2xl font-bold tabular-nums">{t("landing.herzliya")}</div>
                  <div className="text-xs text-muted-foreground">{t("landing.market")}</div>
                </div>
              </motion.div>
            </div>

            {/* Hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="bg-card/50 border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">מגדל אמפא</span>
                  <span className="text-xs text-muted-foreground">· ספיר 7, הרצליה פיתוח</span>
                </div>
                <HeroStack />
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-[#16a34a]" />
                    <span className="text-xs text-muted-foreground">{t("legend.over24")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-[#d97706]" />
                    <span className="text-xs text-muted-foreground">{t("legend.6to24")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-[#dc2626]" />
                    <span className="text-xs text-muted-foreground">{t("legend.under6")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-[2px] border border-dashed border-white/20" />
                    <span className="text-xs text-muted-foreground">{t("legend.vacant")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold mb-2">{t("landing.twoTools")}</h2>
            <p className="text-muted-foreground text-base">{t("landing.twoToolsSub")}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Link href="/dashboard" className="block group">
                <div className="bg-card border border-border rounded-xl p-6 h-full transition-all duration-300 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/[0.02]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{t("landing.dashboardTitle")}</h3>
                      <p className="text-sm text-muted-foreground">{t("landing.dashboardDesc")}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 shrink-0" />
                      <span>{t("landing.dashboardF1")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>{t("landing.dashboardF2")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span>{t("landing.dashboardF3")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link href="/editor" className="block group">
                <div className="bg-card border border-border rounded-xl p-6 h-full transition-all duration-300 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/[0.02]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{t("landing.editorTitle")}</h3>
                      <p className="text-sm text-muted-foreground">{t("landing.editorDesc")}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>{t("landing.editorF1")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PenTool className="w-4 h-4 shrink-0" />
                      <span>{t("landing.editorF2")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 shrink-0" />
                      <span>{t("landing.editorF3")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{t("common.stax")} · {t("common.tagline")}</div>
          <div className="text-sm text-muted-foreground">{t("common.demo")}</div>
        </div>
      </footer>
    </div>
  )
}
