export interface Person {
  id: string;
  name: string;
  photoUrl?: string;
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


