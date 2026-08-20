import { TableCell, TableHeader } from "@tiptap/extension-table";

/**
 * Per-cell formatting.
 *
 * Each property is its own node attribute rather than one opaque style string,
 * so `setCellAttribute` can change one of them without clobbering the rest.
 * Tiptap's `mergeAttributes` parses and merges the `style` fragments each
 * attribute renders, so they compose into a single declaration.
 *
 * Column widths are not here: `Table({ resizable: true })` maintains a
 * `colwidth` attribute itself, and it rides along in the stored document JSON.
 */

export const CELL_SIDES = ["Top", "Right", "Bottom", "Left"] as const;
export type CellSide = (typeof CELL_SIDES)[number];

export type CellBorder = {
  widthPx: number;
  style: "solid" | "dashed" | "dotted" | "double" | "none";
  color: string;
};

export function borderToCss(border: CellBorder): string {
  return border.style === "none"
    ? "none"
    : `${border.widthPx}px ${border.style} ${border.color}`;
}

function styleAttributes() {
  const borders = Object.fromEntries(
    CELL_SIDES.map((side) => {
      const attribute = `border${side}`;
      const property = `border-${side.toLowerCase()}`;
      return [
        attribute,
        {
          default: null as string | null,
          parseHTML: (element: HTMLElement) =>
            element.style.getPropertyValue(property) || null,
          renderHTML: (attributes: Record<string, unknown>) => {
            const value = attributes[attribute];
            return typeof value === "string" && value !== ""
              ? { style: `${property}: ${value}` }
              : {};
          },
        },
      ];
    }),
  );

  return {
    ...borders,

    background: {
      default: null as string | null,
      parseHTML: (element: HTMLElement) =>
        element.style.backgroundColor || null,
      renderHTML: (attributes: Record<string, unknown>) =>
        typeof attributes.background === "string" && attributes.background !== ""
          ? { style: `background-color: ${attributes.background}` }
          : {},
    },

    verticalAlign: {
      default: null as string | null,
      parseHTML: (element: HTMLElement) => element.style.verticalAlign || null,
      renderHTML: (attributes: Record<string, unknown>) =>
        typeof attributes.verticalAlign === "string" &&
        attributes.verticalAlign !== ""
          ? { style: `vertical-align: ${attributes.verticalAlign}` }
          : {},
    },

    paddingPx: {
      default: null as number | null,
      parseHTML: (element: HTMLElement) => {
        const parsed = Number.parseFloat(element.style.padding);
        return Number.isFinite(parsed) ? parsed : null;
      },
      renderHTML: (attributes: Record<string, unknown>) =>
        typeof attributes.paddingPx === "number"
          ? { style: `padding: ${attributes.paddingPx}px` }
          : {},
    },
  };
}

export const StyledTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...styleAttributes() };
  },
});

export const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...styleAttributes() };
  },
});
