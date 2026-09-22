// PLANNING & CALENDAR — what runs when, across channels (22/09/2026). The
// arithmetic is ./calendar, pure and shared with the screen; this file reads
// the campaigns and answers the one question the register cannot: what is
// happening AT ONCE.
//
// IT WRITES NOTHING AND OWNS NOTHING. Every bar is a campaign; moving one in
// time is editing that campaign and answers to `marketing.campaigns.edit`. So
// there is no POST here and no collection behind it — a calendar holding its
// own copy of when things run would be a second answer to a question the
// campaign already answers.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { window as calendarWindow, bars, load, thisWeek, addDays } from "./calendar";
import type { MarketingContext, Campaign } from "./types";

const Campaigns = repo<Campaign>("marketingCampaigns");

const WEEKS = 12;
const MAX_WEEKS = 26;

/**
 * THE CALENDAR: whole weeks from a Monday, every campaign that touches them,
 * how loaded each week is per channel, and what this week needs looking at.
 *
 * `from` AND `weeks` COME FROM THE SCREEN, bounded here rather than trusted: a
 * request for five years of weeks is a slow answer nobody asked to wait for.
 */
export async function marketingCalendar(ctx: MarketingContext, q: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.planning.view");
  if (denied) return denied;

  const today = new Date().toISOString().slice(0, 10);
  const asked = String(q?.from ?? "").slice(0, 10);
  // BACK A WEEK BY DEFAULT, not to today: a calendar opening on the current
  // Monday hides the campaign that started last Thursday and is still running,
  // which is exactly the thing somebody opens a calendar to see.
  const from = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : addDays(today, -7);
  const weeks = Math.min(MAX_WEEKS, Math.max(1, Math.round(Number(q?.weeks) || WEEKS)));

  const view = calendarWindow(from, weeks);
  const campaigns = await Campaigns.find({ studio: ctx.studio, section: ctx.campaignsSection });
  const { bars: shown, unscheduled } = bars(campaigns as never, view.from, view.to);

  return {
    asOf: today,
    ...view,
    bars: shown,
    // NAMED, NOT COUNTED. A studio with nine campaigns nobody has dated has a
    // planning problem, and a number alone would not say which nine.
    unscheduled: unscheduled.map((c) => ({
      id: c.id, reference: String(c.reference || ""), name: String(c.name || ""), status: String(c.status || ""),
    })),
    load: load(shown, view.weeks),
    week: thisWeek(shown, today),
    canEdit: !requirePermission(ctx.access, "marketing.campaigns.edit"),
  };
}
