export interface ResearchBrief {
  kitchen_identity: string;
  what_they_hire_for: string;
  your_connection: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  word_count: number;
}

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
