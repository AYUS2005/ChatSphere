import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Moon, Settings, Search, Plus, Menu, X, Users, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient } from "@/lib/queryClient";
import type { User, Conversation, Message } from "@shared/schema";

interface ChatSidebarProps {
  user: User;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCloseSidebar: () => void;
  isMobile: boolean;
}

export function ChatSidebar({ 
  user, 
  selectedConversationId, 
  onSelectConversation, 
  onCloseSidebar,
  isMobile 
}: ChatSidebarProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["/api/conversations"],
    refetchInterval: 3000, // Poll every 3 seconds for real-time feel
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async ({ name, isGroup, memberIds }: { name?: string; isGroup: boolean; memberIds: string[] }) => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, isGroup, memberIds }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onSelectConversation(newConversation.id);
      toast({
        title: "Success",
        description: "New conversation created!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const conversationName = conv.isGroup 
      ? conv.name 
      : conv.otherMembers.map(m => `${m.firstName} ${m.lastName}`).join(", ");
    
    return conversationName?.toLowerCase().includes(searchLower) ||
           conv.lastMessage?.content?.toLowerCase().includes(searchLower);
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUserDisplayName = (user: User) => {
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.email || 'Unknown User';
  };

  const getConversationName = (conv: any) => {
    if (conv.isGroup) {
      return conv.name || 'Group Chat';
    }
    return conv.otherMembers.length > 0 
      ? getUserDisplayName(conv.otherMembers[0])
      : 'Direct Chat';
  };

  const getConversationAvatar = (conv: any) => {
    if (conv.isGroup) {
      return null; // Will show Users icon
    }
    return conv.otherMembers[0]?.profileImageUrl;
  };

  const handleNewChat = () => {
    // For demo purposes, create a group chat
    createConversationMutation.mutate({
      name: "New Group Chat",
      isGroup: true,
      memberIds: [user.id],
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">ChatFlow</h1>
          <div className="flex items-center space-x-2">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseSidebar}
                data-testid="button-close-sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" data-testid="button-toggle-theme">
              <Moon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/api/logout'}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center p-3 bg-secondary rounded-lg">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.profileImageUrl || undefined} />
            <AvatarFallback>
              {getUserDisplayName(user).split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1">
            <p className="font-medium text-foreground" data-testid="text-username">
              {getUserDisplayName(user)}
            </p>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="ml-2 text-sm text-muted-foreground">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-conversations"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin messaging!</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors mb-1 ${
                selectedConversationId === conv.id ? 'border-l-2 border-primary bg-accent' : ''
              }`}
              onClick={() => {
                onSelectConversation(conv.id);
                if (isMobile) onCloseSidebar();
              }}
              data-testid={`conversation-item-${conv.id}`}
            >
              <div className="flex items-center">
                <Avatar className="w-12 h-12">
                  {conv.isGroup ? (
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary-foreground" />
                    </div>
                  ) : (
                    <>
                      <AvatarImage src={getConversationAvatar(conv) || undefined} />
                      <AvatarFallback>
                        {getConversationName(conv).split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground truncate" data-testid={`text-conversation-name-${conv.id}`}>
                      {getConversationName(conv)}
                    </p>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
                <div className="ml-2 flex flex-col items-end">
                  {!conv.isGroup && conv.otherMembers[0]?.isOnline && (
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  )}
                  {conv.unreadCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="text-xs rounded-full w-5 h-5 flex items-center justify-center mt-1"
                      data-testid={`badge-unread-${conv.id}`}
                    >
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-t border-border">
        <Button
          className="w-full"
          onClick={handleNewChat}
          disabled={createConversationMutation.isPending}
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
    </div>
  );
}
