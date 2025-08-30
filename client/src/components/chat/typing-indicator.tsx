import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@shared/schema";

interface TypingIndicatorProps {
  user?: User;
  isGroup: boolean;
}

export function TypingIndicator({ user, isGroup }: TypingIndicatorProps) {
  if (!user) return null;

  const getUserDisplayName = (user: User) => {
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.email || 'Unknown User';
  };

  return (
    <div className="flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-200">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={user.profileImageUrl || undefined} />
        <AvatarFallback>
          {getUserDisplayName(user).split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="bg-card border border-border rounded-lg p-4 max-w-md">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span data-testid="text-typing-indicator">
            {getUserDisplayName(user)} is typing...
          </span>
        </div>
      </div>
    </div>
  );
}
