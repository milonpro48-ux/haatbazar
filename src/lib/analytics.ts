export type AnalyticsEventType = "listing_view" | "contact" | "order" | "seller_signup" | "listing_created" | "visit";
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  at: number;
  listingId?: string;
  category?: string;
  visitorId?: string;
}
const EVENTS_KEY = "hb_analytics_events_v1";
const VISITOR_KEY = "hb_analytics_visitor_v1";
const SPEND_KEY = "hb_marketing_spend_v1";

function readEvents(): AnalyticsEvent[] {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]"); } catch { return []; }
}
function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch { return "visitor-unavailable"; }
}
export function trackEvent(type: AnalyticsEventType, data: { listingId?: string; category?: string } = {}) {
  if (typeof window === "undefined") return;
  const event: AnalyticsEvent = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, at: Date.now(), visitorId: visitorId(), ...data };
  try {
    const events = readEvents();
    events.push(event);
    // Local copy supports offline UI; server copy powers shared admin metrics.
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-5000)));
  } catch {}
  try {
    void fetch("/api/analytics/events", { method: "POST", credentials: "include", keepalive: true,
      headers: { "Content-Type": "application/json", "X-Visitor-Id": event.visitorId || "" },
      body: JSON.stringify({ type, listingId: data.listingId, category: data.category })
    }).catch(() => undefined);
  } catch {}
}
export function getAnalyticsEvents(): AnalyticsEvent[] { return readEvents(); }
export function getMarketingSpend(): number {
  try { return Math.max(0, Number(localStorage.getItem(SPEND_KEY) || 0)); } catch { return 0; }
}
export function setMarketingSpend(amount: number) {
  try { localStorage.setItem(SPEND_KEY, String(Math.max(0, amount || 0))); } catch {}
}
export function initializeAnalytics() {
  if (typeof window === "undefined") return;
  try {
    const sessionKey = "hb_analytics_session_v1";
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      trackEvent("visit");
      const last = Number(localStorage.getItem("hb_analytics_last_visit_v1") || 0);
      if (last && Date.now() - last > 30 * 60 * 1000) trackEvent("visit");
      localStorage.setItem("hb_analytics_last_visit_v1", String(Date.now()));
    }
  } catch {}
}
