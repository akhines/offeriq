/**
 * Bright MLS RESO Web API Client
 *
 * Connects to Bright MLS (Mid-Atlantic MLS) via their RESO Web API (OData v4)
 * to pull property data, tax records, sold comps, and listing history.
 *
 * Required env vars:
 *   BRIGHT_MLS_CLIENT_ID
 *   BRIGHT_MLS_CLIENT_SECRET
 *   BRIGHT_MLS_TOKEN_URL     (defaults to production Okta endpoint)
 *   BRIGHT_MLS_BASE_URL      (defaults to production RESO endpoint)
 */

// ── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_TOKEN_URL = "https://brightmls.okta.com/oauth2/default/v1/token";
const DEFAULT_BASE_URL = "https://bright-reso.brightmls.com/RESO/OData/bright";

function getConfig() {
  return {
    clientId: process.env.BRIGHT_MLS_CLIENT_ID || "",
    clientSecret: process.env.BRIGHT_MLS_CLIENT_SECRET || "",
    tokenUrl: process.env.BRIGHT_MLS_TOKEN_URL || DEFAULT_TOKEN_URL,
    baseUrl: process.env.BRIGHT_MLS_BASE_URL || DEFAULT_BASE_URL,
  };
}

export function isBrightMLSConfigured(): boolean {
  const { clientId, clientSecret } = getConfig();
  return !!(clientId && clientSecret);
}

// ── OAuth Token Management ──────────────────────────────────────────────────

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret, tokenUrl } = getConfig();

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/x-www-form-urlencoded",
      "User-Agent": "Bright WebAPI/1.0",
    },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Bright MLS token error:", response.status, errorText);
    throw new Error(`Bright MLS auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.accessToken;
}

// ── OData Query Helper ──────────────────────────────────────────────────────

async function queryBright(resource: string, params: Record<string, string>): Promise<any> {
  const token = await getAccessToken();
  const { baseUrl } = getConfig();

  // OData keys ($filter, $select, $top, $orderby) must stay literal — don't encode them.
  // Values get encoded except for OData filter expressions which use spaces, quotes, etc.
  const queryParts = Object.entries(params).map(
    ([k, v]) => `${k}=${encodeURIComponent(v)}`
  );
  const url = `${baseUrl}/${resource}?${queryParts.join("&")}`;

  console.log(`[BrightMLS] Query URL: ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "Bright WebAPI/1.0",
    },
  });

  const responseText = await response.text();
  console.log(`[BrightMLS] Response status: ${response.status}, body length: ${responseText.length}, first 200: ${responseText.substring(0, 200)}`);

  if (!response.ok) {
    console.error(`Bright MLS query error [${resource}]:`, response.status, responseText);
    throw new Error(`Bright MLS query failed: ${response.status}`);
  }

  return JSON.parse(responseText);
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface BrightProperty {
  ListingId: string;
  StandardStatus: string;
  ListPrice: number;
  ClosePrice: number | null;
  CloseDate: string | null;
  ListingContractDate: string | null;
  BedroomsTotal: number;
  BathroomsTotalInteger: number;
  LivingArea: number;
  LotSizeSquareFeet: number | null;
  YearBuilt: number | null;
  PropertyType: string;
  PropertySubType: string | null;
  StreetNumber: string;
  StreetName: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  County: string;
  Latitude: number | null;
  Longitude: number | null;
  TaxAssessedValue: number | null;
  TaxAnnualAmount: number | null;
  TaxYear: number | null;
  DaysOnMarket: number | null;
  OriginalListPrice: number | null;
  PublicRemarks: string | null;
}

export interface BrightPropertyResult {
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSize: number | null;
  yearBuilt: number | null;
  propertyType: string;
  taxAssessedValue: number | null;
  taxAnnualAmount: number | null;
  taxYear: number | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface BrightComp {
  address: string;
  price: number;
  sqft: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number | null;
  soldDate: string;
  daysOnMarket: number | null;
  propertyType: string;
  latitude: number | null;
  longitude: number | null;
  distanceMiles: number;
  listPrice: number | null;
  listToSaleRatio: number | null;
}

// ── Property Lookup ─────────────────────────────────────────────────────────

/**
 * Look up a property by address components.
 * Tries street number + street name + postal code for best match.
 */
export async function lookupProperty(
  address: string
): Promise<BrightPropertyResult | null> {
  const parsed = parseAddress(address);
  if (!parsed) return null;

  const filterParts: string[] = [];

  if (parsed.streetNumber) {
    filterParts.push(`StreetNumber eq '${escapeOData(parsed.streetNumber)}'`);
  }
  if (parsed.streetName) {
    filterParts.push(`contains(StreetName, '${escapeOData(parsed.streetName)}')`);
  }
  if (parsed.postalCode) {
    filterParts.push(`PostalCode eq '${escapeOData(parsed.postalCode)}'`);
  }
  if (parsed.city) {
    filterParts.push(`City eq '${escapeOData(parsed.city)}'`);
  }

  if (filterParts.length < 2) return null;

  const selectFields = [
    "ListingId", "StandardStatus", "ListPrice", "ClosePrice", "CloseDate",
    "BedroomsTotal", "BathroomsTotalInteger", "LivingArea", "LotSizeSquareFeet",
    "YearBuilt", "PropertyType", "PropertySubType",
    "StreetNumber", "StreetName", "City", "StateOrProvince", "PostalCode", "County",
    "Latitude", "Longitude",
    "TaxAssessedValue", "TaxAnnualAmount", "TaxYear",
  ].join(",");

  try {
    const data = await queryBright("BrightProperties", {
      $filter: filterParts.join(" and "),
      $select: selectFields,
      $orderby: "CloseDate desc,ListingContractDate desc",
      $top: "5",
    });

    const records: BrightProperty[] = data.value || [];
    if (records.length === 0) return null;

    // Prefer closed listings for sale price, otherwise use most recent
    const closedRecord = records.find(r => r.StandardStatus === "Closed");
    const bestRecord = closedRecord || records[0];

    return {
      address: `${bestRecord.StreetNumber} ${bestRecord.StreetName}`.trim(),
      city: bestRecord.City,
      state: bestRecord.StateOrProvince,
      zip: bestRecord.PostalCode,
      county: bestRecord.County,
      beds: bestRecord.BedroomsTotal,
      baths: bestRecord.BathroomsTotalInteger,
      sqft: bestRecord.LivingArea,
      lotSize: bestRecord.LotSizeSquareFeet,
      yearBuilt: bestRecord.YearBuilt,
      propertyType: bestRecord.PropertyType || "Residential",
      taxAssessedValue: bestRecord.TaxAssessedValue,
      taxAnnualAmount: bestRecord.TaxAnnualAmount,
      taxYear: bestRecord.TaxYear,
      lastSalePrice: closedRecord?.ClosePrice || null,
      lastSaleDate: closedRecord?.CloseDate || null,
      latitude: bestRecord.Latitude,
      longitude: bestRecord.Longitude,
    };
  } catch (error) {
    console.error("Bright MLS property lookup failed:", error);
    return null;
  }
}

// ── Comparable Sales ────────────────────────────────────────────────────────

/**
 * Pull closed sales near a given property for comp analysis.
 *
 * Strategy: Pull a broad set from BrightMLS (ZIP-wide, 12 months, up to 200),
 * then apply tiered radius + time filters in code:
 *   Tier 1: 0.5 miles, 180 days
 *   Tier 2: 1 mile, 240 days
 *   Tier 3: ZIP-wide, 360 days
 *
 * Returns the tightest tier that has >= 3 comps (minComps).
 * If lat/long not provided, skips radius filtering and uses time tiers only.
 */
export async function fetchComps(options: {
  zip: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  latitude?: number;
  longitude?: number;
  maxResults?: number;
  monthsBack?: number;
  minComps?: number;
}): Promise<BrightComp[]> {
  const { zip, propertyType, maxResults = 15, monthsBack = 12, minComps = 3 } = options;

  // Pull broad: 12 months, ZIP-wide, up to 200 results
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const filterParts: string[] = [
    `StandardStatus eq 'Closed'`,
    `PostalCode eq '${escapeOData(zip)}'`,
    `CloseDate ge ${cutoffStr}`,
  ];

  if (propertyType) {
    const brightType = mapToBrightPropertyType(propertyType);
    if (brightType) {
      filterParts.push(`PropertyType eq '${escapeOData(brightType)}'`);
    }
  }

  const selectFields = "ListingId,StandardStatus,ListPrice,ClosePrice,ListingContractDate,CloseDate,DaysOnMarket,StreetNumber,StreetName,StreetSuffix,City,StateOrProvince,PostalCode,BedroomsTotal,BathroomsTotalInteger,LivingArea,LotSizeSquareFeet,YearBuilt,PropertyType,PropertySubType,Latitude,Longitude";

  try {
    const data = await queryBright("BrightProperties", {
      $filter: filterParts.join(" and "),
      $select: selectFields,
      $orderby: "CloseDate desc",
      $top: "200",
    });

    const records: any[] = data.value || [];

    // Map all results with distance calculation
    const allComps: BrightComp[] = records.map((r: any) => {
      const price = r.ClosePrice || 0;
      const compSqft = r.LivingArea || 0;
      const suffix = r.StreetSuffix ? ` ${r.StreetSuffix}` : '';
      const dist = (options.latitude && options.longitude && r.Latitude && r.Longitude)
        ? haversineDistance(options.latitude, options.longitude, r.Latitude, r.Longitude)
        : 0;

      return {
        address: `${r.StreetNumber} ${r.StreetName}${suffix}, ${r.City}, ${r.StateOrProvince} ${r.PostalCode}`.trim(),
        price,
        sqft: compSqft,
        pricePerSqft: compSqft > 0 ? Math.round(price / compSqft) : 0,
        bedrooms: r.BedroomsTotal || 0,
        bathrooms: r.BathroomsTotalInteger || 0,
        yearBuilt: r.YearBuilt || null,
        soldDate: r.CloseDate || "Unknown",
        daysOnMarket: r.DaysOnMarket,
        propertyType: r.PropertyType || "Residential",
        latitude: r.Latitude || null,
        longitude: r.Longitude || null,
        distanceMiles: Math.round(dist * 100) / 100,
        listPrice: r.ListPrice,
        listToSaleRatio: r.ListPrice && r.ClosePrice
          ? Math.round((r.ClosePrice / r.ListPrice) * 10000) / 10000
          : null,
      };
    });

    console.log(`[BrightMLS] Fetched ${allComps.length} total closed sales in ${zip}`);

    // Tiered radius + time filtering
    const hasCoords = !!(options.latitude && options.longitude);
    const now = Date.now();
    const DAY_MS = 86400000;

    const tiers = hasCoords
      ? [
          { label: "0.5mi / 180 days", radiusMiles: 0.5, days: 180 },
          { label: "1mi / 240 days",   radiusMiles: 1.0, days: 240 },
          { label: "ZIP-wide / 360 days", radiusMiles: Infinity, days: 360 },
        ]
      : [
          { label: "180 days", radiusMiles: Infinity, days: 180 },
          { label: "240 days", radiusMiles: Infinity, days: 240 },
          { label: "360 days", radiusMiles: Infinity, days: 360 },
        ];

    for (const tier of tiers) {
      const cutoff = now - tier.days * DAY_MS;
      const tierComps = allComps.filter(c => {
        if (c.price <= 0) return false;
        const soldTime = new Date(c.soldDate).getTime();
        if (soldTime < cutoff) return false;
        if (tier.radiusMiles < Infinity && c.distanceMiles > tier.radiusMiles) return false;
        return true;
      });

      console.log(`[BrightMLS] Tier "${tier.label}": ${tierComps.length} comps`);

      if (tierComps.length >= minComps) {
        // Sort by distance (closest first), then by date (newest first)
        tierComps.sort((a, b) => {
          if (a.distanceMiles !== b.distanceMiles) return a.distanceMiles - b.distanceMiles;
          return new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime();
        });
        return tierComps.slice(0, maxResults);
      }
    }

    // If no tier hit minComps, return everything we have
    console.log(`[BrightMLS] No tier met minComps=${minComps}, returning all ${allComps.length}`);
    return allComps.filter(c => c.price > 0).slice(0, maxResults);
  } catch (error) {
    console.error("Bright MLS comps fetch failed:", error);
    return [];
  }
}

// ── Listing History ─────────────────────────────────────────────────────────

/**
 * Pull recent sold listings for a specific address to get price history.
 */
export async function fetchListingHistory(
  address: string
): Promise<Array<{ price: number; date: string; status: string; daysOnMarket: number | null }>> {
  const parsed = parseAddress(address);
  if (!parsed) return [];

  const filterParts: string[] = [];
  if (parsed.streetNumber) {
    filterParts.push(`StreetNumber eq '${escapeOData(parsed.streetNumber)}'`);
  }
  if (parsed.streetName) {
    filterParts.push(`contains(StreetName, '${escapeOData(parsed.streetName)}')`);
  }
  if (parsed.postalCode) {
    filterParts.push(`PostalCode eq '${escapeOData(parsed.postalCode)}'`);
  }

  if (filterParts.length < 2) return [];

  try {
    const data = await queryBright("BrightProperties", {
      $filter: filterParts.join(" and "),
      $select: "ListPrice,ClosePrice,CloseDate,StandardStatus,DaysOnMarket,ListingContractDate",
      $orderby: "CloseDate desc,ListingContractDate desc",
      $top: "10",
    });

    return (data.value || []).map((r: any) => ({
      price: r.ClosePrice || r.ListPrice || 0,
      date: r.CloseDate || r.ListingContractDate || "Unknown",
      status: r.StandardStatus,
      daysOnMarket: r.DaysOnMarket,
    }));
  } catch (error) {
    console.error("Bright MLS history fetch failed:", error);
    return [];
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

function parseAddress(address: string): {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
} | null {
  if (!address || address.trim().length < 5) return null;

  // Try to parse "123 Main St, Baltimore, MD 21228"
  const parts = address.split(",").map(s => s.trim());

  // Street portion
  const streetPart = parts[0] || "";
  const streetMatch = streetPart.match(/^(\d+)\s+(.+)$/);
  const streetNumber = streetMatch?.[1];
  const streetName = streetMatch?.[2];

  // City
  const city = parts[1]?.trim();

  // State + ZIP
  const stateZipPart = parts[2]?.trim() || parts[1]?.trim() || "";
  const stateZipMatch = stateZipPart.match(/([A-Z]{2})\s+(\d{5})/);
  const state = stateZipMatch?.[1];
  const postalCode = stateZipMatch?.[2];

  // Also try to find ZIP anywhere in the string
  const zipFallback = address.match(/\b(\d{5})\b/)?.[1];

  return {
    streetNumber,
    streetName,
    city,
    state,
    postalCode: postalCode || zipFallback,
  };
}

function mapToBrightPropertyType(type: string): string | null {
  const lower = (type || "").toLowerCase().replace(/_/g, " ");
  if (lower.includes("single") || lower.includes("sfr")) return "Residential";
  if (lower.includes("multi")) return "Multi-Family";
  if (lower.includes("condo")) return "Residential";
  if (lower.includes("town")) return "Residential";
  if (lower.includes("land")) return "Land";
  if (lower.includes("commercial")) return "Commercial";
  return null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
