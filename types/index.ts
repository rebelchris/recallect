export interface Group {
  id: string;
  name: string;
  color?: string | null;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: string;
  name: string;
  photoUrl?: string | null;
  groupId?: string | null;
  group?: Group | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  conversations?: Conversation[];
  _count?: {
    conversations: number;
  };
}

export interface Conversation {
  id: string;
  content: string;
  timestamp: Date;
  personId: string;
  createdAt: Date;
  updatedAt: Date;
  person?: Person;
}


