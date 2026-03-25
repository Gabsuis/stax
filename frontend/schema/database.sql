-- ============================================================
-- STAX — Database Schema
-- Target: Supabase (PostgreSQL 15+)
-- Sources: Plan for Stax.md + existing demo types/data
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

-- From demo: BuildingClass — extended with A+ from plan's "class" field
CREATE TYPE building_class    AS ENUM ('A+', 'A', 'A/B', 'B', 'C');

-- From demo: BlockStatus
CREATE TYPE block_status      AS ENUM ('vacant', 'occupied');

-- From demo: LeaseUrgency
CREATE TYPE lease_urgency     AS ENUM ('safe', 'watch', 'urgent', 'unknown');

-- From demo: area field on buildings (צפון/מרכז/דרום)
CREATE TYPE area_region       AS ENUM ('north', 'center', 'south');

-- From plan: "delivery condition"
-- Extended with 'furnished' and 'furnished_equipped' seen in
-- real docs: "מרוהט ומאובזר" (Hod HaSharon, Migdalei Ziv)
CREATE TYPE delivery_condition AS ENUM (
  'shell_and_core',
  'as_is',
  'as_is_new',
  'as_is_high_level',
  'turnkey',
  'furnished',              -- מרוהט — furniture included
  'furnished_equipped',     -- מרוהט ומאובזר — furniture + IT/kitchen
  'renovation_required'
);

-- From plan: "LEED environmental efficiency rating"
CREATE TYPE leed_rating       AS ENUM (
  'certified', 'silver', 'gold', 'platinum', 'none', 'unknown'
);

-- From plan: "parking (number of spaces, cost per space, management fee, parking ratio)"
CREATE TYPE parking_type      AS ENUM ('open', 'reserved', 'underground');

-- From plan: "building amenities (restaurant, gym, retail, etc.)"
CREATE TYPE amenity_type      AS ENUM (
  'restaurant', 'cafe', 'gym', 'retail', 'lobby_lounge',
  'conference_center', 'daycare', 'synagogue', 'shower_rooms',
  'bike_storage', 'rooftop_terrace', 'ev_charging', 'other'
);

-- From plan: "documents — all file types (images, PDFs, text, Word)"
-- + "fee agreement documentation for tenants and/or landlords"
-- Extended with types seen in real example documents:
--   Atrium Tower.pdf → single building brochure
--   מידעון אמות מרץ 2026.pdf → 47-page multi-building catalog
--   שטחי משרדים סלע.pdf → 19-page broker listing
--   newsletter_february.pdf → multi-building newsletter
--   מגדלי זיו / הוד השרון → single vacancy/sublease listing
CREATE TYPE document_type     AS ENUM (
  'lease_agreement',
  'fee_agreement_tenant',
  'fee_agreement_landlord',
  'building_brochure',        -- single building spec/marketing sheet
  'vacancy_listing',          -- specific vacant space offering
  'multi_building_catalog',   -- newsletter/catalog with many buildings (e.g. Amot מידעון)
  'broker_listing',           -- broker's multi-building inventory list (e.g. Sela דיוור)
  'floor_plan',
  'building_photo',
  'building_video',
  'proposal',
  'correspondence',
  'other'
);

-- For AI document processing pipeline
CREATE TYPE ai_extraction_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'review_needed'
);

-- From plan: "tracking client outreach" — contact methods
CREATE TYPE contact_method    AS ENUM ('phone', 'email', 'whatsapp', 'meeting', 'other');

-- From plan: "role-based access (Admin and User views)"
CREATE TYPE user_role         AS ENUM ('admin', 'user');

-- From plan: "AI insight view with actionable items (Deal Radar)"
CREATE TYPE insight_priority  AS ENUM ('urgent', 'high', 'medium', 'low');

-- From plan: "Deal Radar" + "transaction intelligence feed"
CREATE TYPE insight_category  AS ENUM (
  'vacancy_alert',
  'expiring_lease',
  'deal_opportunity',
  'market_trend',
  'price_change',
  'news_intelligence'
);


-- ────────────────────────────────────────────────────────────
-- 1. USERS & AUTH
-- From plan: "role-based access (Admin and User views),
-- secure authentication"
-- ────────────────────────────────────────────────────────────

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'user',
  phone           TEXT,
  avatar_url      TEXT,
  preferred_locale TEXT DEFAULT 'he',          -- plan: "bilingual (English and Hebrew)"
  preferred_theme TEXT DEFAULT 'dark',         -- plan: "day/night mode"
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 2. BUILDING OWNERS
-- From plan: "building owner"
-- From demo: owner field on Building
-- ────────────────────────────────────────────────────────────

CREATE TABLE owners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,               -- Hebrew (demo: "אמפא", "גב-ים")
  name_en         TEXT,
  email           TEXT,                        -- plan: "contact information (email)"
  phone           TEXT,                        -- plan: "contact information (number)"
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 3. BUILDINGS
-- From plan: building profiles with ALL listed data points
-- From demo: Building interface fields
-- ────────────────────────────────────────────────────────────

CREATE TABLE buildings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Demo: name, nameEn
  name            TEXT NOT NULL,
  name_en         TEXT,

  -- Plan: "building owner" → FK
  owner_id        UUID REFERENCES owners(id) ON DELETE SET NULL,

  -- Demo: address; Plan: "building address"
  address         TEXT NOT NULL,
  city            TEXT NOT NULL DEFAULT 'הרצליה',
  city_en         TEXT DEFAULT 'Herzliya',

  -- Demo: area (צפון/מרכז/דרום)
  area            area_region,

  -- Plan: map view — "2D Google Maps displaying all building addresses"
  latitude        DECIMAL(10, 7),
  longitude       DECIMAL(10, 7),

  -- Demo: class; Plan: "building class"
  class           building_class NOT NULL,

  -- Plan: "year built"
  year_built      INTEGER,

  -- Plan: "LEED environmental efficiency rating"
  leed_rating     leed_rating DEFAULT 'unknown',

  -- Demo: floorCount; Plan: "number of floors"
  floor_count     INTEGER NOT NULL,

  -- Demo: floorSize; Plan: "typical floor size"
  typical_floor_sqm INTEGER NOT NULL,

  -- Plan: "typical floor plan" — stored as image URL
  typical_floor_plan_url TEXT,

  -- Demo: totalSqm; Plan: "building size (Sqm)"
  total_sqm       INTEGER NOT NULL,

  -- Demo: vacantSqm; Plan: "vacant areas (Sqm)"
  vacant_sqm      INTEGER NOT NULL DEFAULT 0,

  -- Demo: occupancy; Plan: "occupancy rate"
  occupancy_rate  DECIMAL(5, 4),

  -- Demo: askingPrice; Plan: "asking rent per Sqm"
  asking_rent_sqm DECIMAL(10, 2),

  -- Demo: finish; Plan: "delivery condition"
  delivery_condition delivery_condition,

  -- Demo: allowance; Plan: "allowance"
  allowance       TEXT,

  -- Demo: managementFee; Plan: "general maintenance fees"
  management_fee_sqm DECIMAL(10, 2),

  -- Plan: "municipal tax"
  municipal_tax_sqm DECIMAL(10, 2),

  -- Plan: "distance from nearest train/light rail"
  distance_train_km DECIMAL(5, 2),
  distance_light_rail_km DECIMAL(5, 2),

  -- Plan: "parking (number of spaces, parking ratio per sqm)"
  -- Demo: parkingPrice (stored as text in demo)
  parking_spaces  INTEGER,
  parking_ratio   DECIMAL(5, 2),

  -- Plan: "contact information (number and email)"
  -- Demo: contact, phone
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,

  -- Plan: "building photos & videos" — hero image
  hero_image_url  TEXT,

  -- Demo: notes
  notes           TEXT,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_buildings_city ON buildings(city);
CREATE INDEX idx_buildings_area ON buildings(area);
CREATE INDEX idx_buildings_class ON buildings(class);
CREATE INDEX idx_buildings_geo ON buildings(latitude, longitude);


-- ────────────────────────────────────────────────────────────
-- 3a. BUILDING PHOTOS & VIDEOS
-- From plan: "building photos & videos"
-- ────────────────────────────────────────────────────────────

CREATE TABLE building_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  media_type      TEXT NOT NULL,               -- 'image/jpeg', 'video/mp4', etc.
  caption         TEXT,
  is_hero         BOOLEAN DEFAULT FALSE,
  sort_order      INTEGER DEFAULT 0,
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_building_media_building ON building_media(building_id);


-- ────────────────────────────────────────────────────────────
-- 3b. BUILDING AMENITIES
-- From plan: "building amenities (restaurant, gym, retail, etc.)"
-- ────────────────────────────────────────────────────────────

CREATE TABLE building_amenities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  amenity         amenity_type NOT NULL,
  details         TEXT,
  UNIQUE(building_id, amenity)
);


-- ────────────────────────────────────────────────────────────
-- 3c. PARKING OPTIONS
-- From plan: "parking (number of spaces, cost per space,
-- management fee, parking ratio per sqm)"
-- Demo: parkingPrice shows multiple tiers per building
-- e.g. "800 ₪ צפה / 1,000 ₪ שמורה"
-- ────────────────────────────────────────────────────────────

CREATE TABLE parking_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  parking_type    parking_type NOT NULL,
  price_monthly   DECIMAL(10, 2),              -- plan: "cost per space"
  management_fee  DECIMAL(10, 2),              -- plan: "management fee"
  spaces_available INTEGER,
  notes           TEXT
);


-- ────────────────────────────────────────────────────────────
-- 4. FLOORS
-- From demo: Floor interface { floor, totalSqm, blocks[] }
-- From plan: "number of floors", "typical floor size",
-- "typical floor plan"
-- ────────────────────────────────────────────────────────────

CREATE TABLE floors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_number    INTEGER NOT NULL,
  total_sqm       INTEGER NOT NULL,
  floor_plan_url  TEXT,                        -- plan: "typical floor plan"
  notes           TEXT,
  UNIQUE(building_id, floor_number)
);

CREATE INDEX idx_floors_building ON floors(building_id);


-- ────────────────────────────────────────────────────────────
-- 5. TENANTS (companies)
-- From demo: tenantName on TenantBlock
-- Normalized into own table so AI agents can build a tenant
-- registry from extracted lease documents
-- ────────────────────────────────────────────────────────────

CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,               -- demo: "AppsFlyer", "אמפא קפיטל"
  name_en         TEXT,
  industry        TEXT,
  website         TEXT,
  logo_url        TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_name ON tenants(name);


-- ────────────────────────────────────────────────────────────
-- 6. TENANT BLOCKS (the stacking plan unit)
-- From demo: TenantBlock { id, tenantName, sqm, status,
--            leaseEnd, notes }
-- This is THE core unit that AI agents extract from leases.
-- Plan: stacking plans with "color-coded visualizations"
-- ────────────────────────────────────────────────────────────

CREATE TABLE tenant_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id        UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Demo: sqm, status
  sqm             INTEGER NOT NULL,
  status          block_status NOT NULL DEFAULT 'vacant',

  -- From real docs: שכירות משנה (Hod HaSharon, Migdalei Ziv)
  -- Sublease vs direct lease — AI needs to flag this
  is_sublease     BOOLEAN DEFAULT FALSE,
  sublease_tenant TEXT,                        -- who is sub-landlord (original tenant)
  sublease_end    DATE,                        -- when sublease agreement ends (may differ from master lease)

  -- From real docs: "אכלוס מיידי" (immediate) vs "Q1-2026"
  -- When a vacant block becomes available for move-in
  available_from  DATE,                        -- NULL = immediate (אכלוס מיידי)

  -- From real docs: delivery state per block (can differ from building-level)
  -- e.g. one floor is "מרוהט ומאובזר" while building default is "as_is"
  delivery_condition delivery_condition,

  -- Demo: leaseEnd; extended with leaseStart for AI extraction
  lease_start     DATE,
  lease_end       DATE,

  -- Demo: lease urgency computed from leaseEnd
  lease_urgency   lease_urgency GENERATED ALWAYS AS (
    CASE
      WHEN lease_end IS NULL THEN 'unknown'
      WHEN lease_end < CURRENT_DATE + INTERVAL '12 months' THEN 'urgent'
      WHEN lease_end < CURRENT_DATE + INTERVAL '36 months' THEN 'watch'
      ELSE 'safe'
    END
  ) STORED,

  -- Financial terms (AI extracts from lease agreements & brochures)
  rent_per_sqm    DECIMAL(10, 2),
  management_fee_sqm DECIMAL(10, 2),           -- from real docs: דמי ניהול per block (can override building-level)
  escalation_pct  DECIMAL(5, 2),
  escalation_index TEXT,                       -- "CPI", "fixed", etc.

  -- Option periods (AI extracts from lease agreements)
  option_periods  INTEGER DEFAULT 0,
  option_years    INTEGER DEFAULT 0,

  -- Plan: "color-coded visualizations" + "manual color-coding"
  color_override  TEXT,                        -- hex for manual color-coding
  sort_order      INTEGER DEFAULT 0,

  -- Demo: notes
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_floor ON tenant_blocks(floor_id);
CREATE INDEX idx_blocks_tenant ON tenant_blocks(tenant_id);
CREATE INDEX idx_blocks_lease_end ON tenant_blocks(lease_end);
CREATE INDEX idx_blocks_status ON tenant_blocks(status);


-- ────────────────────────────────────────────────────────────
-- 7. DOCUMENTS
-- From plan: "Drag-and-drop document attachment supporting all
-- file types (images, PDFs, text, Word documents). Documents
-- can be tied to buildings, including fee agreement
-- documentation for tenants and/or landlords."
-- ────────────────────────────────────────────────────────────

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File info
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,               -- MIME type
  file_size_bytes BIGINT,
  storage_path    TEXT NOT NULL,
  url             TEXT,

  -- Classification
  document_type   document_type NOT NULL DEFAULT 'other',

  -- Plan: "Documents can be tied to buildings"
  building_id     UUID REFERENCES buildings(id) ON DELETE SET NULL,
  floor_id        UUID REFERENCES floors(id) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  tenant_block_id UUID REFERENCES tenant_blocks(id) ON DELETE SET NULL,
  client_id       UUID,                        -- FK added after clients table

  -- AI extraction (the processing pipeline)
  ai_status       ai_extraction_status DEFAULT 'pending',
  ai_extracted_at TIMESTAMPTZ,
  ai_raw_output   JSONB,                       -- full Claude response
  ai_confidence   DECIMAL(3, 2),
  ai_model        TEXT,
  ai_prompt_hash  TEXT,

  -- Human review
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,

  -- Meta
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_building ON documents(building_id);
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_ai_status ON documents(ai_status);


-- ────────────────────────────────────────────────────────────
-- 8. AI EXTRACTION LOG
-- Audit trail for what AI extracted from each document.
-- Not in plan text but directly required by the AI processing
-- pipeline the plan describes.
-- ────────────────────────────────────────────────────────────

CREATE TABLE ai_extractions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  target_table    TEXT NOT NULL,               -- 'tenant_blocks', 'tenants', 'buildings'
  target_id       UUID,
  extracted_data  JSONB NOT NULL,

  confidence      DECIMAL(3, 2),
  warnings        TEXT[],

  applied         BOOLEAN DEFAULT FALSE,
  applied_by      UUID REFERENCES users(id),
  applied_at      TIMESTAMPTZ,
  rejected        BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,

  model           TEXT,
  prompt_version  TEXT,
  tokens_used     INTEGER,
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_extractions_document ON ai_extractions(document_id);
CREATE INDEX idx_extractions_target ON ai_extractions(target_table, target_id);


-- ────────────────────────────────────────────────────────────
-- 9. CRM — CLIENTS
-- From plan: "CRM & Client Management — tracking client
-- outreach, associating clients with buildings and brokers
-- (employees)"
-- ────────────────────────────────────────────────────────────

CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name            TEXT NOT NULL,
  company         TEXT,
  email           TEXT,
  phone           TEXT,

  -- Classification
  is_tenant       BOOLEAN DEFAULT FALSE,
  is_landlord     BOOLEAN DEFAULT FALSE,

  -- Requirements (for tenants searching for space)
  required_sqm_min INTEGER,
  required_sqm_max INTEGER,
  budget_per_sqm  DECIMAL(10, 2),
  preferred_area  area_region,
  preferred_class building_class,

  -- Plan: "associating clients with brokers (employees)"
  assigned_broker UUID REFERENCES users(id),

  -- Plan: "notes section"
  notes           TEXT,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_broker ON clients(assigned_broker);

-- Add FK to documents now that clients exists
ALTER TABLE documents ADD CONSTRAINT fk_documents_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;


-- ────────────────────────────────────────────────────────────
-- 10. CRM — CONTACT LOG
-- From plan: "notes section with timestamped contacts
-- and entries"
-- ────────────────────────────────────────────────────────────

CREATE TABLE contact_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id       UUID NOT NULL REFERENCES users(id),

  -- Interaction
  contact_method  contact_method NOT NULL,
  subject         TEXT,
  body            TEXT,                        -- plan: "notes section... entries"

  -- Plan: "associating clients with buildings"
  building_id     UUID REFERENCES buildings(id),

  -- Plan: "timestamped"
  contacted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_log_client ON contact_log(client_id);
CREATE INDEX idx_contact_log_broker ON contact_log(broker_id);
CREATE INDEX idx_contact_log_date ON contact_log(contacted_at);


-- ────────────────────────────────────────────────────────────
-- 11. CLIENT ↔ BUILDING ASSOCIATIONS
-- From plan: "associating clients with buildings"
-- ────────────────────────────────────────────────────────────

CREATE TABLE client_buildings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  interest_level  INTEGER DEFAULT 0,
  toured          BOOLEAN DEFAULT FALSE,
  toured_at       DATE,
  notes           TEXT,
  UNIQUE(client_id, building_id)
);


-- ────────────────────────────────────────────────────────────
-- 12. AI INSIGHTS / DEAL RADAR
-- From plan: "AI insight view with actionable items
-- (Deal Radar), complemented by a transaction intelligence
-- feed that aggregates and summarizes targeted commercial
-- real estate news (e.g., Globes, Calcalist, The Marker
-- and similar sources) using LLM processing."
-- ────────────────────────────────────────────────────────────

CREATE TABLE insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  category        insight_category NOT NULL,
  priority        insight_priority NOT NULL,

  -- Plan: bilingual content
  title           TEXT NOT NULL,
  title_en        TEXT,
  body            TEXT NOT NULL,
  body_en         TEXT,

  -- Actionable links
  building_id     UUID REFERENCES buildings(id),
  tenant_id       UUID REFERENCES tenants(id),
  client_id       UUID REFERENCES clients(id),
  tenant_block_id UUID REFERENCES tenant_blocks(id),

  -- Plan: "transaction intelligence feed... news
  -- (Globes, Calcalist, The Marker)"
  source_url      TEXT,
  source_name     TEXT,
  source_date     DATE,

  -- Lifecycle
  is_read         BOOLEAN DEFAULT FALSE,
  is_dismissed    BOOLEAN DEFAULT FALSE,
  is_actioned     BOOLEAN DEFAULT FALSE,
  actioned_by     UUID REFERENCES users(id),

  -- AI generation
  ai_model        TEXT,
  ai_confidence   DECIMAL(3, 2),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_insights_category ON insights(category);
CREATE INDEX idx_insights_priority ON insights(priority);
CREATE INDEX idx_insights_building ON insights(building_id);
CREATE INDEX idx_insights_active ON insights(is_dismissed, is_actioned);


-- ────────────────────────────────────────────────────────────
-- 13. STACKING PLAN SNAPSHOTS
-- From plan: "editor will support export of multiple visual
-- versions as image files"
-- ────────────────────────────────────────────────────────────

CREATE TABLE stacking_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,

  label           TEXT,                        -- e.g. "Q1 2026", "For client X"
  image_url       TEXT NOT NULL,
  format          TEXT DEFAULT 'png',

  -- Full state at time of export
  snapshot_data   JSONB,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 14. SAVED VIEWS
-- From plan: "data export capabilities" + existing demo
-- has filter bar with area/class
-- ────────────────────────────────────────────────────────────

CREATE TABLE saved_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  filters         JSONB NOT NULL,
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 15. AUDIT LOG
-- Required by plan: "secure authentication" + role-based
-- access implies auditability
-- ────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_time ON audit_log(created_at);


-- ────────────────────────────────────────────────────────────
-- VIEWS
-- ────────────────────────────────────────────────────────────

-- Portfolio KPIs (from demo: dashboard stats)
CREATE VIEW v_building_summary AS
SELECT
  b.id,
  b.name,
  b.name_en,
  b.city,
  b.class,
  b.total_sqm,
  b.vacant_sqm,
  b.occupancy_rate,
  b.asking_rent_sqm,
  o.name AS owner_name,
  COUNT(DISTINCT f.id) AS floor_count,
  COUNT(DISTINCT tb.id) AS block_count,
  COUNT(DISTINCT tb.id) FILTER (WHERE tb.status = 'occupied') AS occupied_blocks,
  COUNT(DISTINCT tb.id) FILTER (WHERE tb.status = 'vacant') AS vacant_blocks,
  COUNT(DISTINCT tb.id) FILTER (WHERE tb.lease_urgency = 'urgent') AS urgent_leases,
  COUNT(DISTINCT d.id) AS document_count
FROM buildings b
LEFT JOIN owners o ON o.id = b.owner_id
LEFT JOIN floors f ON f.building_id = b.id
LEFT JOIN tenant_blocks tb ON tb.floor_id = f.id
LEFT JOIN documents d ON d.building_id = b.id
GROUP BY b.id, o.name;

-- Expiring leases (from demo: dashboard expiring leases sidebar)
CREATE VIEW v_expiring_leases AS
SELECT
  tb.id AS block_id,
  t.name AS tenant_name,
  b.name AS building_name,
  f.floor_number,
  tb.sqm,
  tb.lease_end,
  tb.rent_per_sqm,
  tb.lease_urgency
FROM tenant_blocks tb
JOIN floors f ON f.id = tb.floor_id
JOIN buildings b ON b.id = f.building_id
LEFT JOIN tenants t ON t.id = tb.tenant_id
WHERE tb.status = 'occupied'
  AND tb.lease_end IS NOT NULL
  AND tb.lease_end <= CURRENT_DATE + INTERVAL '12 months'
ORDER BY tb.lease_end;


-- ────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- From plan: "role-based access (Admin and User views)"
-- ────────────────────────────────────────────────────────────

ALTER TABLE buildings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY admin_all ON buildings FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY admin_all_floors ON floors FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY admin_all_blocks ON tenant_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY admin_all_tenants ON tenants FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY admin_all_documents ON documents FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY admin_all_clients ON clients FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY admin_all_contacts ON contact_log FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY admin_all_insights ON insights FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- User: read all portfolio data, manage own clients
CREATE POLICY user_read_buildings ON buildings FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()));
CREATE POLICY user_read_floors ON floors FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()));
CREATE POLICY user_read_blocks ON tenant_blocks FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()));
CREATE POLICY user_read_tenants ON tenants FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()));
CREATE POLICY user_read_documents ON documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()));
CREATE POLICY user_own_clients ON clients FOR ALL
  USING (assigned_broker = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY user_own_contacts ON contact_log FOR ALL
  USING (broker_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY user_read_insights ON insights FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()));


-- ────────────────────────────────────────────────────────────
-- TRIGGERS
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_buildings_updated   BEFORE UPDATE ON buildings     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tenants_updated     BEFORE UPDATE ON tenants       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_blocks_updated      BEFORE UPDATE ON tenant_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated   BEFORE UPDATE ON documents     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated     BEFORE UPDATE ON clients       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_owners_updated      BEFORE UPDATE ON owners        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated       BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
