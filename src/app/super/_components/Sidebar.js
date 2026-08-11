"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { NAV, BASE } from "./nav";

function Brand({ collapsed }) {
  return (
    <Link href={`${BASE}/dashboard/analytics`} className="flex h-[74px] items-center gap-2.5 px-6 py-4">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-white"
        style={{ backgroundColor: "var(--ad-sidebar-primary)" }}
      >
        n
      </span>
      {!collapsed ? (
        <span className="truncate text-lg font-semibold" style={{ color: "var(--ad-sidebar-accent-foreground)" }}>
          nompany
          <span className="ms-1 text-[10px] font-semibold uppercase tracking-widest opacity-60">super</span>
        </span>
      ) : null}
    </Link>
  );
}

function Tree({ item, pathname }) {
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
      >
        <span className="me-[15px] flex h-6 w-6 shrink-0 items-center justify-center">
          <Icon name={item.icon} className="h-[18px] w-[18px]" />
        </span>
        <span className="ad-nav-label flex-1 truncate text-start">{item.label}</span>
        <Icon
          name="chevronRight"
          className={`ad-nav-chevron h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      <div
        className={`ad-nav-sub grid transition-[grid-template-rows] duration-200 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="py-[15px]">
            {item.children.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="ad-nav-sublink"
                data-active={pathname === c.href ? "true" : "false"}
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

// Only the collapse width animates on the desktop rail — transitioning every
// property would make each theme switch fade the whole sidebar.
export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const pathname = usePathname() || "";

  const body = (
    <>
      <Brand collapsed={collapsed} />
      <div className="ad-scrollarea flex-1 py-[10px]" style={{ height: "calc(100vh - 74px)" }}>
        {NAV.map((group) => (
          <div key={group.caption}>
            <div className="ad-nav-caption">{group.caption}</div>
            <nav className="flex flex-col">
              {group.items.map((item) =>
                item.children ? (
                  <Tree key={item.label} item={item} pathname={pathname} />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="ad-nav-link"
                    data-active={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "true" : "false"}
                    onClick={onCloseMobile}
                  >
                    <span className="me-[15px] flex h-6 w-6 shrink-0 items-center justify-center">
                      <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="ad-nav-label flex-1 truncate">{item.label}</span>
                  </Link>
                ),
              )}
            </nav>
          </div>
        ))}
        <div className="h-8" />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="ad-sidebar-el fixed top-0 z-40 hidden h-screen flex-col transition-[width] duration-300 ease-in-out lg:flex ltr:left-0 rtl:right-0"
        style={{
          width: collapsed ? "var(--ad-sidebar-collapsed-width)" : "var(--ad-sidebar-width)",
          backgroundColor: "var(--ad-sidebar)",
          boxShadow: "var(--ad-sidebar-shadow)",
        }}
      >
        {body}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 z-50 flex h-screen w-[264px] flex-col transition-transform duration-300 lg:hidden ltr:left-0 rtl:right-0 ${
          mobileOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"
        }`}
        style={{ backgroundColor: "var(--ad-sidebar)", boxShadow: "var(--ad-sidebar-shadow)" }}
        aria-hidden={!mobileOpen}
      >
        {body}
      </aside>
    </>
  );
}
