import { Email } from "../../clients/types";
import {
  parseError,
  ParseResult,
  parseSkipped,
  parseSuccess,
  TransactionParseResult,
} from "../parser";
import {
  extractStrongField,
  parseCurrencyAmount,
  parseDate,
  parseTransactionId,
  TableParser,
} from "./utils";

export class DBSTransactionParser {
  private accountId: string;

  constructor(accountId: string) {
    if (!accountId) {
      throw new Error("Invalid account id provided");
    }
    this.accountId = accountId;
  }

  private parseSentTransaction(
    email: Email,
    type: string,
  ): TransactionParseResult {
    const tableParser = new TableParser(email.body);
    const to = tableParser.findValue("To:");
    if (!to) return parseError("Could not identify 'to' field from email");

    const from = tableParser.findValue("From:");
    if (!from) return parseError("Could not identify 'from' field from email");

    const dateTime = tableParser.findValue("Date & Time:");
    if (!dateTime)
      return parseError("Could not identify 'date' field from email");
    const date = parseDate(dateTime);
    if (!date) return parseError(`Could not parse date from '${dateTime}'`);

    const amountText = tableParser.findValue("Amount:");
    if (!amountText)
      return parseError("Could not identify 'amount' field from email");
    const amount = parseCurrencyAmount(amountText!)?.amount;
    if (!amount)
      return parseError(`Could not parse amount from '${amountText}'`);

    let noteItems: string[] = [`${type} Sent from ${from} to ${to}`];

    const originalTransactionId = parseTransactionId(email.body);
    if (originalTransactionId)
      noteItems.push(`Transaction ID: ${originalTransactionId}`);
    if (email.link) noteItems.push(`Link: ${email.link}`);

    const notes = noteItems ? noteItems.join("\n") : undefined;

    return parseSuccess([
      {
        accountId: this.accountId,
        importId: email.id,
        date: date,
        amount: amount.mul(-1),
        payee: to,
        notes: notes,
      },
    ]);
  }

  private parseReceivedTransaction(email: Email): TransactionParseResult {
    const regex = /received\s+(.*)\s+via\s+(.+?)\s+on\s+(.*)\./i;

    const match = email.body.match(regex);
    if (!match)
      return parseError("Could not extract basic information from email body");

    const [, amountStr, transferType, dateStr] = match;

    const date = parseDate(dateStr);
    if (!date) return parseError(`Could not parse date from '${dateStr}'`);

    const amount = parseCurrencyAmount(amountStr!)?.amount;
    if (!amount)
      return parseError(`Could not parse amount from '${amountStr}'`);

    const from = extractStrongField(email.body, "From");
    if (!from) return parseError("Could not identify 'from' field from email");

    const to = extractStrongField(email.body, "To");
    if (!to) return parseError("Could not identify 'to' field from email");

    let noteItems: string[] = [
      `${transferType} Received from ${from} to ${to}`,
    ];

    const originalTransactionId = parseTransactionId(email.body);
    if (originalTransactionId)
      noteItems.push(`Transaction ID: ${originalTransactionId}`);
    if (email.link) noteItems.push(`Link: ${email.link}`);

    const notes = noteItems ? noteItems.join("\n") : undefined;

    return parseSuccess([
      {
        accountId: this.accountId,
        importId: email.id,
        date: date,
        amount: amount,
        payee: from,
        notes: notes,
      },
    ]);
  }

  parseTransactionEmail(email: Email): TransactionParseResult {
    if (
      email.subject === "Transaction Alerts" &&
      email.from === "paylah.alert@dbs.com"
    ) {
      return this.parseSentTransaction(email, "PayLah");
      // TODO: received paylah transaction
    } else if (email.subject === "iBanking Alerts") {
      return this.parseSentTransaction(email, "PayNow/FAST");
    } else if (
      email.subject === "Transaction Alerts" &&
      email.from === "ibanking.alert@dbs.com"
    ) {
      return this.parseSentTransaction(email, "PayNow/FAST");
    } else if (
      email.subject === "digibank Alerts - You've received a transfer"
    ) {
      return this.parseReceivedTransaction(email);
    } else {
      return parseSkipped("Email did not appear to be a transaction email");
    }
  }
}
