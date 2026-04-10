export type StarRating = 0 | 1 | 2 | 3;

export type OutreachStatus =
  | "not_contacted"
  | "researching"
  | "draft_ready"
  | "sent"
  | "replied"
  | "followup_due"
  | "skipped";

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: StarRating;
  world_50_rank: number | null;
  head_chef: string | null;
  cuisine_style: string | null;
  website_url: string | null;
  careers_email: string | null;
  instagram: string | null;
  notes: string | null;
  created_at: string;
}

export interface OutreachLog {
  id: string;
  restaurant_id: string;
  user_id: string;
  status: OutreachStatus;
  research_brief: ResearchBrief | null;
  email_subject: string | null;
  email_body: string | null;
  sent_at: string | null;
  gmail_thread_id: string | null;
  followup_due_at: string | null;
  followup_sent: boolean;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestaurantWithOutreach extends Restaurant {
  outreach_log: OutreachLog | null;
}

export interface ResearchBrief {
  kitchen_identity: string;
  what_they_hire_for: string;
  your_connection: string;
}

export interface RawResearch {
  philosophy: string;
  menu_highlights: string;
  chef_background: string;
  recent_press: string;
  sustainability_notes: string;
  raw_text: string;
  emails_found: string[];
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  word_count: number;
}

export interface DashboardStats {
  total: number;
  sent: number;
  replied: number;
  followup_due: number;
  draft_ready: number;
  researching: number;
  user_type: "institute" | "chef" | "free_trial" | null;
  applications_remaining: number | null;
}

export type RegionFilter =
  | "all"
  | "Europe"
  | "Asia"
  | "Americas"
  | "Middle East & Africa"
  | "Oceania";

export type StarFilter = "all" | "0" | "1" | "2" | "3";
export type StatusFilter = "all" | OutreachStatus;

// ── CV & Profile ──────────────────────────────────────────────────────────────

export interface ParsedProfileExperience {
  role: string;
  place: string;
  period: string;
  highlights: string[];
}

export interface ParsedProfile {
  name: string;
  email: string;
  phone: string;
  current_role: string;
  summary: string;
  experiences: ParsedProfileExperience[];
  education: string;
  skills: string[];
  languages: string[];
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  raw_cv_text: string | null;
  parsed_profile: ParsedProfile | null;
  updated_at: string;
}

export * from "./jobs";
export * from "./employer";
