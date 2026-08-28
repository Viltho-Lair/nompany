"use client";

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { FileText, Hash, PanelBottom, PanelTop, Settings2, Squircle } from "lucide-react";

import { BandDialog } from "@/components/quality/documents/band-dialog";
import { MarginsDialog } from "@/components/quality/documents/margins-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  defaultBandSetup,
  MARGIN_PRESET_LABELS,
  MARGIN_PRESET_ORDER,
  PAGE_NUMBER_POSITIONS,
  PAGE_PRESETS,
  PAGE_PRESET_ORDER,
  resolveMargins,
  type DocumentLanguage,
  type BandSetup,
  type MarginPresetId,
  type PageNumberPosition,
  type PagePresetId,
  type PageSetup,
} from "@/lib/docs/page-presets";

/** Paper size, margins, header/footer and page numbering for one document. */
export function PageSetupMenu({
  setup,
  documentTitle,
  onChange,
}: {
  setup: PageSetup;
  documentTitle: string;
  onChange: (change: Partial<PageSetup>) => void;
}) {
  const tr = qualityDict(useStudioLocale());
  const paper = PAGE_PRESETS[setup.presetId];
  const margins = resolveMargins(setup);

  const [marginsOpen, setMarginsOpen] = useState(false);
  const [bandDialog, setBandDialog] = useState<"header" | "footer" | null>(null);

  /**
   * Turning a band on opens the dialog rather than applying immediately, so
   * the reserved height and its defaults are confirmed first. Turning it off
   * is instant and keeps the text, so switching it back on restores it.
   */
  function toggleBand(band: "header" | "footer", enabled: boolean) {
    if (enabled) {
      setBandDialog(band);
      return;
    }
    onChange({ [band]: { ...setup[band], enabled: false } } as Partial<PageSetup>);
  }

  function applyBand(band: "header" | "footer", value: BandSetup) {
    onChange({ [band]: value } as Partial<PageSetup>);
  }

  const bandDraft: BandSetup | null =
    bandDialog === null
      ? null
      : setup[bandDialog].enabled || setup[bandDialog].text !== ""
        ? setup[bandDialog]
        : defaultBandSetup(bandDialog, paper, documentTitle);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText />
            {paper.label}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          {/* LANGUAGE FIRST, because it decides which way everything else on
              this menu is measured from. A document laid out left-to-right when
              it is read right-to-left has its margins on the wrong sides and
              its header aligned to the wrong end. */}
          <DropdownMenuLabel>{tr.language}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={setup.language}
            onValueChange={(value) =>
              onChange({ language: value as DocumentLanguage })
            }
          >
            <DropdownMenuRadioItem value="en">
              <span className="flex w-full items-baseline justify-between gap-3">
                English
                <span className="text-xs text-muted-foreground">{tr.leftRight}</span>
              </span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="ar">
              <span className="flex w-full items-baseline justify-between gap-3">
                العربية
                <span className="text-xs text-muted-foreground">{tr.rightLeft}</span>
              </span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>{tr.pageSize}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={setup.presetId}
            onValueChange={(value) =>
              onChange({ presetId: value as PagePresetId })
            }
          >
            {PAGE_PRESET_ORDER.map((id) => (
              <DropdownMenuRadioItem key={id} value={id}>
                <span className="flex w-full items-baseline justify-between gap-3">
                  {PAGE_PRESETS[id].label}
                  <span className="text-xs text-muted-foreground">
                    {PAGE_PRESETS[id].dimensions}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Squircle className="text-muted-foreground" />
              Margins
              <span className="ml-auto text-xs text-muted-foreground">
                {MARGIN_PRESET_LABELS[setup.marginPreset].replace("…", "")}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuRadioGroup
                value={setup.marginPreset}
                onValueChange={(value) => {
                  const next = value as MarginPresetId;
                  if (next === "custom") {
                    setMarginsOpen(true);
                    return;
                  }
                  onChange({ marginPreset: next });
                }}
              >
                {MARGIN_PRESET_ORDER.map((id) => (
                  <DropdownMenuRadioItem key={id} value={id}>
                    {MARGIN_PRESET_LABELS[id]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Header &amp; footer</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={setup.header.enabled}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => toggleBand("header", checked)}
          >
            <PanelTop className="text-muted-foreground" />
            Header
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={setup.footer.enabled}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => toggleBand("footer", checked)}
          >
            <PanelBottom className="text-muted-foreground" />
            Footer
          </DropdownMenuCheckboxItem>

          {(setup.header.enabled || setup.footer.enabled) && (
            <>
              {setup.header.enabled && (
                <DropdownMenuItem onSelect={() => setBandDialog("header")}>
                  <Settings2 className="text-muted-foreground" />
                  Header settings…
                </DropdownMenuItem>
              )}
              {setup.footer.enabled && (
                <DropdownMenuItem onSelect={() => setBandDialog("footer")}>
                  <Settings2 className="text-muted-foreground" />
                  Footer settings…
                </DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Hash className="text-muted-foreground" />
              Page numbers
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuRadioGroup
                value={setup.pageNumber}
                onValueChange={(value) =>
                  onChange({ pageNumber: value as PageNumberPosition })
                }
              >
                {PAGE_NUMBER_POSITIONS.map((position) => {
                  // A number can only sit in a band that exists.
                  const disabled =
                    position.band !== null && !setup[position.band].enabled;
                  return (
                    <DropdownMenuRadioItem
                      key={position.id}
                      value={position.id}
                      disabled={disabled}
                    >
                      {position.label}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {marginsOpen && (
        <MarginsDialog
          initial={margins}
          paper={paper}
          onOpenChange={setMarginsOpen}
          onApply={(customMargins) =>
            onChange({ marginPreset: "custom", customMargins })
          }
        />
      )}

      {bandDialog !== null && bandDraft !== null && (
        <BandDialog
          band={bandDialog}
          initial={bandDraft}
          onOpenChange={(open) => {
            if (!open) setBandDialog(null);
          }}
          onApply={(value) => applyBand(bandDialog, value)}
        />
      )}
    </>
  );
}
