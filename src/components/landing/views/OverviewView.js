"use client";
import { Hero } from "../hero/Hero";
import { CtaBand, GradientRule } from "../sections/CtaBand";
import { Features } from "../sections/Features";
import { HowItWorks } from "../sections/HowItWorks";
import { SmartInsights } from "../sections/SmartInsights";
import { StatsBand } from "../sections/StatsBand";
export function OverviewView({ dataReady, onNavigate, }) {
    return (<>
      <Hero dataReady={dataReady}/>
      <StatsBand />
      <GradientRule />
      <HowItWorks />
      <GradientRule />
      <Features />
      <SmartInsights />
      <CtaBand onNavigate={onNavigate}/>
    </>);
}
