// app/components/ChatInput.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      onSubmit={handleSubmit}
      className="relative"
    >
      <div className="glass-morphism rounded-2xl p-2 ring-1 ring-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all duration-300">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent text-slate-900 placeholder-slate-900/60 outline-none px-4 py-3 text-sm"
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>
    </motion.form>
  );
}
