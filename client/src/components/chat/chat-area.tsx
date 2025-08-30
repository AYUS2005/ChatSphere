import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Menu, 
  Video, 
  Phone, 
  MoreVertical, 
  Paperclip, 
  Image as ImageIcon, 
  Send, 
  Mic, 
  Smile 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient } from "@/lib/queryClient";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import type { User, Message } from "@shared/schema";

interface ChatAreaProps {
  selectedConversationId: string | null;
  currentUser: User;
  onToggleSidebar: () => void;
  isMobile: boolean;
}

export function ChatArea({ selectedConversationId, currentUser, onToggleSidebar, isMobile }: ChatAreaProps) {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
    refetchInterval: 2000, // Poll every 2 seconds for real-time feel
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

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, messageType = "text" }: { content: string; messageType?: string }) => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, messageType }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageText("");
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversationId) return;
    
    sendMessageMutation.mutate({ content: messageText.trim() });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentConversation = conversations.find(c => c.id === selectedConversationId);
  
  const getConversationName = (conv: any) => {
    if (!conv) return "";
    if (conv.isGroup) {
      return conv.name || 'Group Chat';
    }
    const otherUser = conv.otherMembers[0];
    return otherUser 
      ? `${otherUser.firstName} ${otherUser.lastName}`.trim() || otherUser.email || 'Unknown User'
      : 'Direct Chat';
  };

  const getConversationAvatar = (conv: any) => {
    if (!conv || conv.isGroup) return null;
    return conv.otherMembers[0]?.profileImageUrl;
  };

  const isOtherUserOnline = (conv: any) => {
    if (!conv || conv.isGroup) return false;
    return conv.otherMembers[0]?.isOnline;
  };

  if (!selectedConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Menu className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Welcome to ChatFlow</h3>
          <p className="text-muted-foreground">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="mr-3"
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <Avatar className="w-10 h-10">
            {currentConversation?.isGroup ? (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : (
              <>
                <AvatarImage src={getConversationAvatar(currentConversation) || undefined} />
                <AvatarFallback>
                  {getConversationName(currentConversation).split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <div className="ml-3">
            <h2 className="font-semibold text-foreground" data-testid="text-conversation-name">
              {getConversationName(currentConversation)}
            </h2>
            <div className="flex items-center">
              {isOtherUserOnline(currentConversation) && (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="ml-2 text-sm text-muted-foreground">Online</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" data-testid="button-video-call">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-voice-call">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-more-options">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {isLoadingMessages ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUser.id}
              currentUser={currentUser}
            />
          ))
        )}
        
        {/* Typing Indicator - Mock for demonstration */}
        {selectedConversationId && Math.random() > 0.7 && (
          <TypingIndicator 
            user={currentConversation?.otherMembers[0]} 
            isGroup={currentConversation?.isGroup || false}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" data-testid="button-attach-file">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-attach-image">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-12"
              data-testid="input-message"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1"
              data-testid="button-emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-voice-message">
            <Mic className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
