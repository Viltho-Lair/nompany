import Image from "next/image";
import { parseInline } from "@/shared/blog";

// A POST'S BODY, AS REACT ELEMENTS — never `dangerouslySetInnerHTML`. The
// stored blocks carry text, and the only marks inside it are the three that
// `parseInline` recognises; a link it did not approve arrives here as plain
// text. So there is nothing on this page a post could use to run script.
//
// A server component: the whole article is in the HTML a crawler reads.

function Inline({ text }) {
  return parseInline(text).map((t, i) => {
    if (t.kind === "strong") return <strong key={i} className="font-semibold text-white">{t.text}</strong>;
    if (t.kind === "em") return <em key={i}>{t.text}</em>;
    if (t.kind === "link") {
      const external = /^https?:/i.test(t.href);
      return (
        <a
          key={i}
          href={t.href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="text-[#c9c2ff] underline decoration-[#8b7cff]/50 underline-offset-4 transition-colors hover:text-white"
        >
          {t.text}
        </a>
      );
    }
    return <span key={i}>{t.text}</span>;
  });
}

// Paragraph breaks inside one block stay paragraph breaks.
function Paragraphs({ text }) {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i}>
      {para.split("\n").map((line, k) => (
        <span key={k}>
          {k > 0 ? <br /> : null}
          <Inline text={line} />
        </span>
      ))}
    </p>
  ));
}

export function PostBody({ blocks }) {
  return (
    <div className="space-y-6 text-[17px] leading-[1.8] text-white/75 md:text-[18px] rtl:leading-[2]">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2 key={i} className="pt-6 text-[1.6rem] font-medium leading-tight tracking-[-0.025em] text-[#ececf1] md:text-[2rem] rtl:tracking-normal">
                <Inline text={b.text} />
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="pt-2 text-[1.25rem] font-medium leading-snug text-[#ececf1] md:text-[1.4rem]">
                <Inline text={b.text} />
              </h3>
            );
          case "quote":
            return (
              <figure key={i} className="my-10 border-s-2 border-[#8b7cff] ps-6">
                <blockquote className="text-[1.3rem] leading-relaxed text-[#ececf1] md:text-[1.5rem]">
                  <Paragraphs text={b.text} />
                </blockquote>
                {b.cite ? <figcaption className="mt-3 text-[14px] text-white/50">{b.cite}</figcaption> : null}
              </figure>
            );
          case "list": {
            const List = b.ordered ? "ol" : "ul";
            return (
              <List key={i} className={`space-y-2 ps-6 ${b.ordered ? "list-decimal" : "list-disc"} marker:text-[#8b7cff]`}>
                {b.items.map((item, k) => (
                  <li key={k} className="ps-1">
                    <Inline text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "image":
            return (
              <figure key={i} className="my-10">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
                  <Image src={b.src} alt={b.alt} fill sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
                </div>
                {b.caption ? <figcaption className="mt-3 text-center text-[13px] text-white/45">{b.caption}</figcaption> : null}
              </figure>
            );
          default:
            return <Paragraphs key={i} text={b.text} />;
        }
      })}
    </div>
  );
}
