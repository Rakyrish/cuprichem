/** Shapes returned by the Django admin API. */

export type PublishStatus =
  | "draft"
  | "ai_generated"
  | "needs_review"
  | "approved"
  | "published"
  | "unpublished"
  | "archived";

export type ContentOrigin =
  | "human"
  | "ai_generated"
  | "ai_assisted"
  | "human_edited"
  | "human_approved";

export type Confidence = "high" | "medium" | "low" | "unknown";
export type SeoBand = "healthy" | "needs_attention" | "critical";
export type IssueSeverity = "critical" | "warning" | "info";

export interface Capabilities {
  [key: string]: boolean;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  capabilities: string[];
  last_login: string | null;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  page: number;
  pages: number;
  page_size: number;
  results: T[];
}

export interface SeoIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  field: string;
}

export interface MediaAsset {
  id: number;
  kind: string;
  secure_url: string;
  original_filename: string;
  content_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  alt_text: string;
  caption: string;
  usage_count: number;
  uploaded_by_email: string;
  created_at: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  summary: string;
  intro: string;
  status: PublishStatus;
  verified: boolean;
  image: number | null;
  display_order: number;
  public_path: string;
  is_public: boolean;
  product_count?: number;
  seo_title: string;
  meta_description: string;
  seo_score: number;
  seo_issues: SeoIssue[];
  created_at: string;
  updated_at: string;
}

export interface Industry extends Omit<Category, "product_count"> {}

export interface ProductListItem {
  id: number;
  slug: string;
  name: string;
  category: number | null;
  category_name: string;
  status: PublishStatus;
  verified: boolean;
  content_origin: ContentOrigin;
  seo_score: number;
  seo_band: SeoBand;
  image_url: string;
  updated_at: string;
  created_at: string;
  published_at: string | null;
}

export interface TechnicalField {
  value: string | string[];
  confidence: Confidence;
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  synonyms: string[];
  category: number | null;
  industries: number[];
  applications: number[];
  related_products: number[];
  short_description: string;
  description: string;
  procurement_notes: string;

  cas_number: string;
  formula: string;
  molecular_weight: string;
  grade: string;
  purity: string;
  appearance: string;
  packaging: string[];
  manufacturer: string;

  field_confidence: Record<string, Confidence>;
  /** Fields an administrator has confirmed. AI can never overwrite these. */
  verified_fields: string[];
  faqs: ProductFaq[];
  technical: Record<string, TechnicalField>;

  primary_image: number | null;
  status: PublishStatus;
  verified: boolean;
  content_origin: ContentOrigin;
  published_at: string | null;
  approved_at: string | null;
  public_path: string;
  is_public: boolean;

  seo_title: string;
  meta_description: string;
  canonical_url: string;
  robots_index: boolean;
  robots_follow: boolean;
  og_title: string;
  og_description: string;
  og_image: string;
  schema_type: string;
  primary_keyword: string;
  secondary_keywords: string[];
  seo_score: number;
  seo_band: SeoBand;
  seo_issues: SeoIssue[];
  seo_checked_at: string | null;

  created_at: string;
  updated_at: string;
}

export type AIOperation =
  | "image_analyze"
  | "product_generate"
  | "seo_generate"
  | "content_improve"
  | "content_review";

export type AIJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type ReviewState = "pending" | "accepted" | "rejected" | "partial";

export interface AIJob {
  id: number;
  operation: AIOperation;
  status: AIJobStatus;
  product: number | null;
  requested_by_email: string;
  input_summary: Record<string, unknown>;
  result: Record<string, unknown>;
  review_state: ReviewState;
  reviewed_at: string | null;
  model_name: string;
  prompt_version: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  error_code: string;
  error_message: string;
  duration_seconds: number | null;
  created_at: string;
}

export interface DashboardOverview {
  catalog: {
    total: number;
    published: number;
    draft: number;
    needs_review: number;
    ai_generated: number;
    approved: number;
    unpublished: number;
    verified: number;
    categories: number;
    industries: number;
    articles: number;
  };
  seo: {
    missing_title: number;
    missing_description: number;
    missing_image: number;
    missing_category: number;
    weak_score: number;
    indexable: number;
  };
  ai: {
    total: number;
    completed: number;
    failed: number;
    pending_review: number;
    total_tokens: number;
  };
  business: { total: number; new: number; in_progress: number };
}

export interface SeoHealth {
  total: number;
  bands: Record<SeoBand, number>;
  worst: {
    id: number;
    slug: string;
    name: string;
    seo_score: number;
    band: SeoBand;
  }[];
}

export interface Inquiry {
  id: number;
  kind: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  product: number | null;
  product_name: string;
  product_text: string;
  quantity: string;
  message: string;
  internal_notes: string;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  target_label: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  metadata: Record<string, unknown>;
  created_at: string;
}
