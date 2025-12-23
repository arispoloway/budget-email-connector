# Agent Instructions

> This file provides guidance for AI coding assistants and agentic tools working with this repository. For Cursor-specific rules, see `.cursor/rules`.

## Quick Context

**What is this?** A TypeScript service that parses transaction notification emails from banks and imports them into personal finance apps (ActualBudget).

**Stack:** TypeScript, Node.js 20+, Vitest, Prettier, SQLite (better-sqlite3)

**Key libraries:** `decimal.js` (money), `luxon` (dates), `cheerio` (HTML parsing), `googleapis` (Gmail API)

## Repository Structure

```
src/
├── index.ts          # Entry point
├── runner.ts         # Main orchestration loop
├── config.ts         # Config loading and dependency wiring
├── email/
│   ├── store.ts      # SQLite store for processed emails
│   ├── clients/      # Email provider integrations (Gmail)
│   └── parsers/      # Email → Transaction parsers (DBS)
├── destinations/     # Finance app integrations (ActualBudget)
└── notifiers/        # Notification integrations (Discord)
```

Each integration directory follows the same structure: an interface file, a `config.ts` factory, and provider subdirectories.

## Core Interfaces

```typescript
// Email to parse
interface Email {
  id: string; from: string; subject: string;
  body: string; date?: Date; link?: string;
}

// Parsed transaction
interface Transaction {
  accountId: string; importId: string; date: Date;
  amount: Decimal; payee: string; notes?: string;
}

// Parser result (SUCCESS | ERROR | SKIPPED)
type TransactionParseResult = {
  transactions: Transaction[];
  result: ParseResult;
  error?: string;
};
```

## Coding Standards

### Do
- Use `Decimal.js` for all money amounts
- Use `luxon` for parsing date strings
- Return `TransactionParseResult` from parsers (don't throw)
- Use the helper functions: `parseSuccess()`, `parseError()`, `parseSkipped()`
- Create colocated tests: `foo.ts` → `foo.test.ts`
- Follow existing factory pattern for new integrations

### Don't
- Don't use floating point for money
- Don't throw from parsers - return error results
- Don't use default exports
- Don't add new dependencies without consideration

## Development Workflow

```bash
# Install
npm install

# Dev mode (auto-reload)
npm run dev

# Test (watch mode)
npm test

# Before committing
npm run format && npm run lint && npm run test-ci && npm run build
```

## Testing Approach

Tests are data-driven. Define test cases as arrays:

```typescript
const EXPECTATIONS: ParseTest[] = [
  { name: "valid email parses", email: {...}, expected: parseSuccess([...]) },
  { name: "missing field errors", email: {...}, expected: parseError("...") },
  { name: "unrelated email skipped", email: {...}, expected: parseSkipped("...") },
];

EXPECTATIONS.forEach((e) => {
  test(e.name, () => {
    expect(parser.parseTransactionEmail(e.email)).toEqual(e.expected);
  });
});
```

## Adding a New Bank Parser

1. **Create the parser directory and files:**
   ```
   src/email/parsers/{bank}/
   ├── {bank}.ts       # Parser implementation
   ├── {bank}.test.ts  # Tests
   └── utils.ts        # Optional helpers
   ```

2. **Implement the parser class:**
   ```typescript
   export class MyBankParser implements TransactionParser {
     constructor(private accountId: string) {}
     
     parseTransactionEmail(email: Email): TransactionParseResult {
       // Detect if this is the right email type
       if (email.subject !== "Expected Subject") {
         return parseSkipped("Not a transaction email");
       }
       
       // Parse HTML body with cheerio or regex
       // Extract: date, amount, payee
       // Return parseSuccess([...]) or parseError("...")
     }
   }
   ```

3. **Register in config.ts:**
   ```typescript
   // Add config type
   export interface MyBankParserConfig {
     type: "mybank";
     accountId: string;
   }
   
   // Add to union
   export type ParserConfig = DBSParserConfig | MyBankParserConfig | ...;
   
   // Add factory case
   case "mybank":
     return new MyBankParser(config.accountId);
   ```

4. **Write comprehensive tests** covering success, error, and skip cases.

## Common Tasks

| Task | Files to Modify |
|------|-----------------|
| Add bank parser | `src/email/parsers/{bank}/`, `src/email/parsers/config.ts` |
| Add email provider | `src/email/clients/{provider}/`, `src/email/clients/config.ts` |
| Add finance app | `src/destinations/{app}.ts`, `src/destinations/config.ts` |
| Add notifier | `src/notifiers/{service}.ts`, `src/notifiers/config.ts` |
| Change poll interval | `src/index.ts` (hardcoded, marked TODO) |
| Add config option | `src/config.ts`, `config.example.json` |

## Known TODOs in Codebase

- Config location should be specifiable via CLI
- Better config validation and error messages
- Poll interval should be configurable
- Gmail pagination for >50 messages
- Received PayLah transaction parsing

