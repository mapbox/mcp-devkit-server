import { Message } from './Chat';
import { MCPResource } from './MCPResource';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`flex ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {/* Render MCP-UI resources */}
        {message.resources && message.resources.length > 0 && (
          <div className="mt-4 space-y-3">
            {message.resources.map((resource, index) => (
              <MCPResource key={index} resource={resource} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
