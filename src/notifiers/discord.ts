import Decimal from "decimal.js";
import { Email } from "../email/clients/types";
import { Transaction } from "../email/parsers/parser";
import { Notifier } from "./notifier";

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  flags?: number;
}

export class DiscordNotifier implements Notifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  private async send(payload: DiscordWebhookPayload): Promise<void> {
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to send Discord message: ${res.status} ${res.statusText}`,
      );
    }
  }

  private formatEmailLink(email: Email): string {
    if (email.link) {
      return `[View Email](${email.link})`;
    }
    return `From: ${email.from}\nSubject: ${email.subject}`;
  }

  private formatAmount(amount: Decimal): string {
    const isNegative = amount.isNegative();
    const absAmount = amount.abs().toFixed(2);
    return isNegative ? `-$${absAmount}` : `+$${absAmount}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleString("en-SG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Singapore",
    });
  }

  private escapeMarkdown(text: string): string {
    // Wrap in backticks to prevent markdown interpretation
    return `\`${text}\``;
  }

  async notifyTransactionsImported(
    email: Email,
    transactions: Transaction[],
  ): Promise<void> {
    const embeds: DiscordEmbed[] = transactions.map((transaction) => {
      const isPayment = transaction.amount.isNegative();
      const color = isPayment ? 0xed4245 : 0x57f287; // Red for payments, green for received

      const fields: Array<{ name: string; value: string; inline?: boolean }> = [
        {
          name: "Amount",
          value: this.formatAmount(transaction.amount),
          inline: true,
        },
        {
          name: "Date",
          value: this.formatDate(transaction.date),
          inline: true,
        },
        {
          name: "Payee",
          value: this.escapeMarkdown(transaction.payee),
          inline: false,
        },
      ];

      if (transaction.notes) {
        fields.push({
          name: "Notes",
          value: this.escapeMarkdown(transaction.notes),
          inline: false,
        });
      }

      return {
        title: isPayment ? "💸 Payment Sent" : "💰 Money Received",
        color,
        fields,
        footer: {
          text: this.formatEmailLink(email),
        },
        timestamp: new Date().toISOString(),
      };
    });

    await this.send({ embeds });
  }

  async notifyEmailSkipped(email: Email, reason: string): Promise<void> {
    const embed: DiscordEmbed = {
      title: "⏭️ Email Skipped",
      description: reason,
      color: 0x5865f2, // Blurple
      fields: [
        {
          name: "Email Details",
          value: this.formatEmailLink(email),
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.send({ embeds: [embed] });
  }

  async notifyError(message: string): Promise<void> {
    const embed: DiscordEmbed = {
      title: "❌ Error",
      description: message,
      color: 0xed4245, // Red
      timestamp: new Date().toISOString(),
    };

    await this.send({ embeds: [embed] });
  }
}
