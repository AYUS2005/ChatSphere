import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient } from "@/lib/queryClient";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { UserInfoPanel } from "@/components/chat/user-info-panel";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Update user online status when component mounts
  const updateStatusMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const response = await fetch('/api/users/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isOnline }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
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
      console.error("Failed to update status:", error);
    },
  });

  // Set user as online when component mounts
  useEffect(() => {
    if (user) {
      updateStatusMutation.mutate(true);
    }

    // Set user as offline when page unloads
    const handleBeforeUnload = () => {
      if (user) {
        // Use sendBeacon for reliability during page unload
        navigator.sendBeacon('/api/users/status', JSON.stringify({ isOnline: false }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (user) {
        updateStatusMutation.mutate(false);
      }
    };
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ChatFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
          data-testid="overlay-sidebar"
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? `fixed left-0 top-0 h-full w-80 z-50 transform transition-transform ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'hidden lg:flex lg:w-64 xl:w-72'
        }
        bg-card border-r border-border flex-col
      `}>
        <ChatSidebar
          user={user}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          isMobile={isMobile}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea
          selectedConversationId={selectedConversationId}
          currentUser={user}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isMobile={isMobile}
        />
      </div>

      {/* User Info Panel - Hidden on mobile/tablet */}
      {!isMobile && selectedConversationId && (
        <div className="hidden xl:flex xl:w-80 bg-card border-l border-border flex-col">
          <UserInfoPanel conversationId={selectedConversationId} />
        </div>
      )}
    </div>
  );
}
