import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Gallery" };

// Tiles are CSS gradients rather than image files: the console ships no binary
// assets, and this keeps the page self-contained and theme-aware.
const ALBUMS = [
  { name: "Brand refresh 2026", count: 84, from: "#4680ff", to: "#7c4dff" },
  { name: "Riyadh expo", count: 132, from: "#1abc9c", to: "#3ebfea" },
  { name: "Product screenshots", count: 268, from: "#e58a00", to: "#dc2626" },
  { name: "Team & culture", count: 96, from: "#7c4dff", to: "#e91e63" },
];

const PHOTOS = [
  { title: "Console — dark theme", tag: "Product", from: "#4680ff", to: "#1a1b1d", by: "Sara Al-Otaibi", ratio: "aspect-[4/3]" },
  { title: "Expo booth, day one", tag: "Events", from: "#1abc9c", to: "#0f766e", by: "Maya Tarek", ratio: "aspect-square" },
  { title: "Wordmark study", tag: "Brand", from: "#7c4dff", to: "#312e81", by: "Lina Haddad", ratio: "aspect-[4/3]" },
  { title: "Onboarding flow v3", tag: "Product", from: "#e58a00", to: "#7c2d12", by: "Omar Nasser", ratio: "aspect-[3/4]" },
  { title: "Team offsite", tag: "Culture", from: "#e91e63", to: "#831843", by: "Bilal Rahman", ratio: "aspect-square" },
  { title: "Dashboard hero shot", tag: "Product", from: "#3ebfea", to: "#0c4a6e", by: "Sara Al-Otaibi", ratio: "aspect-[4/3]" },
  { title: "Arabic RTL layout", tag: "Product", from: "#2ca87f", to: "#064e3b", by: "Maya Tarek", ratio: "aspect-[4/3]" },
  { title: "Icon set exploration", tag: "Brand", from: "#dc2626", to: "#7f1d1d", by: "Lina Haddad", ratio: "aspect-square" },
  { title: "Partner summit", tag: "Events", from: "#04a9f5", to: "#0c4a6e", by: "Yousef Khan", ratio: "aspect-[3/4]" },
];

const TAG_TONE = { Product: "primary", Events: "info", Brand: "warning", Culture: "danger" };

export default function GalleryPage() {
  return (
    <>
      <PageHeader
        title="Gallery"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Gallery" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="folder" className="h-3.5 w-3.5" /> New album</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="upload" className="h-3.5 w-3.5" /> Upload media</button>
          </>
        }
      />

      <Row className="mb-6">
        {ALBUMS.map((a) => (
          <Col key={a.name} span={3}>
            <Card className="overflow-hidden">
              <div
                className="relative flex aspect-[16/9] items-end p-4"
                style={{ backgroundImage: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
              >
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative">
                  <p className="text-sm font-semibold text-white">{a.name}</p>
                  <p className="text-xs text-white/75">{a.count} items</p>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <CardHead
          title="Media Library"
          sub="580 items · 8.1 GB"
          action={
            <div className="flex items-center gap-2">
              <select className="ad-select w-32" aria-label="Filter by tag" defaultValue="">
                <option value="">All tags</option>
                <option>Product</option>
                <option>Events</option>
                <option>Brand</option>
                <option>Culture</option>
              </select>
              <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Grid view"><Icon name="grid" className="h-4 w-4" /></button>
              <button type="button" className="ad-icon-btn h-9 w-9" aria-label="List view"><Icon name="list" className="h-4 w-4" /></button>
            </div>
          }
        />
        <CardBody>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {PHOTOS.map((p) => (
              <figure key={p.title} className="mb-4 break-inside-avoid">
                <div className="group relative overflow-hidden rounded-xl">
                  <div
                    className={`${p.ratio} w-full transition-transform duration-500 group-hover:scale-105`}
                    style={{ backgroundImage: `linear-gradient(140deg, ${p.from}, ${p.to})` }}
                  />
                  <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/20 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur" aria-label="Preview">
                        <Icon name="eye" className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur" aria-label="Download">
                        <Icon name="download" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.title}</p>
                      <p className="text-xs text-white/70">{p.by}</p>
                    </div>
                  </div>
                </div>
                <figcaption className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.title}</span>
                    <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-[var(--ad-muted-foreground)]">
                      <Avatar name={p.by} size={18} /> {p.by}
                    </span>
                  </span>
                  <Badge tone={TAG_TONE[p.tag]}>{p.tag}</Badge>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button type="button" className="ad-btn ad-btn-outline">Load more</button>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
