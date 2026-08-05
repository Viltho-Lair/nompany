import StudioShell from "@/components/studio/StudioShell";

export const dynamic = "force-dynamic";

export default function PanelLayout({ children }) {
  return <StudioShell>{children}</StudioShell>;
}
