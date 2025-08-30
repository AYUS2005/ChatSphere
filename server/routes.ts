import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertConversationSchema, insertMessageSchema, insertConversationMemberSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user online status
  app.post('/api/users/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isOnline } = req.body;
      
      await storage.updateUserOnlineStatus(userId, isOnline);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Get user conversations
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Create a new conversation
  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, isGroup, memberIds } = insertConversationSchema.extend({
        memberIds: z.array(z.string()).min(1),
      }).parse(req.body);

      // Create conversation
      const conversation = await storage.createConversation({ name, isGroup });
      
      // Add creator as member
      await storage.addConversationMember({
        conversationId: conversation.id,
        userId,
      });

      // Add other members
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await storage.addConversationMember({
            conversationId: conversation.id,
            userId: memberId,
          });
        }
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get conversation messages
  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { limit } = req.query;

      // Verify user is member of conversation
      const members = await storage.getConversationMembers(id);
      const isMember = members.some(member => member.id === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getConversationMessages(id, limit ? parseInt(limit) : 50);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { content, messageType } = insertMessageSchema.parse({
        ...req.body,
        conversationId: id,
        senderId: userId,
      });

      // Verify user is member of conversation
      const members = await storage.getConversationMembers(id);
      const isMember = members.some(member => member.id === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const message = await storage.createMessage({
        conversationId: id,
        senderId: userId,
        content,
        messageType,
      });

      // Mark as read by sender
      await storage.markMessageAsRead(message.id, userId);

      // Get message with sender info
      const messageWithSender = await storage.getConversationMessages(id, 1);
      res.json(messageWithSender[0]);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Mark message as read
  app.post('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      await storage.markMessageAsRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Get all users (for creating new conversations)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // For simplicity, return empty array - in a real app you'd have user search
      res.json([]);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create direct conversation with another user
  app.post('/api/conversations/direct', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { otherUserId } = z.object({ otherUserId: z.string() }).parse(req.body);

      // Check if conversation already exists
      const existingConversations = await storage.getUserConversations(userId);
      const directConversation = existingConversations.find(conv => 
        !conv.isGroup && 
        conv.otherMembers.length === 1 && 
        conv.otherMembers[0].id === otherUserId
      );

      if (directConversation) {
        return res.json(directConversation);
      }

      // Create new direct conversation
      const conversation = await storage.createConversation({
        name: null,
        isGroup: false,
      });

      // Add both users as members
      await storage.addConversationMember({
        conversationId: conversation.id,
        userId,
      });
      
      await storage.addConversationMember({
        conversationId: conversation.id,
        userId: otherUserId,
      });

      res.json(conversation);
    } catch (error) {
      console.error("Error creating direct conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
