import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { Message, User } from "@shared/schema";

interface MessageBubbleProps {
  message: Message & { sender: User };
  isOwn: boolean;
  currentUser: User;
}

export function MessageBubble({ message, isOwn, currentUser }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserDisplayName = (user: User) => {
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.email || 'Unknown User';
  };

  return (
    <div className={`flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-200 ${isOwn ? 'justify-end' : ''}`}>
      {!isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.sender.profileImageUrl || undefined} />
          <AvatarFallback>
            {getUserDisplayName(message.sender).split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex-1 ${isOwn ? 'flex flex-col items-end' : ''}`}>
        <div className={`
          rounded-lg p-3 max-w-md break-words
          ${isOwn 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card border border-border text-foreground'
          }
        `}>
          <p data-testid={`message-content-${message.id}`}>{message.content}</p>
        </div>
        <div className="flex items-center mt-2 text-xs text-muted-foreground">
          {isOwn ? (
            <>
              <span className="text-green-600">Read</span>
              <span className="mx-2">•</span>
              <span data-testid={`message-time-${message.id}`}>{formatTime(message.createdAt)}</span>
            </>
          ) : (
            <>
              <span data-testid={`message-time-${message.id}`}>{formatTime(message.createdAt)}</span>
              <span className="mx-2">•</span>
              <span className="text-green-600">Read</span>
            </>
          )}
        </div>
      </div>

      {isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={currentUser.profileImageUrl || undefined} />
          <AvatarFallback>
            {getUserDisplayName(currentUser).split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
