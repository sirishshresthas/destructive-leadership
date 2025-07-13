"use client";

import { motion } from "framer-motion";
import { Bot, User, Clipboard, ClipboardCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { useMemo, useState, useRef, useEffect } from "react";

interface Source {
  chapter_num?: number;
  chapter_title?: string;
  page_num?: number;
}

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  hasContext?: boolean;
  sources?: Source[];
}

export default function ChatMessage({
  message,
  isBot,
  hasContext,
  sources,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const messageRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to this message on mount
  useEffect(() => {
    messageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const deduplicatedSources = useMemo(() => {
    const seen = new Map<number, Source>();
    sources?.forEach((source) => {
      if (source.chapter_num && !seen.has(source.chapter_num)) {
        seen.set(source.chapter_num, source);
      }
    });
    return Array.from(seen.values());
  }, [sources]);

  return (
    <motion.div
      ref={messageRef}
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
          isBot ? "glass-morphism text-slate-900" : "text-slate-900 ml-auto"
        }`}
      >
        {isBot ? (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
              components={{
                code({
                  inline,
                  className,
                  children,
                  ...props
                }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <pre className="bg-black/50 rounded-lg p-4 mb-3 overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code
                      className="bg-black/30 text-blue-300 px-2 py-1 rounded text-xs font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message}
            </ReactMarkdown>

            {/* Copy to clipboard button */}
            <div className="mt-3 flex items-center justify-start text-xs text-gray-400 gap-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(message);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 hover:text-blue-500 transition cursor-pointer"
              >
                {copied ? (
                  <ClipboardCheck className="w-4 h-4" />
                ) : (
                  <Clipboard className="w-4 h-4" />
                )}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed">{message}</p>
        )}

        {/* Sources */}
        {isBot &&
          hasContext &&
          deduplicatedSources &&
          deduplicatedSources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/20 text-xs text-gray-500 space-y-1">
              <div>✓ Retrieved from the following sources:</div>
              <ul className="list-disc list-inside">
                {deduplicatedSources.map((source, idx) => (
                  <li key={idx}>
                    Chapter {source.chapter_num}: {source.chapter_title}
                    {source.page_num && <> (p. {source.page_num})</>}
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* User icon (right side) */}
        {!isBot && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center ml-3">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
