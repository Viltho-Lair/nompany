// THE INDUSTRY CATALOGUE AS THE PRODUCT READS IT: the built-in list
// (shared/industryCatalogue) with the console's rows laid over it. One small
// document, read whole. The console's WRITES are lib/data/industryAdmin — kept
// apart so this read side imports nothing from the modules that call it
// (studio creation, the department register), which would be a cycle. And no
// Next import either: studio creation reaches this file, and the model tests
// load that without Next. The website's cached read is lib/industryPages.
//
// NOTHING IS EVER DELETED FROM A STUDIO'S POINT OF VIEW. The console can switch
// an industry or a specialism off (not offered to new studios, not on the
// website) and never remove one, so a studio's stored key keeps resolving.

import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { mergeIndustries, type Industry } from "@/shared/industryCatalogue";
import { pickCatalogue, specialismOf } from "@/shared/industryPick";
import { departmentsForField, type DepartmentSeed } from "@/shared/departments/starters";

/** Every industry, switched off ones included. What the product decides by. */
export async function readIndustries(): Promise<Industry[]> {
  return mergeIndustries(await readArr(REG.industryCatalogue));
}

/** What a picker needs, resolved on the server and handed to the browser. */
export async function industryPicker() {
  return pickCatalogue(await readIndustries());
}

/**
 * THE ORG CHART A STUDIO IS SEEDED WITH: its industry's profile when it has
 * chosen a specialism (that is what the profile is for), otherwise the chart
 * its field of work always had — which is what every studio still on the old
 * list, and one that chose "Something else", keeps getting.
 */
export async function startersForStudio(studio: object): Promise<DepartmentSeed[]> {
  const { industry, fieldOfWork } = studio as { industry?: unknown; fieldOfWork?: unknown };
  const key = String(industry || "");
  if (key) {
    const hit = specialismOf(await readIndustries(), key) as { industry: Industry } | null;
    if (hit) return hit.industry.profile.departments.map((d) => ({ ...d, sectionKeys: [...d.sectionKeys] }));
  }
  return departmentsForField(String(fieldOfWork || ""));
}
