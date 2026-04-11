export interface JobListing {
  id: string;
  restaurant_name: string;
  restaurant_stars: 0 | 1 | 2 | 3;
  city: string;
  country: string;
  job_title: string;
  job_type: string | null;
  description: string | null;
  apply_url: string | null;
  source_url: string | null;
  head_chef: string | null;
  cuisine_style: string | null;
  scraped_at: string;
  expires_at: string | null;
  is_active: boolean;
  world_50_rank: number | null;
}

export type JobStarFilter = "all" | "1" | "2" | "3";

export interface ScrapeStatus {
  last_scraped_at: string | null;
  can_refresh: boolean;
  seconds_until_refresh: number;
}
