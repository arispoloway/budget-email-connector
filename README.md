# Budget Email Connector

Many financial apps are able to pull transaction data from banks via services like Plaid/MX.
However some banks are not supported by these services (notably ones outside the US), and additionally some apps might not integrate with
services like Plaid/MX.

Fortunately, most banks can be configured to send you an email when you make a payment or receive money.

This project aims to allow the import of transaction data from arbitrary financial institutions into finance applications by integrating with your email provider and processing transaction information from the message content.

## Integrations

This project is very WIP, but my initial goal is to get the banks/services I personally use working. However the project is structured in a way that onboarding any new provider/format should be relatively simple.

### Email Provider

- **IMAP (Recommended)** - Works with any email provider that supports IMAP. Simple username/password authentication. Most providers support app-specific passwords for enhanced security.
- Gmail (Legacy) - Direct integration via OAuth2. Available but somewhat buggy with token refresh issues. Consider using IMAP with Gmail instead (enable IMAP in Gmail settings and use an [app password](https://support.google.com/accounts/answer/185833)).

### Email Transaction Format

- DBS/PayLah

### Financial Application

- **ActualBudget** - Full integration with ActualBudget for importing transactions
- **Logging** - Debug/testing destination that pretty-prints transactions to console instead of importing them

### Notifications

- Discord
