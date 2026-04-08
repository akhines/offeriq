/**
 * Automated Deal Prep Cron
 *
 * Runs 2x daily (12pm and 7pm ET). Checks GHL for contacts in
 * "Appointment Scheduled" stage, pulls BrightMLS comps, saves deal,
 * creates share link, and posts back to GHL contact notes.
 *
 * Fully autonomous — no terminal or Claude session required.
 */

import * as cron from "node-cron";
import * as brightMLS from "./lib/bright-mls";
import { db } from "./db";
import { savedDeals, sharedOffers } from "@shared/schema";
import { randomUUID } from "crypto";

const GHL_API_TOKEN = process.env.GHL_API_TOKEN;
const GHL_BASE = "https://rest.gohighlevel.com/v1";
const OFFERIQ_SHARE_BASE = process.env.OFFERIQ_SHARE_BASE || "https://offeriq-alpha.vercel.app";
const AGENT_USER_ID = "agent-service-account";

// Pipeline + stage IDs for "Appointment Scheduled"
const TRIGGER_STAGES = [
  { pipeline: "nwSjS0rUTMGbgDvyrEe4", stage: "47ca5b20-f37a-4689-bcce-db719ab2fbe3", name: "Mike the Closer" },
  { pipeline: "ggnBpwig6OE37fXPQv7a", stage: "86baa3c7-ab3f-4d8b-b2b3-24955df8e97f", name: "Josh the Closer" },
];

async function ghlFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${GHL_API_TOKEN}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL API ${res.status}: ${text}`);
  }
  return res.json();
}

function generateShortCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 7; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

async function getOpportunitiesInStage(pipelineId: string, stageId: string) {
  try {
    const data = await ghlFetch(`${GHL_BASE}/pipelines/${pipelineId}/opportunities?stageId=${stageId}&limit=50`);
    return data.opportunities || [];
  } catch (err) {
    console.error(`[DealPrep] Failed to fetch opportunities for pipeline ${pipelineId}:`, err);
    return [];
  }
}

async function getContact(contactId: string) {
  try {
    const data = await ghlFetch(`${GHL_BASE}/contacts/${contactId}`);
    return data.contact || data;
  } catch (err) {
    console.error(`[DealPrep] Failed to fetch contact ${contactId}:`, err);
    return null;
  }
}

async function getContactNotes(contactId: string) {
  try {
    const data = await ghlFetch(`${GHL_BASE}/contacts/${contactId}/notes`);
    return data.notes || [];
  } catch (err) {
    console.error(`[DealPrep] Failed to fetch notes for ${contactId}:`, err);
    return [];
  }
}

async function createContactNote(contactId: string, body: string) {
  try {
    await ghlFetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  } catch (err) {
    console.error(`[DealPrep] Failed to create note for ${contactId}:`, err);
  }
}

function extractAddress(contact: any): string | null {
  // Try address1 first, then full address fields
  const addr = contact.address1 || contact.address || "";
  const city = contact.city || "";
  const state = contact.state || "";
  const zip = contact.postalCode || contact.zip || "";

  if (!addr) return null;

  const parts = [addr, city, state, zip].filter(Boolean);
  return parts.join(", ");
}

function calculateDeal(comps: any[], subjectSqft: number) {
  // Filter valid comps
  const validComps = comps.filter(c => c.price > 10000 && c.sqft > 0);
  if (validComps.length === 0) return null;

  // Get $/sqft values and calculate median
  const psfValues = validComps.map(c => c.pricePerSqft).sort((a, b) => a - b);
  const medianPsf = psfValues[Math.floor(psfValues.length / 2)];

  const arv = Math.round(medianPsf * subjectSqft);
  const repairEstimate = 35000; // moderate default
  const wholesalePrice = Math.round((arv * 0.95) - (arv * 0.10) - repairEstimate);
  const sellerOffer = wholesalePrice - 15000;
  const margin = arv - sellerOffer;
  const marginPct = Math.round((margin / arv) * 1000) / 10;

  let dealGrade: "A" | "B" | "C" | "D" = "D";
  if (marginPct >= 40) dealGrade = "A";
  else if (marginPct >= 30) dealGrade = "B";
  else if (marginPct >= 20) dealGrade = "C";

  return {
    arv,
    repairEstimate,
    wholesalePrice,
    sellerOffer,
    margin,
    marginPct,
    dealGrade,
    medianPsf,
    offerLadder: [
      { name: "Fast Yes", price: Math.round(sellerOffer * 1.08), useWhen: "Accept quickly — strongest offer with fastest closing" },
      { name: "Fair", price: sellerOffer, useWhen: "Standard offer — fair market value for an as-is sale" },
      { name: "Stretch", price: Math.round(sellerOffer * 0.92), useWhen: "Starting point — room to negotiate up if needed" },
    ],
  };
}

async function prepDeal(contact: any, pipelineName: string) {
  const address = extractAddress(contact);
  if (!address) {
    console.log(`[DealPrep] Skipping ${contact.firstName} ${contact.lastName} — no address`);
    return null;
  }

  const contactName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
  console.log(`[DealPrep] Prepping deal for ${contactName} at ${address} (${pipelineName})`);

  // Parse ZIP from address
  const zipMatch = address.match(/\b(\d{5})\b/);
  if (!zipMatch) {
    console.log(`[DealPrep] No ZIP found in address: ${address}`);
    return null;
  }

  // Pull comps from BrightMLS
  const comps = await brightMLS.fetchComps({
    zip: zipMatch[1],
    structureType: "Detached",
  });

  if (comps.length === 0) {
    console.log(`[DealPrep] No comps found for ${address}`);
    return null;
  }

  // Estimate sqft from comps median if we don't know subject sqft
  const subjectSqft = 1200; // default estimate — will be refined with property lookup
  const deal = calculateDeal(comps, subjectSqft);
  if (!deal) return null;

  // Save deal to database
  const dealId = randomUUID();
  try {
    await db.insert(savedDeals).values({
      id: dealId,
      userId: AGENT_USER_ID,
      propertyAddress: address,
      dealName: `${address} - Auto Prep`,
      dealStatus: "active",
      arv: deal.arv,
      sellerOffer: deal.sellerOffer,
      repairEstimate: deal.repairEstimate,
      confidenceScore: 60,
      dealGrade: deal.dealGrade,
      compsData: { comps, avgPricePerSqft: deal.medianPsf, medianPrice: comps[Math.floor(comps.length / 2)]?.price || 0, suggestedARV: deal.arv },
    });
  } catch (err) {
    console.error(`[DealPrep] Failed to save deal:`, err);
    return null;
  }

  // Create share link
  const code = generateShortCode();
  try {
    await db.insert(sharedOffers).values({
      id: randomUUID(),
      userId: AGENT_USER_ID,
      code,
      propertyAddress: address,
      sections: ["property_details", "avm_valuation", "comparable_sales", "offer_ladder", "deal_grade"],
      dealSnapshot: {
        property: { address, propertyType: "single_family", conditionScore: 5 },
        avmBaselines: {},
        underwritingOutput: {
          asIsBase: Math.round(deal.arv * 0.85),
          asIsLow: Math.round(deal.arv * 0.80),
          asIsHigh: Math.round(deal.arv * 0.90),
          repairLow: 28000, repairBase: 32000, repairHigh: 35000,
          arv: deal.arv, confidenceScore: 60,
          drivers: ["Auto-prepped by agent"], missingData: ["Subject sqft needs verification"],
          avmBlendUsed: [], marketabilityDiscount: 5,
        },
        offerOutput: {
          investorBuyPrice: deal.wholesalePrice, sellerOffer: deal.sellerOffer,
          offerLadder: deal.offerLadder,
          dealGrade: deal.dealGrade, margin: deal.margin, marginPct: deal.marginPct,
          sensitivity: [],
        },
        offerSettings: {
          strategy: "wholesale", targetRulePct: 70, closingCosts: 20000,
          assignmentFee: 15000, desiredProfit: 40000, riskBuffer: 0,
          holdingBuffer: 0, holdingBufferType: "dollar", marketCoolingFactorPct: 0,
        },
        compsData: { comps: comps.slice(0, 10), avgPricePerSqft: deal.medianPsf, medianPrice: comps[Math.floor(comps.length / 2)]?.price || 0, suggestedARV: deal.arv },
        companyName: "Impact Home Team",
      },
      isActive: true,
    });
  } catch (err) {
    console.error(`[DealPrep] Failed to create share:`, err);
    return null;
  }

  const shareUrl = `${OFFERIQ_SHARE_BASE}/s/${code}`;

  // Post note to GHL contact
  await createContactNote(
    contact.id,
    `OfferIQ Deal Prep (Auto)\n${shareUrl}\nARV: $${deal.arv.toLocaleString()} | Offer: $${deal.sellerOffer.toLocaleString()} | Grade: ${deal.dealGrade}\nComps: ${comps.length} found | Median $/sqft: $${deal.medianPsf}\nEdit deal: ${OFFERIQ_SHARE_BASE}/deals (login required)`
  );

  console.log(`[DealPrep] ✓ ${contactName} — ${shareUrl} — Grade ${deal.dealGrade} — ARV $${deal.arv.toLocaleString()}`);
  return { contactName, address, shareUrl, dealGrade: deal.dealGrade, arv: deal.arv };
}

async function runDealPrepCycle() {
  if (!GHL_API_TOKEN) {
    console.log("[DealPrep] Skipping — GHL_API_TOKEN not set");
    return;
  }

  if (!brightMLS.isBrightMLSConfigured()) {
    console.log("[DealPrep] Skipping — BrightMLS not configured");
    return;
  }

  console.log(`[DealPrep] Starting deal prep cycle at ${new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" })} ET`);

  let totalPrepped = 0;
  let totalSkipped = 0;

  for (const trigger of TRIGGER_STAGES) {
    const opps = await getOpportunitiesInStage(trigger.pipeline, trigger.stage);
    console.log(`[DealPrep] ${trigger.name}: ${opps.length} opportunities in "Appointment Scheduled"`);

    for (const opp of opps) {
      const contactId = opp.contactId || opp.contact?.id;
      if (!contactId) continue;

      // Check if already prepped
      const notes = await getContactNotes(contactId);
      const alreadyPrepped = notes.some((n: any) => (n.body || "").includes("OfferIQ Deal Prep"));
      if (alreadyPrepped) {
        totalSkipped++;
        continue;
      }

      const contact = await getContact(contactId);
      if (!contact) continue;

      const result = await prepDeal(contact, trigger.name);
      if (result) totalPrepped++;
    }
  }

  console.log(`[DealPrep] Cycle complete — ${totalPrepped} prepped, ${totalSkipped} already done`);
}

export function startDealPrepCron() {
  if (!GHL_API_TOKEN) {
    console.log("[DealPrep] GHL_API_TOKEN not set — cron disabled");
    return;
  }

  // 12:03 PM ET and 7:03 PM ET daily
  // ET = UTC-4 (EDT) or UTC-5 (EST). Using America/New_York timezone.
  cron.schedule("3 12 * * *", () => runDealPrepCycle(), { timezone: "America/New_York" });
  cron.schedule("3 19 * * *", () => runDealPrepCycle(), { timezone: "America/New_York" });

  console.log("[DealPrep] Cron scheduled: 12:03 PM ET and 7:03 PM ET daily");
}

// Export for manual trigger via API
export { runDealPrepCycle };
