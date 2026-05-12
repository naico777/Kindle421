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
  | { status: "sent"; subscriptionId: string; articleCount: number }
  | { status: "skipped"; subscriptionId: string; reason: string }
  | { status: "failed"; subscriptionId: string; error: string };
