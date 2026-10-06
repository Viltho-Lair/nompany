import { PageHeader } from "../../_components/ui";
import BlogEditor from "@/components/super/BlogEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog" };

// nompany's own blog: news, what was added to the product, and events attended
// (the owner, 27/09/2026). Posts are written here and read by the public site
// at /<locale>/blog — one language per post. The (console) layout has already
// verified the session before this renders.
export default function BlogPage() {
  return (
    <>
      <PageHeader title="Blog" description="Posts on nompany.com/blog. A post is in one language and shows on the site within a minute of publishing." />
      <BlogEditor />
    </>
  );
}
