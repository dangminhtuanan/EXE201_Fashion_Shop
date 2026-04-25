import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Link } from "react-router";
import { aiApi, getErrorMessage } from "../lib/api";
import type { Product } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  products?: Product[];
  timestamp: Date;
}

function handleProductImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;

  if (image.src.endsWith("/favicon.svg")) {
    return;
  }

  image.src = "/favicon.svg";
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "bot",
      content:
        "Xin chào, tôi là trợ lý AI. Bạn đang tìm sản phẩm hoặc cần tư vấn phối đồ như thế nào?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (messageOverride?: string) => {
    const question = (messageOverride ?? inputValue).trim();
    if (!question || isTyping) {
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      type: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await aiApi.chat({
        question,
        limit: 4,
      });
      const answer = response.answer;

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          type: "bot",
          content: answer,
          products: response.products,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      const answer = `Xin lỗi, tôi chưa thể trả lời lúc này. ${getErrorMessage(error)}`;

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          type: "bot",
          content: answer,
          timestamp: new Date(),
        },
      ]);

      void aiApi
        .createChatbotLog({
          question,
          answer,
          intent: "error",
        })
        .catch(() => undefined);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    "Áo sơ mi công sở",
    "Đồ đi chơi cuối tuần",
    "Sản phẩm sale",
    "Đầm dự tiệc",
  ];

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-[9999]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen((value) => !value)}
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-[9998] w-[380px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Trợ lý AI</h3>
                <p className="text-xs text-white/80">Gemini tư vấn sản phẩm</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4 bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${message.type === "user" ? "order-2" : "order-1"}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          message.type === "user"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                      </div>

                      {message.products && message.products.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.products.map((product) => (
                            <Link
                              key={product.productId || product.id}
                              to={`/product/${product.id}`}
                              className="flex gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-purple-300 hover:shadow-md transition-all group"
                              onClick={() => setIsOpen(false)}
                            >
                              <img
                                src={product.image || "/favicon.svg"}
                                alt=""
                                onError={handleProductImageError}
                                className="w-16 h-16 shrink-0 object-cover rounded-lg bg-gray-100"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-600">
                                  {product.name}
                                </h4>
                                <p className="text-xs text-gray-500">{product.category}</p>
                                <p className="text-sm font-semibold text-purple-600 mt-1">
                                  {product.price.toLocaleString("vi-VN")}đ
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:120ms]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:240ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {messages.length <= 1 && !isTyping && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-500 mb-2">Gợi ý nhanh:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => void sendMessage(action)}
                      className="px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 rounded-full border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  disabled={isTyping}
                />
                <Button
                  onClick={() => void sendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  size="icon"
                  className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
