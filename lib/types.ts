export type Subscription = {
  id: string;
  kindle_email: string;
  delivery_enabled: boolean;
  accepted_terms_at: string | null;
  last_article_fingerprint: string | null;
  last_edition_fingerprint: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_message: string | null;
  send_count_today: number;
  send_count_date: string | null;
  created_at: string;
  updated_at: string;
};

export type MagazineIssue = {
  id: string;
  issue_number: number;
  title: string;
  slug: string;
  publication_date: string;
  status: "draft" | "ready" | "sent";
  source_filename: string | null;
  source_text: string;
  epub_fingerprint: string | null;
  last_test_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MagazineDelivery = {
  id: string;
  issue_id: string;
  subscription_id: string;
  kindle_email: string;
  status: "sent" | "failed";
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

export type FeedArticle = {
  guid: string;
  title: string;
  link: string;
  pubDate: Date;
  author?: string;
  html: string;
  fingerprint: string;
};

export type DeliveryResult =
  | { status: "sent"; subscriptionId: string; articleCount?: number; issueId?: string }
  | { status: "skipped"; subscriptionId: string; reason: string }
  | { status: "failed"; subscriptionId: string; error: string };
