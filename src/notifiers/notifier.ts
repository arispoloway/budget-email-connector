
export interface Notifier {
    info(message: string): Promise<void>;
    err(message: string): Promise<void>;
}