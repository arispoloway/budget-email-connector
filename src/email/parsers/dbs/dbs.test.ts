import { expect, test } from "vitest";
import { Email } from "../../clients/types";
import {
  parseSkipped,
  parseSuccess,
  parseError,
  TransactionParseResult,
} from "../parser";
import { DBSTransactionParser } from "./dbs";
import Decimal from "decimal.js";

type ParseTest = {
  name: string;
  email: Email;
  expected: TransactionParseResult;
};

const emailId = "emailid";
const accountId = "accountId";

// Helper function to create HTML table for sent transactions
const createSentTransactionHTML = (
  to: string,
  from: string,
  dateTime: string,
  amount: string,
) => `
<html>
<body>
<table>
<tr><td>To:</td><td>${to}</td></tr>
<tr><td>From:</td><td>${from}</td></tr>
<tr><td>Date & Time:</td><td>${dateTime}</td></tr>
<tr><td>Amount:</td><td>${amount}</td></tr>
</table>
</body>
</html>`;

// Helper function to create received transaction HTML
const createReceivedTransactionHTML = (
  amount: string,
  transferType: string,
  date: string,
  from: string,
  to: string,
  transactionId?: string,
) => `
<html>
<body>
<p>You received ${amount} via ${transferType} on ${date}.</p>
<strong>From:</strong> ${from}<br>
<strong>To:</strong> ${to}<br>
${transactionId ? `>Transaction Ref: ${transactionId}</` : ""}
</body>
</html>`;

// Helper function to create card transaction HTML
const createCardTransactionHTML = (
  amount: string,
  dateTime: string,
  from: string,
  to: string,
  transactionId?: string,
) => `
<html>
<body>
<td style="background-color: #ffffff;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tbody>
    <tr>
      <td class="col-mob" style="padding: 30px 30px 15px; font-size: 15px; line-height: 20px; font-family: Arial, sans-serif; color: #000000; text-align: left;">
        ${transactionId ? `<p style="margin: 0 0 15px;">Transaction Ref: ${transactionId} </p>` : ""}
        <p style="margin: 0 0 15px;">Dear Sir / Madam,</p>
        <p style="margin: 0 0 15px;">We refer to your card transaction request dated 23/12/25. We are pleased to confirm that the transaction was completed.</p>
        <p style="margin: 0 0 15px;">
Date &amp; Time: ${dateTime}  <br>
Amount: ${amount}  <br>
From: ${from} <br>
To: ${to}  </p>
        <p style="margin: 0 0 30px;">If unauthorised, please login to DBS digibank mobile to report fraud dispute immediately. Alternatively, call our DBS hotline.</p>
        <p style="margin: 0 0 30px;">Thank you for banking with us.</p>
        <p style="margin: 0 0 15px;">Yours faithfully, <br>DBS Bank Ltd</p>
      </td>
    </tr>
  </tbody>
</table></td>
</body>
</html>`;

const EXPECTATIONS: ParseTest[] = [
  {
    name: "irrelevant email is skipped",
    email: {
      id: emailId,
      from: "",
      subject: "a transaction happened",
      body: "<html/>",
    },
    expected: parseSkipped("Email did not appear to be a transaction email"),
  },
  {
    name: "paylah sent transaction parses properly",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: createSentTransactionHTML(
        "John Doe",
        "Jane Smith",
        "24 Sep 2025 10:10 SGT",
        "SGD 100.50",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2025-09-24T10:10:00+08:00"),
        amount: new Decimal(-100.5),
        payee: "John Doe",
        notes: "PayLah Sent from Jane Smith to John Doe",
      },
    ]),
  },
  {
    name: "ibanking sent transaction parses properly",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "iBanking Alerts",
      body: createSentTransactionHTML(
        "Alice Johnson",
        "Bob Wilson",
        "26 Sep 20:03 SGT",
        "USD 250.00",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2025-09-26T20:03:00+08:00"),
        amount: new Decimal(-250.0),
        payee: "Alice Johnson",
        notes: "PayNow/FAST Sent from Bob Wilson to Alice Johnson",
      },
    ]),
  },
  {
    name: "received transaction parses properly",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: createReceivedTransactionHTML(
        "SGD 500.75",
        "PayNow",
        "25 Sep 2024 15:30 SGT",
        "Charlie Brown",
        "Diana Prince",
        "TXN123456789",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-09-25T15:30:00+08:00"),
        amount: new Decimal(500.75),
        payee: "Charlie Brown",
        notes:
          "PayNow Received from Charlie Brown to Diana Prince\nTransaction ID: TXN123456789",
      },
    ]),
  },
  {
    name: "received transaction without transaction ID",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: createReceivedTransactionHTML(
        "SGD 100.00",
        "FAST",
        "27 Sep 2024 09:15 SGT",
        "Eve Adams",
        "Frank Miller",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-09-27T09:15:00+08:00"),
        amount: new Decimal(100.0),
        payee: "Eve Adams",
        notes: "FAST Received from Eve Adams to Frank Miller",
      },
    ]),
  },
  {
    name: "sent transaction with link",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: createSentTransactionHTML(
        "Grace Lee",
        "Henry Kim",
        "28 Sep 2024 14:20 SGT",
        "SGD 75.25",
      ),
      link: "https://dbs.com/transaction/123",
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-09-28T14:20:00+08:00"),
        amount: new Decimal(-75.25),
        payee: "Grace Lee",
        notes:
          "PayLah Sent from Henry Kim to Grace Lee\nLink: https://dbs.com/transaction/123",
      },
    ]),
  },
  {
    name: "received transaction with link",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: createReceivedTransactionHTML(
        "SGD 200.00",
        "PayLah",
        "29 Sep 2024 16:45 SGT",
        "Ivy Chen",
        "Jack Wang",
        "TXN987654321",
      ),
      link: "https://dbs.com/received/456",
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-09-29T16:45:00+08:00"),
        amount: new Decimal(200.0),
        payee: "Ivy Chen",
        notes:
          "PayLah Received from Ivy Chen to Jack Wang\nTransaction ID: TXN987654321\nLink: https://dbs.com/received/456",
      },
    ]),
  },
  {
    name: "sent transaction with different currency formats",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: createSentTransactionHTML(
        "Kelly Tan",
        "Liam O'Connor",
        "30 Sep 2024 11:30 SGT",
        "100.50 SGD",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-09-30T11:30:00+08:00"),
        amount: new Decimal(-100.5),
        payee: "Kelly Tan",
        notes: "PayLah Sent from Liam O'Connor to Kelly Tan",
      },
    ]),
  },
  {
    name: "sent transaction with UTC timezone",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "iBanking Alerts",
      body: createSentTransactionHTML(
        "Maya Patel",
        "Noah Singh",
        "01 Oct 2024 08:00 UTC",
        "SGD 150.00",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-10-01T08:00:00Z"),
        amount: new Decimal(-150.0),
        payee: "Maya Patel",
        notes: "PayNow/FAST Sent from Noah Singh to Maya Patel",
      },
    ]),
  },
  {
    name: "sent transaction missing 'to' field",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: `
<html>
<body>
<table>
<tr><td>From:</td><td>Jane Smith</td></tr>
<tr><td>Date & Time:</td><td>24 Sep 2024 10:10 SGT</td></tr>
<tr><td>Amount:</td><td>SGD 100.50</td></tr>
</table>
</body>
</html>`,
    },
    expected: parseError("Could not identify 'to' field from email"),
  },
  {
    name: "sent transaction missing 'from' field",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: `
<html>
<body>
<table>
<tr><td>To:</td><td>John Doe</td></tr>
<tr><td>Date & Time:</td><td>24 Sep 2024 10:10 SGT</td></tr>
<tr><td>Amount:</td><td>SGD 100.50</td></tr>
</table>
</body>
</html>`,
    },
    expected: parseError("Could not identify 'from' field from email"),
  },
  {
    name: "sent transaction missing 'date' field",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: `
<html>
<body>
<table>
<tr><td>To:</td><td>John Doe</td></tr>
<tr><td>From:</td><td>Jane Smith</td></tr>
<tr><td>Amount:</td><td>SGD 100.50</td></tr>
</table>
</body>
</html>`,
    },
    expected: parseError("Could not identify 'date' field from email"),
  },
  {
    name: "sent transaction missing 'amount' field",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: `
<html>
<body>
<table>
<tr><td>To:</td><td>John Doe</td></tr>
<tr><td>From:</td><td>Jane Smith</td></tr>
<tr><td>Date & Time:</td><td>24 Sep 2024 10:10 SGT</td></tr>
</table>
</body>
</html>`,
    },
    expected: parseError("Could not identify 'amount' field from email"),
  },
  {
    name: "sent transaction with invalid date format",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: createSentTransactionHTML(
        "John Doe",
        "Jane Smith",
        "invalid date",
        "SGD 100.50",
      ),
    },
    expected: parseError("Could not parse date from 'invalid date'"),
  },
  {
    name: "sent transaction with invalid amount format",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: createSentTransactionHTML(
        "John Doe",
        "Jane Smith",
        "24 Sep 2024 10:10 SGT",
        "invalid amount",
      ),
    },
    expected: parseError("Could not parse amount from 'invalid amount'"),
  },
  {
    name: "received transaction with invalid regex match",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: "<html><body><p>Invalid email format</p></body></html>",
    },
    expected: parseError("Could not extract basic information from email body"),
  },
  {
    name: "received transaction missing 'from' field",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: `
<html>
<body>
<p>You received SGD 100.00 via PayNow on 25 Sep 2024 15:30 SGT.</p>
<strong>To:</strong> Diana Prince<br>
</body>
</html>`,
    },
    expected: parseError("Could not identify 'from' field from email"),
  },
  {
    name: "received transaction missing 'to' field",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: `
<html>
<body>
<p>You received SGD 100.00 via PayNow on 25 Sep 2024 15:30 SGT.</p>
<strong>From:</strong> Charlie Brown<br>
</body>
</html>`,
    },
    expected: parseError("Could not identify 'to' field from email"),
  },
  {
    name: "received transaction with invalid date",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: createReceivedTransactionHTML(
        "SGD 100.00",
        "PayNow",
        "invalid date",
        "Charlie Brown",
        "Diana Prince",
      ),
    },
    expected: parseError("Could not parse date from 'invalid date'"),
  },
  {
    name: "received transaction with invalid amount",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: createReceivedTransactionHTML(
        "invalid amount",
        "PayNow",
        "25 Sep 2024 15:30 SGT",
        "Charlie Brown",
        "Diana Prince",
      ),
    },
    expected: parseError("Could not parse amount from 'invalid amount'"),
  },
  {
    name: "email with wrong subject for paylah",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Wrong Subject",
      body: createSentTransactionHTML(
        "John Doe",
        "Jane Smith",
        "24 Sep 2024 10:10 SGT",
        "SGD 100.50",
      ),
    },
    expected: parseSkipped("Email did not appear to be a transaction email"),
  },
  {
    name: "email with wrong from address for paylah",
    email: {
      id: emailId,
      from: "wrong@dbs.com",
      subject: "Transaction Alerts",
      body: createSentTransactionHTML(
        "John Doe",
        "Jane Smith",
        "24 Sep 2024 10:10 SGT",
        "SGD 100.50",
      ),
    },
    expected: parseSkipped("Email did not appear to be a transaction email"),
  },
  {
    name: "received transaction with different transfer types",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: createReceivedTransactionHTML(
        "SGD 300.00",
        "FAST Transfer",
        "25 Sep 2024 15:30 SGT",
        "Oliver Queen",
        "Penny Lane",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-09-25T15:30:00+08:00"),
        amount: new Decimal(300.0),
        payee: "Oliver Queen",
        notes: "FAST Transfer Received from Oliver Queen to Penny Lane",
      },
    ]),
  },
  {
    name: "sent transaction with large amount",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "iBanking Alerts",
      body: createSentTransactionHTML(
        "Quinn Rodriguez",
        "Rachel Green",
        "01 Oct 2024 12:00 SGT",
        "SGD 10000.99",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-10-01T12:00:00+08:00"),
        amount: new Decimal(-10000.99),
        payee: "Quinn Rodriguez",
        notes: "PayNow/FAST Sent from Rachel Green to Quinn Rodriguez",
      },
    ]),
  },
  {
    name: "received transaction with decimal amount",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alerts - You've received a transfer",
      body: createReceivedTransactionHTML(
        "SGD 0.01",
        "PayNow",
        "25 Sep 2024 15:30 SGT",
        "Sam Wilson",
        "Tony Stark",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-09-25T15:30:00+08:00"),
        amount: new Decimal(0.01),
        payee: "Sam Wilson",
        notes: "PayNow Received from Sam Wilson to Tony Stark",
      },
    ]),
  },
  {
    name: "card transaction parses properly",
    email: {
      id: emailId,
      from: "ibanking.alert@dbs.com",
      subject: "Card Transaction Alert",
      body: createCardTransactionHTML(
        "SGD61.80",
        "23 DEC 2025 18:41 (SGT)",
        "DBS/POSB card ending 1380",
        "PAPERMARKET PTE LTD",
        "SP1400984550000000184126",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2025-12-23T18:41:00+08:00"),
        amount: new Decimal(-61.8),
        payee: "PAPERMARKET PTE LTD",
        notes:
          "Card Transaction from DBS/POSB card ending 1380\nTransaction ID: SP1400984550000000184126",
      },
    ]),
  },
  {
    name: "card transaction without transaction ID",
    email: {
      id: emailId,
      from: "ibanking.alert@dbs.com",
      subject: "Card Transaction Alert",
      body: createCardTransactionHTML(
        "SGD 100.00",
        "15 Nov 2024 10:30 (SGT)",
        "DBS/POSB card ending 5678",
        "SOME MERCHANT",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-11-15T10:30:00+08:00"),
        amount: new Decimal(-100.0),
        payee: "SOME MERCHANT",
        notes: "Card Transaction from DBS/POSB card ending 5678",
      },
    ]),
  },
  {
    name: "card transaction with link",
    email: {
      id: emailId,
      from: "ibanking.alert@dbs.com",
      subject: "Card Transaction Alert",
      body: createCardTransactionHTML(
        "USD 25.99",
        "01 Oct 2024 14:00 (SGT)",
        "DBS/POSB card ending 9999",
        "ONLINE STORE",
        "TXN123ABC",
      ),
      link: "https://dbs.com/card/789",
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2024-10-01T14:00:00+08:00"),
        amount: new Decimal(-25.99),
        payee: "ONLINE STORE",
        notes:
          "Card Transaction from DBS/POSB card ending 9999\nTransaction ID: TXN123ABC\nLink: https://dbs.com/card/789",
      },
    ]),
  },
];

EXPECTATIONS.forEach((e) => {
  test(e.name, () => {
    const parser = new DBSTransactionParser(accountId);
    expect(parser.parseTransactionEmail(e.email)).toEqual(e.expected);
  });
});
