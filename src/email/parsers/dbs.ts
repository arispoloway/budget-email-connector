import { table } from "console";
import { Email } from "../clients/types";
import { parseError, ParseResult, parseSuccess, TransactionParseResult } from "./parser";
import { parseCurrencyAmount, TableParser } from "./utils";

import { DateTime } from "luxon";

// Mapping of common abbreviations to IANA time zones
const TZ_MAP: Record<string, string> = {
  SGT: "Asia/Singapore",
  JST: "Asia/Tokyo",
  PST: "America/Los_Angeles",
  EST: "America/New_York",
  UTC: "UTC",
  // add more as needed
};

function parseDate(input: string): Date | null {
  // Extract day, month, time, and optional TZ
  const match = input.match(/(\d{1,2}) (\w{3}) (\d{2}:\d{2})(?: \((\w+)\))?/);
  if (!match) return null;

  const [, dayStr, monthStr, timeStr, tzAbbr] = match;
  const day = parseInt(dayStr, 10);
  const month = monthStr;
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const now = DateTime.local();
  const year = now.year;

  const zone = tzAbbr && TZ_MAP[tzAbbr.toUpperCase()] ? TZ_MAP[tzAbbr.toUpperCase()] : "UTC";

  const dt = DateTime.fromObject(
    { year, month: DateTime.fromFormat(month, "LLL").month, day, hour, minute },
    { zone }
  );

  // If the resulting datetime is in the future, assume it was last year
  if (dt > now) {
    return dt.minus({ years: 1 }).toJSDate();
  }

  return dt.toJSDate();
}

function parseTransactionId(html: string): string | undefined {
    const regex = />\s*Transaction Ref:\s*(.*?)\s*<\//i;
    const match = html.match(regex);

    if (match) {
        const transactionRef = match[1];
        return transactionRef
    }
}

export class PaylahTransactionParser {
    private accountId: string;

    constructor(accountId: string) {
        if (!accountId) {
            throw new Error("Invalid account id provided")
        }
        this.accountId = accountId;
    }

    parseTransactionEmail(email: Email): TransactionParseResult {
        const tableParser = new TableParser(email.body);
        const to = tableParser.findValue("To:")
        if (!to) return parseError("Could not identify 'to' field from email");

        const from = tableParser.findValue("From:")
        if (!from) return parseError("Could not identify 'from' field from email");

        const dateTime = tableParser.findValue("Date & Time:")
        if (!dateTime) return parseError("Could not identify 'date' field from email");
        const date = parseDate(dateTime);
        if (!date) return parseError(`Could not parse date from '${dateTime}'`);
        
        const amountText = tableParser.findValue("Amount:");
        if (!amountText) return parseError("Could not identify 'amount' field from email");
        const amount = parseCurrencyAmount(amountText!)?.amount;
        if (!amount) return parseError(`Could not parse amount from '${amountText}'`);

        let noteItems: string[] = [];

        const originalTransactionId = parseTransactionId(email.body);
        if (originalTransactionId) noteItems.push(`Transaction ID: ${originalTransactionId}`);
        if (email.link) noteItems.push(`Link: ${email.link}`);

        const notes = noteItems ? noteItems.join("\n") : undefined;

        return parseSuccess([{
            accountId: this.accountId,
            importId: email.id,
            date: date,
            description: `Paylah Transaction from ${from} to ${to}`,
            amount: -amount, // TODO: Figure out inflow or outflow from the email
            payee: to,
            notes: notes,
        }])
    }
}