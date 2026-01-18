/// <reference types="vite/client" />

interface Window {
  selectedWhatsAppAccount: { instance_id: string; token: string } | null;
  dispatchEvent(event: Event): boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}