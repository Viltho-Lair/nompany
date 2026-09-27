"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { Mail } from "lucide-react";
import { useSite } from "@/components/landing/site/locale";
import { CELL_IN, Cta, useInViewReveal } from "@/components/landing/site/primitives";
import { PageHero } from "../../PageHero";

// A group's anchor. By position rather than by heading, because a heading is
// words in two languages and an anchor should not change with the language.
const groupId = (i) => `practices-${i + 1}`;

/**
 * SECURITY, in the new design. Every word arrives as props from the server page
 * (the copy module, whose `source` per practice is for maintainers and is never
 * passed here). The page is long and read by people who check, so it opens with
 * a row of pills that jump to each group, and each group keeps its heading in
 * view beside its practices while they are read.
 */
export function SecurityBody({ title, lead, practicesHeading, groups, contactHeading, contactLead, email }) {
  const heading = useInViewReveal(0);
  return (
    <>
      <PageHero title={title} lead={lead}>
        <GroupPills groups={groups} />
      </PageHero>

      <section className="px-6 py-28 md:px-10 md:py-36">
        <div className="mx-auto max-w-[1280px]">
          <motion.h2 {...heading} className="max-w-[20ch] text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:leading-[1.35] rtl:tracking-normal">
            {practicesHeading}
          </motion.h2>
          <div className="mt-16 space-y-24 md:mt-20 md:space-y-32">
            {groups.map((g, i) => (
              <Group key={g.heading} id={groupId(i)} heading={g.heading} practices={g.practices} />
            ))}
          </div>
        </div>
      </section>

      <Contact heading={contactHeading} lead={contactLead} email={email} />
    </>
  );
}

function GroupPills({ groups }) {
  const reveal = useInViewReveal(0.16, undefined, 0.5);
  return (
    <motion.ul {...reveal} className="mt-10 flex flex-wrap gap-2">
      {groups.map((g, i) => (
        <li key={g.heading}>
          <a
            href={`#${groupId(i)}`}
            className="inline-flex h-9 items-center rounded-full bg-white/[0.05] px-4 text-[13px] text-white/75 ring-1 ring-inset ring-white/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-200 ease-out hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff]"
          >
            {g.heading}
          </a>
        </li>
      ))}
    </motion.ul>
  );
}

/**
 * ONE GROUP — its heading pinned at the start while its practices pass, with a
 * line under the heading that fills as the group is read, so a reader always
 * knows which group a card belongs to and how much of it is left. The line is
 * the page's one scroll-linked moment; under reduced motion it is not drawn.
 */
function Group({ id, heading, practices }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { rtl } = useSite();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.7", "end 0.7"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });
  const title = useInViewReveal(0);

  return (
    <div ref={ref} id={id} className="grid scroll-mt-32 grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-32">
          <motion.h3 {...title} className="text-[1.5rem] font-medium leading-tight tracking-[-0.025em] md:text-[1.9rem] rtl:leading-snug rtl:tracking-normal">
            {heading}
          </motion.h3>
          {reduce ? null : (
            <div aria-hidden="true" className="mt-6 hidden h-px w-full max-w-[14rem] overflow-hidden bg-white/10 lg:block">
              <motion.div
                style={{ scaleX: fill, transformOrigin: rtl ? "100% 50%" : "0% 50%" }}
                className="h-full w-full bg-[#8b7cff]"
              />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-8">
        {practices.map((p, k) => (
          <Practice key={p.title} i={k} title={p.title} body={p.body} />
        ))}
      </div>
    </div>
  );
}

function Practice({ i, title, body }) {
  const reveal = useInViewReveal((i % 2) * 0.07, CELL_IN, 0.15);
  return (
    <motion.article
      {...reveal}
      className="rounded-3xl bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <h4 className="text-[1.1rem] font-medium leading-snug tracking-[-0.015em] rtl:tracking-normal">{title}</h4>
      <p className="mt-3 text-[14px] leading-relaxed text-[#9a9aa8]">{body}</p>
    </motion.article>
  );
}

/** Reporting a vulnerability — one address, and a person at the other end. */
function Contact({ heading, lead, email }) {
  const reveal = useInViewReveal(0, CELL_IN, 0.3);
  return (
    <section className="px-6 pb-36 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          {...reveal}
          className="relative isolate overflow-hidden rounded-3xl bg-white/[0.025] p-8 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-14"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: "radial-gradient(120% 90% at 100% 0%, rgba(139,124,255,0.24), rgba(139,124,255,0) 60%)" }}
          />
          <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
            <Mail size={22} strokeWidth={1.5} className="text-[#c9c2ff]" />
          </span>
          <h2 className="mt-8 text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[2.75rem] rtl:leading-[1.35] rtl:tracking-normal">{heading}</h2>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-white/70 md:text-[17px]">{lead}</p>
          <div className="mt-8">
            <Cta href={`mailto:${email}`} variant="secondary">
              <span dir="ltr">{email}</span>
            </Cta>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
