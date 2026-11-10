/**
 * Phase 4 stub — Telegram notifications.
 * Sends trade / alert summaries via the Telegram Bot API. No credentials
 * in code; the token and chat id come from the environment.
 */
export interface Notifier {
  send(message: string): Promise<void>;
}

export class TelegramNotifier implements Notifier {
  constructor(
    private readonly botToken: string,
    private readonly chatId: string,
  ) {}

  async send(message: string): Promise<void> {
    if (!this.botToken || !this.chatId) return; // notifications are optional
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, text: message }),
    });
  }
}

/** No-op notifier used when Telegram is not configured. */
export class NoopNotifier implements Notifier {
  async send(_message: string): Promise<void> {
    // intentionally empty
  }
}
