export type EmployerRole = "head_chef" | "hr" | "owner" | "manager";

export type EmployerApplicationStatus = "new" | "interested" | "not_a_fit" | "interviewing";

export interface EmployerApplication {
  id: string;
  restaurant_id: string;
  user_id: string;
  status: string;
  employer_status: EmployerApplicationStatus | null;
  email_subject: string | null;
  email_body: string | null;
  sent_at: string | null;
  created_at: string;
  // Joined chef data
  chef_name: string | null;
  chef_slug: string | null;
  chef_current_role: string | null;
  chef_avatar_url: string | null;
  chef_parsed_profile: import("./index").ParsedProfile | null;
}

export interface EmployerStats {
  total_applications: number;
  new_this_week: number;
  interested: number;
  interviewing: number;
}

export interface EmployerRestaurant {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: number;
  cuisine_style: string | null;
  website_url: string | null;
  careers_email: string | null;
  employer_verified: boolean;
}

export type UserRole = "chef" | "employer";
