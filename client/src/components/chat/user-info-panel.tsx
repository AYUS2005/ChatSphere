import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Phone, Monitor, FileText, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";

interface UserInfoPanelProps {
  conversationId: string;
}

export function UserInfoPanel({ conversationId }: UserInfoPanelProps) {
  const { toast } = useToast();

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
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

  const currentConversation = conversations.find(c => c.id === conversationId);
  const otherUser = currentConversation?.otherMembers[0];

  const getUserDisplayName = (user: User) => {
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.email || 'Unknown User';
  };

  if (!currentConversation || currentConversation.isGroup) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Group chat info panel</p>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">User information not available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* User Profile */}
      <div className="p-6 border-b border-border text-center">
        <Avatar className="w-20 h-20 mx-auto mb-4">
          <AvatarImage src={otherUser.profileImageUrl || undefined} />
          <AvatarFallback className="text-lg">
            {getUserDisplayName(otherUser).split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-lg text-foreground" data-testid="text-user-name">
          {getUserDisplayName(otherUser)}
        </h3>
        <p className="text-sm text-muted-foreground" data-testid="text-user-email">
          {otherUser.email}
        </p>
        <div className="flex items-center justify-center mt-2">
          <span className={`w-2 h-2 rounded-full ${otherUser.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
          <span className="ml-2 text-sm text-muted-foreground">
            {otherUser.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" data-testid="button-video-call-panel">
              <Video className="h-4 w-4 mr-3 text-primary" />
              Video Call
            </Button>
            <Button variant="ghost" className="w-full justify-start" data-testid="button-voice-call-panel">
              <Phone className="h-4 w-4 mr-3 text-primary" />
              Voice Call
            </Button>
            <Button variant="ghost" className="w-full justify-start" data-testid="button-share-screen">
              <Monitor className="h-4 w-4 mr-3 text-primary" />
              Share Screen
            </Button>
          </CardContent>
        </Card>

        {/* Shared Files */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shared Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center p-3 bg-secondary rounded-lg">
              <FileText className="h-4 w-4 text-red-500 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Design_Guidelines.pdf</p>
                <p className="text-xs text-muted-foreground">2.3 MB • Yesterday</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-secondary rounded-lg">
              <ImageIcon className="h-4 w-4 text-blue-500 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">mockup_v2.png</p>
                <p className="text-xs text-muted-foreground">1.8 MB • 2 days ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Notifications</span>
              <Switch defaultChecked data-testid="switch-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Message encryption</span>
              <Switch defaultChecked data-testid="switch-encryption" />
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive"
              data-testid="button-block-user"
            >
              Block User
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
