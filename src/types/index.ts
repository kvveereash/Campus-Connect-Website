export interface EventRegistration {
  id: string;
  userId: string;
  eventId: string;
  status: 'PENDING' | 'PENDING_PAYMENT' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  paymentId?: string;
  amountPaid?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  collegeId: string;
  department: string;
  year: string;
  followedColleges: string[]; // Array of College IDs
  registrations: EventRegistration[]; // Replace: registeredEvents Event[] @relation("RegisteredEvents")
  avatar?: string;
  resumeUrl?: string;
  achievements?: Achievement[];
  skills?: string[];
  interests?: string[];
  projects?: Project[];
  portfolioLinks?: PortfolioLink[];
  followers?: string[]; // User IDs
  following?: string[]; // User IDs
  bio?: string;
  joinedClubs?: string[]; // Club IDs
  badges?: Badge[];
  clubMemberships?: ClubMember[];
  role?: string;
  college?: College;

  // Timestamps & Meta
  createdAt?: string;
  updatedAt?: string;
  lastSeenAt?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or URL
  dateEarned: string;
}

export interface ClubMember {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  userId: string;
  clubId: string;
  club?: Club;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  logo?: string;
  category: string;
  collegeId: string;
  createdAt?: string;
  updatedAt?: string;
  members?: ClubMember[] | number;
  admins?: string[];
  image?: string;
  _count?: {
    members: number;
    events: number;
  }
}

export interface Achievement {
  id: string;
  title: string;
  date: string;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  link?: string;
  technologies?: string[];
}

export interface PortfolioLink {
  id: string;
  platform: string;
  url: string;
}

export interface College {
  id: string;
  name: string;
  location: string;
  logo: string;
  description: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO Date string
  venue: string;
  hostCollegeId: string;
  category: 'Hackathon' | 'Fest' | 'Workshop' | 'Seminar' | 'Tech Talk';
  registrationCount: number;
  price: number; // New field
  thumbnail?: string; // Optional for now
  creatorId?: string; // ID of the user who created the event
}

export interface TeamRequest {
  id: string;
  eventId: string;
  creatorId: string;
  creatorName: string; // Denormalized for display
  type: 'LOOKING_FOR_TEAM' | 'LOOKING_FOR_MEMBER';
  skills: string[];
  description: string;
  createdAt: string; // ISO Date
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'college' | 'topic' | 'private';
  description?: string;
  participants?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isMe?: boolean;
}
export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: string;
  expiresAt: string;
}

export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timestamp: string;
  likedByMe?: boolean;
  clubId?: string; // Optional link to a club
}

export type ActionState<T = void> = {
  success: boolean;
  error?: string | null;
  message?: string | null;
  data?: T;
  formErrors?: Record<string, string[]>;
};
