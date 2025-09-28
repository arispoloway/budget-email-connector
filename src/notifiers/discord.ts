export class DiscordNotifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  private async send(message: string): Promise<void> {
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message, flags: 4 }),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to send Discord message: ${res.status} ${res.statusText}`,
      );
    }
  }

  async info(message: string): Promise<void> {
    return this.send(message);
  }

  async err(message: string): Promise<void> {
    return this.send(message);
  }
}
