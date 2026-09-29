"use client";
import { HeroSite } from "@/components/landing/hero/variants/HeroSite";
import { Bento } from "./Bento";
import { LiveCharts } from "./Charts";
import { LanguageCompare } from "./Compare";
import { LatestPosts } from "./LatestPosts";
import { Proof } from "./Proof";
import { RecordJourney, Statement } from "./Record";
import { Departments, ScreensCascade } from "./Showcase";

/**
 * THE HOME PAGE, in the order it tells the story: what it is, one record
 * carried through every department, what that changes, the screens, the two
 * languages, the product's own charts, every department, the newest posts
 * (when there are any), and where it stands.
 * Everything that reads the database arrives from the server as props.
 */
export function HomePage({ departments, stats, companies, posts, blogTr }) {
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
      <LatestPosts posts={posts} tr={blogTr} />
      <Proof stats={stats} companies={companies} />
    </>
  );
}
