import { google } from "googleapis";
import { EmailStore } from "../../store";
import { Email } from "../types";

function extractEmail(fromHeader: string): string {
  const regex = /<([^>]+)>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = fromHeader.match(regex);
  return match ? (match[1] || match[2]) : "";
}

export async function listUnprocessedMessages(auth: any, store: EmailStore, label: string): Promise<Email[]> {
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.list({
    userId: "me",
    q: `label:${label}`,
    maxResults: 10, // TODO: ideally this would be able to iterate through if there are more than this many transactions
  });

  if (!res.data.messages || res.data.messages.length === 0) {
    return [];
  }

  const messages: Email[] = [];

  for (const msg of res.data.messages) {
    if (await store.seenEmail(msg.id!)) {
      console.log(`Skipped previously seen email with id ${msg.id}`);
      continue
    }
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const payload = full.data.payload;
    const headers = payload?.headers ?? [];
    const subject =
      headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "(no subject)";
    let from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
    if (from) {
      from = extractEmail(from)
    }


    let body = "";
    if (payload?.parts) {
      const textPart = payload.parts.find(
        (p) => (p.mimeType === "text/plain" || p.mimeType === "text/html") && p.body?.data
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64").toString("utf8");
      }
    }

    let date: Date | undefined;
    if (full.data.internalDate) {
      date = new Date(Number(full.data.internalDate));
    }

    let link: string | undefined;
    if (full.data.threadId) {
      link = `https://mail.google.com/mail/u/0/#inbox/${full.data.threadId}`;
    }

    // TODO: somehow get a link from this?
    messages.push({ id: msg.id!, from, subject, body, date, link });
  }

  return messages;
}
