import type { ContactFrequency, InteractionType, ImportantDateLabel } from "@/lib/constants";
import type { RelationshipHealth } from "@/lib/relationship-health";

export interface Group {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  lastName?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  contactFrequency?: ContactFrequency | null;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    github?: string;
    website?: string;
  } | null;
  whatsappId?: string | null;
  createdAt: string;
  updatedAt: string;
  conversations?: Conversation[];
  groups?: Group[];
  importantDates?: ImportantDate[];
  _count?: {
    conversations: number;
  };
  lastConversationDate?: string | null;
  relationshipHealth?: RelationshipHealth;
}

export interface Conversation {
  id: string;
  content: string;
  type: InteractionType;
  timestamp: string;
  whatsappMessageId?: string | null;
  contactId: string;
  createdAt: string;
  contact?: Contact;
  reminders?: Reminder[];
}

export enum ReminderStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  DISMISSED = "DISMISSED",
}

export interface Reminder {
  id: string;
  contactId: string;
  conversationId: string;
  remindAt: string;
  status: ReminderStatus;
  createdAt: string;
  contact?: Contact;
  conversation?: Conversation;
}

export interface ImportantDate {
  id: string;
  contactId: string;
  label: ImportantDateLabel;
  date: string; // YYYY-MM-DD
  year?: number | null;
  recurring: boolean;
  createdAt: string;
  contact?: Contact;
}
