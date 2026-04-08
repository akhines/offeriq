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

  // Build URL manually — URLSearchParams double-encodes OData $filter syntax
  const queryParts = Object.entries(params).map(
    ([k, v]) => `${k}=${encodeURIComponent(v)}`
  );
  const url = `${baseUrl}/${resource}?${queryParts.join("&")}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Bright MLS query error [${resource}]:`, response.status, errorText);
    throw new Error(`Bright MLS query failed: ${response.status}`);
  }

  return response.json();
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
 * Searches by ZIP code + property type within the last 12 months.
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
}): Promise<BrightComp[]> {
  const { zip, propertyType, beds, sqft, maxResults = 15, monthsBack = 12 } = options;

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const filterParts: string[] = [
    `StandardStatus eq 'Closed'`,
    `PostalCode eq '${escapeOData(zip)}'`,
    `CloseDate ge ${cutoffStr}`,
  ];

  // Match property type if available
  if (propertyType) {
    const brightType = mapToBrightPropertyType(propertyType);
    if (brightType) {
      filterParts.push(`PropertyType eq '${escapeOData(brightType)}'`);
    }
  }

  // Use the same select fields as BCDI (proven working with BrightMLS production)
  const selectFields = "ListingId,StandardStatus,ListPrice,ClosePrice,ListingContractDate,CloseDate,DaysOnMarket,StreetNumber,StreetName,StreetSuffix,City,StateOrProvince,PostalCode";

  try {
    const data = await queryBright("BrightProperties", {
      $filter: filterParts.join(" and "),
      $select: selectFields,
      $orderby: "CloseDate desc",
      $top: String(maxResults),
    });

    const records: BrightProperty[] = data.value || [];

    return records.map((r: any) => {
      const price = r.ClosePrice || 0;
      const suffix = r.StreetSuffix ? ` ${r.StreetSuffix}` : '';

      return {
        address: `${r.StreetNumber} ${r.StreetName}${suffix}, ${r.City}, ${r.StateOrProvince} ${r.PostalCode}`.trim(),
        price,
        sqft: 0,
        pricePerSqft: 0,
        bedrooms: 0,
        bathrooms: 0,
        yearBuilt: null,
        soldDate: r.CloseDate || "Unknown",
        daysOnMarket: r.DaysOnMarket,
        propertyType: "Residential",
        latitude: null,
        longitude: null,
        distanceMiles: 0,
        listPrice: r.ListPrice,
        listToSaleRatio: r.ListPrice && r.ClosePrice
          ? Math.round((r.ClosePrice / r.ListPrice) * 10000) / 10000
          : null,
      };
    });
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
