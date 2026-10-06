// Renders a JSON-LD structured-data script. Accepts a single object or an
// array of schema.org objects.
//
// AN EMPTY ENTRY RENDERS NOTHING. A builder with nothing to say returns null
// (softwareApplicationLd, when no package has a price), and printing it gave the
// page a script whose whole body was `null`.
export default function JsonLd({ data }: { data: object | null | (object | null)[] }) {
  const items = (Array.isArray(data) ? data : [data]).filter((item): item is object => item != null);
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON is serialised server-side; escape "<" to avoid breaking out of the tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
