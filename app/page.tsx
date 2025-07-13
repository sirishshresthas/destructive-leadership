// app/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import { Roboto } from "next/font/google";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});


interface Message {
  id: string;
  text: string;
  isBot: boolean;
  hasContext?: boolean;
  sources?: {
    chapter_num?: number;
    chapter_title?: string;
    start_page?: number;
    end_page?: number;
    chunk_type?: string;
  }[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hey there! I’m your AI assistant, here to help you explore the *Research Handbook on Destructive Leadership* using smart search and Google Gemini. What would you like to dive into?",
      isBot: true,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (messageText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isBot: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText, history: messages.map(m => ({ role: m.isBot ? "assistant" : "user", content: m.text }))}),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isBot: true,
        hasContext: data.hasContext,
        sources: data.sources,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please try again.",
        isBot: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-roboto min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 animate-gradient-x"></div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-float"></div>
      <div
        className="absolute top-40 right-20 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-float"
        style={{ animationDelay: "2s" }}
      ></div>
      <div
        className="absolute bottom-20 left-1/4 w-24 h-24 bg-pink-500/20 rounded-full blur-xl animate-float"
        style={{ animationDelay: "4s" }}
      ></div>

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur border-b border-blue-300 shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Distructive Leadership Assistant</h1>
      </nav>


      {/* Main Content */}
      <div className="relative z-10 pt-24 px-6 h-screen flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 px-4 overflow-y-auto mb-4">
          <div className="glass-morphism rounded-2xl p-6 h-full">
            <div className="space-y-4 h-full overflow-y-auto">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isBot={message.isBot}
                  hasContext={message.hasContext}
                  sources={message.sources}
                />
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div className="glass-morphism rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="px-4 pb-6 bottom-0">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
