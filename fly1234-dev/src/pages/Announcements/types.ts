export type WhatsAppGroup = {
  id: string;
  name: string;
  participants?: number;
};

export interface Announcement {
  id: string;
  title: string;
  message?: string;
  imageUrl?: string;
  date: string;
  sentTo: number;
  type: 'group' | 'contact';
  successRate?: number;
  createdAt: Date;
  groupIds?: string[];
  contactIds?: string[];
  successfulRecipients?: string[];
  failedRecipients?: string[];
  failed?: number;
}

type Participant = {
  id: string;
  name: string;
  group: string;
  phone?: string;
  isAdmin?: boolean;
};

type SaveAnnouncementFn = (
  data: Omit<Announcement, 'id' | 'date' | 'createdAt'>
) => Promise<Announcement>;
