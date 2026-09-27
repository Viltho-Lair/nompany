"use client";
import { HeroSite } from "@/components/landing/hero/variants/HeroSite";
import { Bento } from "./Bento";
import { LiveCharts } from "./Charts";
import { LanguageCompare } from "./Compare";
import { Proof } from "./Proof";
import { RecordJourney, Statement } from "./Record";
import { Departments, ScreensCascade } from "./Showcase";

/**
 * THE HOME PAGE, in the order it tells the story: what it is, one record
 * carried through every department, what that changes, the screens, the two
 * languages, the product's own charts, every department, and where it stands.
 * Everything that reads the database arrives from the server as props.
 */
export function HomePage({ departments, stats, companies }) {
  return (
    <>
      <HeroSite />
      <Statement />
      <RecordJourney />
      <Bento />
      <ScreensCascade />
      <LanguageCompare />
      <LiveCharts />
      <Departments departments={departments} />
      <Proof stats={stats} companies={companies} />
    </>
  );
}
