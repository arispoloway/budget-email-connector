import { EmailStore } from "../store";

export type Email = {
  id: string;
  from: string;
  subject: string;
  body: string;
  date?: Date;
  link?: string;
};

export interface EmailClient {
  init(): Promise<void>;

  listUnprocessedMessages(store: EmailStore): Promise<Email[]>;
}
