"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useBuildings } from "@/lib/hooks/useBuildings"
import Sidebar from "@/components/Sidebar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import ThemeToggle from "@/components/ThemeToggle"
import { Search, Plus, Upload, UserPlus } from "lucide-react"

interface Contact {
  id: string
  company: string
  contactName: string
  phone: string
  email: string
  brokerTag: string
  comments: string
  type: "landlord" | "tenant"
}

const DEMO_CONTACTS: Contact[] = [
  { id: "1", company: "Ampa Capital", contactName: "David Cohen", phone: "+972-54-123-4567", email: "david@ampa.co.il", brokerTag: "Yoram", comments: "Key account, responsive", type: "landlord" },
  { id: "2", company: "Gav-Yam Group", contactName: "Sarah Levi", phone: "+972-52-987-6543", email: "sarah@gavyam.com", brokerTag: "Yoram", comments: "Large portfolio owner", type: "landlord" },
  { id: "3", company: "Azrieli Group", contactName: "Moshe Azrieli", phone: "+972-3-608-1500", email: "moshe@azrieli.com", brokerTag: "Nir", comments: "", type: "landlord" },
  { id: "4", company: "Alony Hetz", contactName: "Roni Hetz", phone: "+972-3-752-2222", email: "roni@alony-hetz.co.il", brokerTag: "Yoram", comments: "Expanding portfolio", type: "landlord" },
  { id: "5", company: "Menivim REIT", contactName: "Yael Sharoni", phone: "+972-3-611-3344", email: "yael@menivim.co.il", brokerTag: "Nir", comments: "", type: "landlord" },
  { id: "6", company: "AppsFlyer", contactName: "Oren Kaniel", phone: "+972-54-333-2211", email: "oren@appsflyer.com", brokerTag: "Yoram", comments: "Looking to expand, 3 floors min", type: "tenant" },
  { id: "7", company: "Monday.com", contactName: "Roy Mann", phone: "+972-52-555-7890", email: "roy@monday.com", brokerTag: "Nir", comments: "Lease expiring Q2 2027", type: "tenant" },
  { id: "8", company: "Wix.com", contactName: "Avishai Abrahami", phone: "+972-3-545-4900", email: "avishai@wix.com", brokerTag: "Yoram", comments: "HQ relocation planned", type: "tenant" },
  { id: "9", company: "IronSource (Unity)", contactName: "Tomer Bar-Zeev", phone: "+972-54-222-1100", email: "tomer@unity.com", brokerTag: "Nir", comments: "Downsizing after merger", type: "tenant" },
  { id: "10", company: "Fiverr", contactName: "Micha Kaufman", phone: "+972-52-888-4400", email: "micha@fiverr.com", brokerTag: "Yoram", comments: "Expanding to 2nd building", type: "tenant" },
  { id: "11", company: "Playtika", contactName: "Robert Antokol", phone: "+972-3-763-2200", email: "robert@playtika.com", brokerTag: "Nir", comments: "", type: "tenant" },
  { id: "12", company: "Shlomo Group", contactName: "Shlomo Shmeltzer", phone: "+972-3-564-1100", email: "shlomo@shlomogroup.co.il", brokerTag: "Yoram", comments: "Multiple properties", type: "landlord" },
]

export default function ContactsPage() {
  const t = useTranslations("contacts")
  const { buildings } = useBuildings()
  const [tab, setTab] = useState<"landlord" | "tenant">("landlord")
  const [search, setSearch] = useState("")

  const filtered = DEMO_CONTACTS.filter(
    (c) =>
      c.type === tab &&
      (!search ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.contactName.toLowerCase().includes(search.toLowerCase()) ||
        c.brokerTag.toLowerCase().includes(search.toLowerCase()))
  )

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
              {t("newContact")}
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
              <Upload className="w-4 h-4" />
              {t("import")}
            </button>
            <button className="inline-flex items-center gap-2 glass px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
              <UserPlus className="w-4 h-4" />
              {t("invite")}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 glass rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab("landlord")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === "landlord"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("landlords")}
            </button>
            <button
              onClick={() => setTab("tenant")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === "tenant"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("tenants")}
            </button>
          </div>

          {/* Table */}
          <div className="glass-strong rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[
                    t("colCompany"),
                    t("colContactName"),
                    t("colPhone"),
                    t("colEmail"),
                    t("colBrokerTag"),
                    t("colComments"),
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
                {filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-border/50 hover:bg-primary/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 text-sm font-medium">{contact.company}</td>
                    <td className="px-4 py-4 text-sm">{contact.contactName}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">{contact.phone}</a>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">{contact.email}</a>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {contact.brokerTag}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground max-w-[200px] truncate">
                      {contact.comments || "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                      {t("noContacts")}
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
