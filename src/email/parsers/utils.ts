import * as cheerio from "cheerio";

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

export function parseCurrencyAmount(input: string): { currency: string; amount: number } | null {
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
