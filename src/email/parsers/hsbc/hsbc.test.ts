import { Decimal } from "decimal.js";
import { expect, test } from "vitest";
import { Email } from "../../clients/types.js";
import {
  parseError,
  parseSkipped,
  parseSuccess,
  TransactionParseResult,
} from "../parser.js";
import { HSBCTransactionParser } from "./hsbc.js";

type ParseTest = {
  name: string;
  email: Email;
  expected: TransactionParseResult;
  cardNumberMapping?: Record<string, string>;
};

const emailId = "emailid";
const accountId = "accountId";
const hsbcFrom = "HSBC.Bank.Singapore.Limited@notification.hsbc.com.hk";
const hsbcSubject = "Transaction Alerts  (Credit Card)";

const createHsbcCreditCardHTML = (fields: {
  cardNumber?: string;
  transactionDate?: string;
  transactionTime?: string;
  transactionAmount?: string;
  description?: string;
}) => `
<html>
<head></head>
<body>
  <center>
    <table style="width:640px;font-family:arial,helvetica,sans-serif; font-size:14px;" border="0">
      <tbody>
        <tr>
          <td><img id="colorDiv" src="https://www.iccmap.hsbc.com.hk/teamsite_content/iccm/common/hsbc-eng.jpg"></td>
        </tr>
        <tr>
          <td>
            <p>Dear Customer <br><br>
              Please note there was a transaction made on your HSBC credit card. <br><br></p>
          </td>
        </tr>
        <tr>
          <td>
            <table width="100%" cellspacing="0" border="1">
              <tbody>
                ${
                  fields.cardNumber !== undefined
                    ? `<tr>
                  <td width="50%"><p>Card Number</p></td>
                  <td width="50%"><p>${fields.cardNumber}</p></td>
                </tr>`
                    : ""
                }
                ${
                  fields.transactionDate !== undefined
                    ? `<tr>
                  <td width="50%"><p>Transaction Date</p></td>
                  <td width="50%"><p>${fields.transactionDate}</p></td>
                </tr>`
                    : ""
                }
                ${
                  fields.transactionTime !== undefined
                    ? `<tr>
                  <td width="50%"><p>Transaction Time</p></td>
                  <td width="50%"><p>${fields.transactionTime}</p></td>
                </tr>`
                    : ""
                }
                ${
                  fields.transactionAmount !== undefined
                    ? `<tr>
                  <td width="50%"><p>Transaction Amount</p></td>
                  <td width="50%"><p>${fields.transactionAmount}</p></td>
                </tr>`
                    : ""
                }
                ${
                  fields.description !== undefined
                    ? `<tr>
                  <td width="50%"><p>Description</p></td>
                  <td width="50%"><p>${fields.description}</p></td>
                </tr>`
                    : ""
                }
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </center>
</body>
</html>`;

const EXPECTATIONS: ParseTest[] = [
  {
    name: "valid HSBC credit card transaction parses",
    email: {
      id: emailId,
      from: hsbcFrom,
      subject: hsbcSubject,
      body: createHsbcCreditCardHTML({
        cardNumber: "XXXX-XXXX-XXXX-1234",
        transactionDate: "15/JUL/2026",
        transactionTime: "22:58:09",
        transactionAmount: "USD112.51",
        description: "YUNNANSOURC",
      }),
    },
    expected: parseSuccess([
      {
        accountId,
        importId: emailId,
        date: new Date("2026-07-15T22:58:09+08:00"),
        amount: new Decimal("-112.51"),
        payee: "YUNNANSOURC",
        notes: "HSBC credit card ending 1234\nCurrency: USD",
      },
    ]),
  },
  {
    name: "maps card number last digits to alternate account",
    email: {
      id: emailId,
      from: hsbcFrom,
      subject: hsbcSubject,
      body: createHsbcCreditCardHTML({
        cardNumber: "XXXX-XXXX-XXXX-1234",
        transactionDate: "15/JUL/2026",
        transactionTime: "22:58:09",
        transactionAmount: "USD112.51",
        description: "YUNNANSOURC",
      }),
    },
    cardNumberMapping: { "1234": "hsbc-card-account" },
    expected: parseSuccess([
      {
        accountId: "hsbc-card-account",
        importId: emailId,
        date: new Date("2026-07-15T22:58:09+08:00"),
        amount: new Decimal("-112.51"),
        payee: "YUNNANSOURC",
        notes: "HSBC credit card ending 1234\nCurrency: USD",
      },
    ]),
  },
  {
    name: "missing Transaction Amount errors",
    email: {
      id: emailId,
      from: hsbcFrom,
      subject: hsbcSubject,
      body: createHsbcCreditCardHTML({
        cardNumber: "XXXX-XXXX-XXXX-1234",
        transactionDate: "15/JUL/2026",
        transactionTime: "22:58:09",
        description: "YUNNANSOURC",
      }),
    },
    expected: parseError(
      "Could not identify 'Transaction Amount' field from email",
    ),
  },
  {
    name: "unrelated email skipped",
    email: {
      id: emailId,
      from: "noreply@example.com",
      subject: "Hello",
      body: "<html><body><p>Not a bank email</p></body></html>",
    },
    expected: parseSkipped("Email did not appear to be a transaction email"),
  },
];

EXPECTATIONS.forEach((e) => {
  test(e.name, () => {
    const parser = new HSBCTransactionParser(accountId, e.cardNumberMapping);
    expect(parser.parseTransactionEmail(e.email)).toEqual(e.expected);
  });
});
