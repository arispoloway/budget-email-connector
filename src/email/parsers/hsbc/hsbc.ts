import { DateTime } from "luxon";
import { Email } from "../../clients/types.js";
import {
  parseError,
  parseSkipped,
  parseSuccess,
  TransactionParseResult,
} from "../parser.js";
import { parseCurrencyAmount, TableParser } from "../dbs/utils.js";

const HSBC_ZONE = "Asia/Singapore";

/**
 * Parse HSBC date/time fields, e.g. "15/JUL/2026" + "22:58:09".
 */
export function parseHsbcDateTime(
  dateStr: string,
  timeStr?: string,
): Date | null {
  const date = dateStr.trim();
  const time = timeStr?.trim();

  if (time) {
    const dt = DateTime.fromFormat(`${date} ${time}`, "dd/MMM/yyyy HH:mm:ss", {
      zone: HSBC_ZONE,
      locale: "en",
    });
    if (dt.isValid) return dt.toJSDate();
  }

  const dateOnly = DateTime.fromFormat(date, "dd/MMM/yyyy", {
    zone: HSBC_ZONE,
    locale: "en",
  });
  return dateOnly.isValid ? dateOnly.toJSDate() : null;
}

function lastFourDigits(cardNumber: string): string | undefined {
  const match = cardNumber.match(/(\d{4})\s*$/);
  return match?.[1];
}

export class HSBCTransactionParser {
  private accountId: string;
  private cardNumberMapping?: Record<string, string>;

  constructor(accountId: string, cardNumberMapping?: Record<string, string>) {
    if (!accountId) {
      throw new Error("Invalid account id provided");
    }
    this.accountId = accountId;
    this.cardNumberMapping = cardNumberMapping;
  }

  parseTransactionEmail(email: Email): TransactionParseResult {
    if (
      email.subject !== "Transaction Alerts  (Credit Card)" ||
      email.from !== "HSBC.Bank.Singapore.Limited@notification.hsbc.com.hk"
    ) {
      return parseSkipped("Email did not appear to be a transaction email");
    }

    const table = new TableParser(email.body);

    const cardNumber = table.findValue("Card Number");
    if (!cardNumber)
      return parseError("Could not identify 'Card Number' field from email");

    const transactionDate = table.findValue("Transaction Date");
    if (!transactionDate)
      return parseError(
        "Could not identify 'Transaction Date' field from email",
      );

    const transactionTime = table.findValue("Transaction Time");
    const date = parseHsbcDateTime(transactionDate, transactionTime);
    if (!date) {
      const combined = transactionTime
        ? `${transactionDate} ${transactionTime}`
        : transactionDate;
      return parseError(`Could not parse date from '${combined}'`);
    }

    const amountText = table.findValue("Transaction Amount");
    if (!amountText)
      return parseError(
        "Could not identify 'Transaction Amount' field from email",
      );
    const parsedAmount = parseCurrencyAmount(amountText);
    if (!parsedAmount)
      return parseError(`Could not parse amount from '${amountText}'`);

    const description = table.findValue("Description");
    if (!description)
      return parseError("Could not identify 'Description' field from email");

    let accountId = this.accountId;
    const lastFour = lastFourDigits(cardNumber);
    if (this.cardNumberMapping && lastFour) {
      const mapped = this.cardNumberMapping[lastFour];
      if (mapped) accountId = mapped;
    }

    const noteItems: string[] = [
      `HSBC credit card ending ${lastFour ?? cardNumber}`,
    ];
    if (parsedAmount.currency) {
      noteItems.push(`Currency: ${parsedAmount.currency}`);
    }
    if (email.link) noteItems.push(`Link: ${email.link}`);

    return parseSuccess([
      {
        accountId,
        importId: email.id,
        date,
        amount: parsedAmount.amount.mul(-1),
        payee: description,
        notes: noteItems.join("\n"),
      },
    ]);
  }
}
