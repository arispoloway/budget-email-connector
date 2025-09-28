import { Email } from "../clients/types";
import { parseError, TransactionParser, TransactionParseResult } from "./parser";

export class RoutingTransactionParser {
    private mapping: { [key: string]: TransactionParser };

    constructor(mapping: { [key: string]: TransactionParser }) {
        this.mapping = mapping;
    }

    parseTransactionEmail(email: Email): TransactionParseResult {
        const parser = this.mapping[email.from];
        if (parser) {
            return parser.parseTransactionEmail(email)
        } else {
            return parseError(`Could not route message for parsing: unknown email ${email.from}`)        
        }
    }
}
  