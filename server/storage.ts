import {
  users,
  conversations,
  conversationMembers,
  messages,
  messageReadReceipts,
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type ConversationMember,
  type InsertConversationMember,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<Array<Conversation & { 
    lastMessage?: Message; 
    unreadCount: number;
    otherMembers: User[];
  }>>;
  
  // Conversation member operations
  addConversationMember(member: InsertConversationMember): Promise<ConversationMember>;
  getConversationMembers(conversationId: string): Promise<User[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string, limit?: number): Promise<Array<Message & { sender: User }>>;
  
  // Message read receipt operations
  markMessageAsRead(messageId: string, userId: string): Promise<void>;
  getMessageReadReceipts(messageId: string): Promise<Array<{ user: User; readAt: Date }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({
        isOnline,
        lastSeen: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async getUserConversations(userId: string): Promise<Array<Conversation & { 
    lastMessage?: Message; 
    unreadCount: number;
    otherMembers: User[];
  }>> {
    const userConversations = await db
      .select({
        conversation: conversations,
      })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
      .where(eq(conversationMembers.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    const result = [];
    for (const { conversation } of userConversations) {
      // Get last message
      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Get unread count
      const unreadMessages = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .leftJoin(messageReadReceipts, and(
          eq(messageReadReceipts.messageId, messages.id),
          eq(messageReadReceipts.userId, userId)
        ))
        .where(and(
          eq(messages.conversationId, conversation.id),
          sql`${messageReadReceipts.id} IS NULL`,
          sql`${messages.senderId} != ${userId}`
        ));

      // Get other members
      const otherMembers = await db
        .select({ user: users })
        .from(conversationMembers)
        .innerJoin(users, eq(conversationMembers.userId, users.id))
        .where(and(
          eq(conversationMembers.conversationId, conversation.id),
          sql`${conversationMembers.userId} != ${userId}`
        ));

      result.push({
        ...conversation,
        lastMessage,
        unreadCount: unreadMessages[0]?.count || 0,
        otherMembers: otherMembers.map(m => m.user),
      });
    }

    return result;
  }

  // Conversation member operations
  async addConversationMember(member: InsertConversationMember): Promise<ConversationMember> {
    const [newMember] = await db
      .insert(conversationMembers)
      .values(member)
      .returning();
    return newMember;
  }

  async getConversationMembers(conversationId: string): Promise<User[]> {
    const members = await db
      .select({ user: users })
      .from(conversationMembers)
      .innerJoin(users, eq(conversationMembers.userId, users.id))
      .where(eq(conversationMembers.conversationId, conversationId));
    
    return members.map(m => m.user);
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    
    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return newMessage;
  }

  async getConversationMessages(conversationId: string, limit = 50): Promise<Array<Message & { sender: User }>> {
    const messagesWithSender = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return messagesWithSender
      .map(({ message, sender }) => ({ ...message, sender }))
      .reverse();
  }

  // Message read receipt operations
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await db
      .insert(messageReadReceipts)
      .values({ messageId, userId })
      .onConflictDoNothing();
  }

  async getMessageReadReceipts(messageId: string): Promise<Array<{ user: User; readAt: Date }>> {
    const receipts = await db
      .select({
        user: users,
        readAt: messageReadReceipts.readAt,
      })
      .from(messageReadReceipts)
      .innerJoin(users, eq(messageReadReceipts.userId, users.id))
      .where(eq(messageReadReceipts.messageId, messageId));

    return receipts.map(({ user, readAt }) => ({ user, readAt: readAt! }));
  }
}

export const storage = new DatabaseStorage();
