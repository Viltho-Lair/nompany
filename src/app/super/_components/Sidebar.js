"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { NAV, BASE } from "./nav";

// THE RAIL. It used to be a full-height navy slab pinned to the window edge —
// the template's shape, and the one piece of chrome that made the console
// unmistakably not this product. It is now the Studio's rail: a card of the
// ordinary surface colour, floating inset from every edge, with the same
// geex radius and the same soft shadow as the panels beside it.
//
// Nothing in here is physical. `start-4` and `inset-y-4` place the card,
// `ad-slide-out-start` parks the mobile drawer past the inline start, and the
// nav rows carry logical padding — so `dir="rtl"` on the shell mirrors the
// whole rail with no second set of rules to keep in step.

function Brand({ collapsed }) {
  return (
    <Link
      href={`${BASE}/dashboard/analytics`}
      className="flex items-center gap-2.5 px-4 py-5"
      aria-label="nompany Super Admin — dashboard"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--ad-muted)] p-[3px]">
        <Image src="/brand/logo-icon.png" alt="" width={36} height={36} className="h-full w-full object-contain" />
      </span>
      {!collapsed ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-display text-[15px] font-700 tracking-tight text-[var(--ad-foreground)]">
            nompany
          </span>
          {/* The console's name is set in the same monospaced, tracked-out
              register the Studio uses for a slug — it identifies a surface, not
              a sentence. */}
          <span className="num truncate text-[10px] font-500 uppercase tracking-[0.18em] text-[var(--ad-muted-foreground)]">
            super admin
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function Tree({ item, pathname, collapsed }) {
  const hasActive = item.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  const [open, setOpen] = useState(hasActive);

  // Keep the branch containing the current route open across navigations.
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="ad-nav-link"
        data-active={hasActive ? "true" : "false"}
        title={collapsed ? item.label : undefined}
      >
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <Icon name={item.icon} className="h-[18px] w-[18px]" />
        </span>
        <span className="ad-nav-label flex-1 truncate text-start">{item.label}</span>
        <Icon
          name="chevronRight"
          className={`ad-nav-chevron h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {/* A grid-rows 0fr→1fr collapse, so the panel animates to its own height
          without anyone measuring it. */}
      <div
        className={`ad-nav-sub grid transition-[grid-template-rows] duration-200 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 py-1">
            {item.children.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="ad-nav-sublink"
                data-active={pathname === c.href ? "true" : "false"}
                aria-current={pathname === c.href ? "page" : undefined}
              >
                <span className="truncate">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const pathname = usePathname() || "";

  const body = (
    <>
      <Brand collapsed={collapsed} />
      <nav className="ad-scrollarea flex-1 px-3 pb-6" aria-label="Console sections">
        {NAV.map((group) => (
          <div key={group.caption}>
            <div className="ad-nav-caption">{group.caption}</div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) =>
                item.children ? (
                  <Tree key={item.label} item={item} pathname={pathname} collapsed={collapsed} />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="ad-nav-link"
                    data-active={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "true" : "false"}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                      <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="ad-nav-label flex-1 truncate">{item.label}</span>
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop rail — a floating card, not a slab. Only `width` transitions:
          transitioning every property would fade the whole rail on each theme
          switch. The width itself comes from `.ad-sidebar-el` and
          `.ad-collapsed .ad-sidebar-el` in super.css, so collapsing is one class
          on the shell rather than a value threaded through here as well. */}
      <aside
        className="ad-sidebar-el fixed inset-y-4 start-4 z-40 hidden flex-col overflow-hidden rounded-geex transition-[width] duration-300 ease-in-out lg:flex"
        style={{ backgroundColor: "var(--ad-sidebar)", boxShadow: "var(--ad-sidebar-shadow)" }}
      >
        {body}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 bg-[rgb(var(--ad-foreground-rgb)/0.4)] transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-[17rem] flex-col transition-transform duration-300 lg:hidden ${
          mobileOpen ? "ad-slide-in" : "ad-slide-out-start"
        }`}
        style={{ backgroundColor: "var(--ad-sidebar)", boxShadow: "var(--ad-sidebar-shadow)" }}
        aria-hidden={!mobileOpen}
      >
        {body}
      </aside>
    </>
  );
}
