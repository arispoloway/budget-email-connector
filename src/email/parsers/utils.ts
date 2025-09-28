import * as cheerio from "cheerio";
import { DateTime } from "luxon";

export class TableParser {
  private fields: Record<string, string> = {};

  constructor(html: string) {
    const $ = cheerio.load(html);

    $("tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length >= 2) {
        const key = $(tds[0]).text().trim();
        const value = $(tds[1]).text().trim();
        this.fields[key] = value;
      }
    });
  }

  findValue(field: string): string | undefined {
    return this.fields[field];
  }

  allValues(): any {
    return this.fields;
  }
}

export function parseCurrencyAmount(
  input: string,
): { currency: string; amount: number } | null {
  // match currency (letters) and amount (number with optional decimals)
  const regex = /([A-Za-z]+)?\s*([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)?/;
  const match = input.trim().match(regex);

  if (!match) return null;

  // match groups: [full, preCurrency, amount, postCurrency]
  const preCurrency = match[1];
  const amountStr = match[2];
  const postCurrency = match[3];

  const amount = parseFloat(amountStr);
  const currency = (preCurrency || postCurrency || "").toUpperCase();

  if (!currency || isNaN(amount)) return null;

  return { currency, amount };
}

const ZONE_MAP: Record<string, string> = {
  UTC: "UTC",
  GMT: "UTC",
  SGT: "Asia/Singapore", // Singapore Time
  // add more if needed
};

/**
 * Parse datetime strings of the form:
 * - "24 Sep 2025 10:10  SGT"
 * - "26 Sep 20:03 (UTC)"
 * - "26 Sep 20:03 (SGT)"
 *
 * Whitespace is arbitrary. If year is missing, it resolves to the most
 * recent occurrence before now.
 */
export function parseDate(input: string, now: Date = new Date()): Date | null {
  // Normalize spaces and strip parentheses
  let normalized = input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\(([^)]+)\)/, "$1"); // (UTC) -> UTC

  // Extract zone
  const parts = normalized.split(" ");
  const zoneAbbr = parts[parts.length - 1];
  const zone = ZONE_MAP[zoneAbbr];
  if (!zone) {
    throw new Error(`Unknown timezone: ${zoneAbbr}`);
  }

  const datePart = parts.slice(0, -1).join(" ");
  const nowDt = DateTime.fromJSDate(now);

  // Try with year
  let dt = tryParse(datePart, ["d LLL yyyy HH:mm"], zone);
  if (dt?.isValid) return dt.toJSDate();

  // Try without year
  dt = tryParse(datePart, ["d LLL HH:mm"], zone);
  if (dt?.isValid) {
    let candidate = dt.set({ year: nowDt.year });

    // If candidate is in the future, roll back one year
    if (candidate > nowDt) {
      candidate = candidate.minus({ years: 1 });
    }
    return candidate.toJSDate();
  }
  return null;
}

function tryParse(
  text: string,
  formats: string[],
  zone: string,
): DateTime | null {
  for (const fmt of formats) {
    const dt = DateTime.fromFormat(text, fmt, { zone });
    if (dt.isValid) return dt;
  }
  return null;
}

export function extractStrongField(
  html: string,
  field: "From" | "To",
): string | null {
  const regex = new RegExp(
    `<strong>\\s*${field}:\\s*</strong>\\s*([^<]+)`,
    "i",
  );
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}
