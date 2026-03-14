"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Link } from "@/i18n/navigation"
import { buildings } from "@/data/buildings"
import { getLeaseColor } from "@/lib/leaseColors"
import { ArrowLeft, ArrowRight } from "lucide-react"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { useLocale } from "next-intl"

function HeroStack() {
  const building = buildings[0]
  const reversedFloors = [...building.floors].reverse()

  return (
    <div className="relative">
      {/* Ambient glow behind the stack */}
      <div className="absolute -inset-12 blur-[80px] opacity-20"
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.3), rgba(245,158,11,0.15) 40%, transparent 70%)" }}
      />
      <div className="relative flex flex-col gap-[2px] w-full">
        {reversedFloors.map((floor, i) => (
          <motion.div
            key={floor.floor}
            initial={{ opacity: 0, x: -30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.035, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex gap-[2px]"
          >
            <span className="w-6 shrink-0 text-[10px] text-muted-foreground/40 font-mono data-value flex items-center justify-end pe-2">
              {floor.floor}
            </span>
            {floor.blocks.map((block) => {
              const pct = (block.sqm / floor.totalSqm) * 100
              const isVacant = block.status === "vacant"
              const color = getLeaseColor(block.leaseEnd)

              return (
                <motion.div
                  key={block.id}
                  className="h-[28px] rounded-[4px] flex items-center"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    width: `${pct}%`,
                    minWidth: "6px",
                    ...(isVacant
                      ? {
                          background: "rgba(255,255,255,0.02)",
                          border: "1px dashed rgba(255,255,255,0.08)",
                        }
                      : {
                          background: `linear-gradient(135deg, ${color}15, ${color}08)`,
                          borderInlineStart: `2px solid ${color}`,
                        }),
                  }}
                >
                  {pct > 25 && !isVacant && (
                    <span className="text-[9px] text-white/30 truncate px-2 font-medium">{block.tenantName}</span>
                  )}
                </motion.div>
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
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Decorative gradient orbs */}
      <div className="fixed top-[-20vh] end-[-10vw] w-[60vw] h-[60vh] rounded-full blur-[120px] opacity-[0.04]"
        style={{ background: "radial-gradient(circle, oklch(0.75 0.1 150), transparent)" }} />
      <div className="fixed bottom-[-20vh] start-[-10vw] w-[50vw] h-[50vh] rounded-full blur-[120px] opacity-[0.03]"
        style={{ background: "radial-gradient(circle, oklch(0.75 0.1 60), transparent)" }} />

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 inset-x-0 z-50 bg-background/60 backdrop-blur-2xl"
      >
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="font-display text-sm text-primary italic">S</span>
            </div>
            <span className="text-sm font-medium tracking-tight">{t("common.stax")}</span>
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.2em]">{t("common.version")}</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link
              href="/editor"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              {t("nav.editor")}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-primary text-primary-foreground px-5 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              {t("nav.dashboard")}
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-36 pb-28 px-8">
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-[1fr_480px] gap-20 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8">
                  <div className="w-1.5 h-1.5 rounded-full bg-lease-green" />
                  <span className="text-[11px] text-muted-foreground">{t("landing.badge")}</span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6"
              >
                <span className="block text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[1.05]">
                  {t("landing.title1")}
                </span>
                <span className="block text-5xl md:text-6xl lg:text-7xl font-display italic tracking-tight leading-[1.05] text-muted-foreground/60">
                  {t("landing.title2")}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-base text-muted-foreground max-w-lg mb-10 leading-relaxed"
              >
                {t("landing.subtitle")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3"
              >
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2.5 bg-primary text-primary-foreground px-7 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-all"
                >
                  {t("landing.ctaDashboard")}
                  <Arrow className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                </Link>
                <Link
                  href="/editor"
                  className="inline-flex items-center gap-2 glass px-7 py-3 rounded-full text-sm font-medium hover:bg-white/[0.06] transition-all"
                >
                  {t("landing.ctaEditor")}
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex items-center gap-8 mt-14"
              >
                <div>
                  <div className="text-3xl font-display data-value">{totalBuildings}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mt-1">{t("landing.buildings")}</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div>
                  <div className="text-3xl font-display data-value">{Math.round(totalSqm / 1000)}K</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mt-1">{t("landing.totalSqm")}</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div>
                  <div className="text-3xl font-display data-value">{t("landing.herzliya")}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mt-1">{t("landing.market")}</div>
                </div>
              </motion.div>
            </div>

            {/* Hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block"
            >
              <div className="glass-strong rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-2 h-2 rounded-full bg-lease-green/60" />
                  <span className="text-sm font-medium">מגדל אמפא</span>
                  <span className="text-[10px] text-muted-foreground/50 ms-1">ספיר 7, הרצליה פיתוח</span>
                </div>
                <HeroStack />
                <div className="flex items-center gap-5 mt-5 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: "#10b981" }} />
                    <span className="text-[10px] text-muted-foreground/60">{t("legend.over24")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: "#f59e0b" }} />
                    <span className="text-[10px] text-muted-foreground/60">{t("legend.6to24")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: "#f43f5e" }} />
                    <span className="text-[10px] text-muted-foreground/60">{t("legend.under6")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-[2px] border border-dashed border-white/15" />
                    <span className="text-[10px] text-muted-foreground/60">{t("legend.vacant")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-14"
          >
            <h2 className="text-3xl font-display tracking-tight mb-3">{t("landing.twoTools")}</h2>
            <p className="text-muted-foreground text-base">{t("landing.twoToolsSub")}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href="/dashboard" className="block group">
                <div className="glass-strong rounded-2xl p-7 h-full transition-all duration-500 glow-hover">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-lease-green/10 border border-lease-green/15 flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 flex flex-col gap-[2px]">
                        <div className="h-[3px] w-full rounded-full bg-lease-green/60" />
                        <div className="h-[3px] w-3/4 rounded-full bg-lease-green/40" />
                        <div className="h-[3px] w-full rounded-full bg-lease-green/60" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base mb-1">{t("landing.dashboardTitle")}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{t("landing.dashboardDesc")}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground ps-14">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{t("landing.dashboardF1")}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{t("landing.dashboardF2")}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{t("landing.dashboardF3")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href="/editor" className="block group">
                <div className="glass-strong rounded-2xl p-7 h-full transition-all duration-500 glow-hover">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-lease-amber/10 border border-lease-amber/15 flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 flex flex-col gap-[2px] items-end">
                        <div className="h-[3px] w-full rounded-full bg-lease-amber/60" />
                        <div className="h-[3px] w-1/2 rounded-full bg-lease-amber/40" />
                        <div className="h-[3px] w-3/4 rounded-full bg-lease-amber/50" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base mb-1">{t("landing.editorTitle")}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{t("landing.editorDesc")}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground ps-14">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{t("landing.editorF1")}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{t("landing.editorF2")}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
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
      <footer className="border-t border-border py-10 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-sm italic text-muted-foreground/50">S</span>
            <span className="text-xs text-muted-foreground/40">{t("common.stax")} · {t("common.tagline")}</span>
          </div>
          <div className="text-[10px] text-muted-foreground/30 uppercase tracking-[0.15em]">{t("common.demo")}</div>
        </div>
      </footer>
    </div>
  )
}
