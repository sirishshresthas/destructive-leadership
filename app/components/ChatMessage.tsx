// app/components/ChatMessage.tsx
"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  hasContext?: boolean;
  sources?: number;
}

export default function ChatMessage({
  message,
  isBot,
  hasContext,
  sources,
}: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"} mb-6`}
    >
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`message-bubble ${
          isBot
            ? "glass-morphism text-white"
            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto"
        }`}
      >
        <p className="text-sm leading-relaxed">{message}</p>
        {isBot && hasContext && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <span className="text-xs text-blue-300">
              ✓ Retrieved from {sources} knowledge sources
            </span>
          </div>
        )}
      </div>

      {!isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </motion.div>
  );
  // return (
  //   <motion.div
  //     initial={{ opacity: 0, y: 20 }}
  //     animate={{ opacity: 1, y: 0 }}
  //     transition={{ duration: 0.5 }}
  //     className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"} mb-6`}
  //   >
  //     {isBot && (
  //       <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
  //         <Bot className="w-4 h-4 text-white" />
  //       </div>
  //     )}

  //     <div
  //       className={`message-bubble ${
  //         isBot
  //           ? "glass-morphism text-white"
  //           : "bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto"
  //       }`}
  //     >
  //       {isBot ? (
  //         <ReactMarkdown
  //           // className="markdown-content"
  //           remarkPlugins={[remarkGfm]}
  //           rehypePlugins={[rehypeHighlight, rehypeRaw]}
  //           components={{
  //             code({
  //               inline,
  //               className,
  //               children,
  //               ...props
  //             }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
  //               const match = /language-(\w+)/.exec(className || "");
  //               return !inline && match ? (
  //                 <pre className="bg-black/50 rounded-lg p-4 mb-3 overflow-x-auto">
  //                   <code className={className} {...props}>
  //                     {children}
  //                   </code>
  //                 </pre>
  //               ) : (
  //                 <code
  //                   className="bg-black/30 text-blue-300 px-2 py-1 rounded text-xs font-mono"
  //                   {...props}
  //                 >
  //                   {children}
  //                 </code>
  //               );
  //             },
  //           }}
  //         >
  //           {message}
  //         </ReactMarkdown>
  //       ) : (
  //         <p className="text-sm leading-relaxed">{message}</p>
  //       )}

  //       {isBot && hasContext && (
  //         <div className="mt-2 pt-2 border-t border-white/20">
  //           <span className="text-xs text-blue-300">
  //             ✓ Retrieved from {sources} knowledge sources
  //           </span>
  //         </div>
  //       )}
  //     </div>

  //     {!isBot && (
  //       <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
  //         <User className="w-4 h-4 text-white" />
  //       </div>
  //     )}
  //   </motion.div>
  // );
}
