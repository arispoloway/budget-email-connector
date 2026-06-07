import { expect, test } from "vitest";
import { Email } from "../../clients/types.js";
import {
  parseSkipped,
  parseSuccess,
  parseError,
  TransactionParseResult,
} from "../parser.js";
import { DBSTransactionParser } from "./dbs.js";
import { Decimal } from "decimal.js";

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

// Helper function to create NETS Scan & Pay transaction HTML
const createNETSScanPayHTML = (
  dateTime: string,
  amount: string,
  from: string,
  to: string,
  transactionId?: string,
) => `
<html>
<body>
<tr>
  <td style="background-color: #ffffff;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td class="col-mob" style="padding: 30px 30px 15px; font-size: 15px; line-height: 20px; font-family: Arial, sans-serif; color: #000000; text-align: left;"><p style="margin: 0 0 15px">
		${transactionId ? `Transaction Ref: ${transactionId}<br /><br /><br />` : ""}
		Dear Customer,<br /><br />
		Your NETS Scan & Pay transaction on 24 Feb 18:38 SGT was successful.<br />

		<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; ">
        <tbody>
		<tr>
          <td style="border-right:solid 2px #ffffff; border-bottom:solid 2px #ffffff;"><strong>Date & Time: </strong>${dateTime}</td>
        </tr>

		<tr>
          <td style="border-right:solid 2px #ffffff; border-bottom:solid 2px #ffffff; "><strong>Amount: </strong>${amount}</td>
        </tr>

		<tr>
          <td style="border-right:solid 2px #ffffff; border-bottom:solid 2px #ffffff; "><strong>From: </strong>${from}</td>
        </tr>
		<tr>
          <td style="border-right:solid 2px #ffffff; border-bottom:solid 2px #ffffff; "><strong>To: </strong>${to} </td>
        </tr>

		</tbody>
	</table>
<br />
 If unauthorised, call DBS hotline. To view transaction, please login to Digibank.
  <br /><br />
		Thank you for banking with us.<br /><br />
		Yours faithfully<br />
DBS Bank Ltd
 </p></td>
      </tr>
    </table></td>
</tr>
</body>
</html>`;

// Helper function to create PayLah refund transaction HTML
const createPayLahRefundHTML = (
  dateTime: string,
  amount: string,
  from: string,
  to: string,
  transactionId?: string,
) => `
<html>
<body>
<tr>
  <td style="background-color: #ffffff;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tbody>
        <tr>
          <td class="col-mob" style="padding: 30px 30px 15px; font-size: 15px; line-height: 20px; font-family: Arial, sans-serif; color: #000000; text-align: left;">
            ${transactionId ? `<p style="margin: 0 0 15px;">Transaction Ref: ${transactionId}</p>` : ""}
            <p style="margin: 0 0 15px;">Dear Sir/Madam, </p>
            <p style="margin: 0 0 15px;">We refer to your PayLah! refund transaction below and are pleased to confirm that the transaction was completed.</p>
            <p style="margin: 0 0 15px;">Date &amp; Time: ${dateTime}
<br>Amount: ${amount}
<br>From: ${from}
<br>To: ${to}</p>
            <p style="margin: 0 0 30px;">Thank you for banking with us.</p>
            <p style="margin: 0 0 30px;">Yours Faithfully,<br>DBS Bank Ltd </p>
          </td>
        </tr>
      </tbody>
    </table></td>
</tr>
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
  // PayLah refund tests
  {
    name: "paylah refund transaction parses properly",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alert",
      body: createPayLahRefundHTML(
        "14 Mar 15:45 (SGT)",
        "SGD 12.50",
        "SHOPEE SINGAPORE",
        "PayLah! Wallet (Mobile ending 8821)",
        "260314154502MC099123",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2026-03-14T15:45:00+08:00"),
        amount: new Decimal(12.5),
        payee: "SHOPEE SINGAPORE",
        notes:
          "PayLah Refund from SHOPEE SINGAPORE\nTransaction ID: 260314154502MC099123",
      },
    ]),
  },
  {
    name: "paylah refund with no-space date format",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alert",
      body: createPayLahRefundHTML(
        "07 Jun15:29 (SGT)",
        "SGD 0.70",
        "GRAB SINGAPORE",
        "PayLah! Wallet (Mobile ending 3312)",
        "260607152905MC036999",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2026-06-07T15:29:00+08:00"),
        amount: new Decimal(0.7),
        payee: "GRAB SINGAPORE",
        notes:
          "PayLah Refund from GRAB SINGAPORE\nTransaction ID: 260607152905MC036999",
      },
    ]),
  },
  {
    name: "paylah refund without transaction ID",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alert",
      body: createPayLahRefundHTML(
        "20 Jan 09:00 (SGT)",
        "SGD 5.00",
        "LAZADA SINGAPORE",
        "PayLah! Wallet (Mobile ending 4401)",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2026-01-20T09:00:00+08:00"),
        amount: new Decimal(5.0),
        payee: "LAZADA SINGAPORE",
        notes: "PayLah Refund from LAZADA SINGAPORE",
      },
    ]),
  },
  {
    name: "paylah refund with link",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alert",
      body: createPayLahRefundHTML(
        "01 Feb 11:30 (SGT)",
        "SGD 25.00",
        "REDMART LTD",
        "PayLah! Wallet (Mobile ending 7753)",
        "260201113011MC045678",
      ),
      link: "https://dbs.com/refund/abc",
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2026-02-01T11:30:00+08:00"),
        amount: new Decimal(25.0),
        payee: "REDMART LTD",
        notes:
          "PayLah Refund from REDMART LTD\nTransaction ID: 260201113011MC045678\nLink: https://dbs.com/refund/abc",
      },
    ]),
  },
  {
    name: "paylah refund email with wrong subject is skipped",
    email: {
      id: emailId,
      from: "paylah.alert@dbs.com",
      subject: "Transaction Alerts",
      body: createPayLahRefundHTML(
        "07 Jun 15:29 (SGT)",
        "SGD 3.00",
        "SOME MERCHANT",
        "PayLah! Wallet (Mobile ending 1234)",
      ),
    },
    // "Transaction Alerts" routes to parseSentTransaction, not refund — ensure no confusion
    expected: parseError("Could not identify 'to' field from email"),
  },
  // NETS Scan & Pay tests
  {
    name: "NETS scan & pay transaction parses properly",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alert - Successful NETS Scan & Pay",
      body: createNETSScanPayHTML(
        "24 Feb 2025 18:38 SGT",
        "S$8.00",
        "DBS/POSB Account ending 4343",
        "JOO CHIAT BEEF NOODLE",
        "4873947234987",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2025-02-24T18:38:00+08:00"),
        amount: new Decimal(-8.0),
        payee: "JOO CHIAT BEEF NOODLE",
        notes:
          "NETS Scan & Pay from DBS/POSB Account ending 4343\nTransaction ID: 4873947234987",
      },
    ]),
  },
  {
    name: "NETS scan & pay transaction without transaction ID",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alert - Successful NETS Scan & Pay",
      body: createNETSScanPayHTML(
        "15 Mar 2025 09:15 SGT",
        "S$25.50",
        "DBS/POSB Account ending 1234",
        "FAIRPRICE FINEST",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2025-03-15T09:15:00+08:00"),
        amount: new Decimal(-25.5),
        payee: "FAIRPRICE FINEST",
        notes: "NETS Scan & Pay from DBS/POSB Account ending 1234",
      },
    ]),
  },
  {
    name: "NETS scan & pay transaction with link",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alert - Successful NETS Scan & Pay",
      body: createNETSScanPayHTML(
        "10 Jan 2025 12:00 SGT",
        "S$42.80",
        "DBS/POSB Account ending 5678",
        "GRAB FOOD",
        "9876543210123",
      ),
      link: "https://dbs.com/nets/123",
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2025-01-10T12:00:00+08:00"),
        amount: new Decimal(-42.8),
        payee: "GRAB FOOD",
        notes:
          "NETS Scan & Pay from DBS/POSB Account ending 5678\nTransaction ID: 9876543210123\nLink: https://dbs.com/nets/123",
      },
    ]),
  },
  {
    name: "NETS scan & pay transaction with SGD amount format",
    email: {
      id: emailId,
      from: "noreply@dbs.com",
      subject: "digibank Alert - Successful NETS Scan & Pay",
      body: createNETSScanPayHTML(
        "20 Apr 2025 14:30 SGT",
        "SGD 15.00",
        "DBS/POSB Account ending 9999",
        "STARBUCKS",
      ),
    },
    expected: parseSuccess([
      {
        accountId: accountId,
        importId: emailId,
        date: new Date("2025-04-20T14:30:00+08:00"),
        amount: new Decimal(-15.0),
        payee: "STARBUCKS",
        notes: "NETS Scan & Pay from DBS/POSB Account ending 9999",
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
        "DBS/POSB card ending 1234",
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
          "Card Transaction from DBS/POSB card ending 1234\nTransaction ID: SP1400984550000000184126",
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

// Card number mapping tests
test("card transaction with matching card number mapping uses mapped account ID", () => {
  const defaultAccountId = "default-account";
  const cardAccountId = "card-account-1234";
  const cardNumberMapping = {
    "1234": cardAccountId,
  };
  const parser = new DBSTransactionParser(defaultAccountId, cardNumberMapping);

  const email: Email = {
    id: emailId,
    from: "ibanking.alert@dbs.com",
    subject: "Card Transaction Alert",
    body: createCardTransactionHTML(
      "SGD61.80",
      "23 DEC 2025 18:41 (SGT)",
      "DBS/POSB card ending 1234",
      "PAPERMARKET PTE LTD",
      "SP1400984550000000184126",
    ),
  };

  const result = parser.parseTransactionEmail(email);
  expect(result.result).toBe("SUCCESS");
  if (result.result === "SUCCESS") {
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].accountId).toBe(cardAccountId);
    expect(result.transactions[0].importId).toBe(emailId);
    expect(result.transactions[0].amount).toEqual(new Decimal(-61.8));
  }
});

test("card transaction with non-matching card number mapping falls back to default account ID", () => {
  const defaultAccountId = "default-account";
  const cardAccountId = "card-account-1234";
  const cardNumberMapping = {
    "1234": cardAccountId,
  };
  const parser = new DBSTransactionParser(defaultAccountId, cardNumberMapping);

  const email: Email = {
    id: emailId,
    from: "ibanking.alert@dbs.com",
    subject: "Card Transaction Alert",
    body: createCardTransactionHTML(
      "SGD100.00",
      "15 Nov 2024 10:30 (SGT)",
      "DBS/POSB card ending 9999",
      "SOME MERCHANT",
    ),
  };

  const result = parser.parseTransactionEmail(email);
  expect(result.result).toBe("SUCCESS");
  if (result.result === "SUCCESS") {
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].accountId).toBe(defaultAccountId);
    expect(result.transactions[0].importId).toBe(emailId);
    expect(result.transactions[0].amount).toEqual(new Decimal(-100.0));
  }
});
