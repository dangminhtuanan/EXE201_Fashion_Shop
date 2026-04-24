import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Product } from '../types';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  products?: Product[];
  timestamp: Date;
}

// Mock data sản phẩm để AI gợi ý
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Áo Thun Basic Premium',
    category: 'Áo thun',
    price: 299000,
    originalPrice: 499000,
    discount: 40,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
  },
  {
    id: '2',
    name: 'Quần Jeans Slim Fit',
    category: 'Quần jean',
    price: 599000,
    originalPrice: 899000,
    discount: 33,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80',
  },
  {
    id: '3',
    name: 'Áo Sơ Mi Oxford',
    category: 'Áo sơ mi',
    price: 449000,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
  },
  {
    id: '4',
    name: 'Váy Midi Hoa Nhí',
    category: 'Váy',
    price: 699000,
    originalPrice: 999000,
    discount: 30,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80',
  },
  {
    id: '5',
    name: 'Áo Khoác Denim',
    category: 'Áo khoác',
    price: 799000,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
  },
  {
    id: '6',
    name: 'Blazer Công Sở',
    category: 'Áo vest',
    price: 1299000,
    originalPrice: 1799000,
    discount: 28,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80',
  },
  {
    id: '7',
    name: 'Chân Váy Xếp Ly',
    category: 'Chân váy',
    price: 399000,
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&q=80',
  },
  {
    id: '8',
    name: 'Áo Len Cardigan',
    category: 'Áo len',
    price: 549000,
    originalPrice: 799000,
    discount: 31,
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80',
  },
];

// AI Response logic
const getAIResponse = (userMessage: string): { content: string; products?: Product[] } => {
  const message = userMessage.toLowerCase();
  
  // Casual wear
  if (message.includes('casual') || message.includes('đi chơi') || message.includes('thoải mái')) {
    return {
      content: 'Tôi gợi ý cho bạn những outfit casual phù hợp để đi chơi hoặc dạo phố. Những sản phẩm này vừa thoải mái vừa thời trang!',
      products: [mockProducts[0], mockProducts[1], mockProducts[4]],
    };
  }
  
  // Office wear
  if (message.includes('công sở') || message.includes('đi làm') || message.includes('office')) {
    return {
      content: 'Đây là những trang phục công sở chuyên nghiệp và lịch sự mà tôi nghĩ bạn sẽ thích:',
      products: [mockProducts[2], mockProducts[5], mockProducts[6]],
    };
  }
  
  // Party/Date
  if (message.includes('dự tiệc') || message.includes('hẹn hò') || message.includes('date') || message.includes('party')) {
    return {
      content: 'Những outfit này sẽ giúp bạn tự tin và nổi bật trong buổi hẹn hò hoặc tiệc tùng:',
      products: [mockProducts[3], mockProducts[5], mockProducts[7]],
    };
  }
  
  // Specific items
  if (message.includes('áo') && (message.includes('thun') || message.includes('t-shirt'))) {
    return {
      content: 'Đây là những mẫu áo thun chất lượng cao đang được ưa chuộng:',
      products: [mockProducts[0]],
    };
  }
  
  if (message.includes('váy') || message.includes('dress')) {
    return {
      content: 'Những mẫu váy xinh đẹp này chắc chắn sẽ làm bạn hài lòng:',
      products: [mockProducts[3], mockProducts[6]],
    };
  }
  
  if (message.includes('quần') && message.includes('jean')) {
    return {
      content: 'Quần jeans luôn là lựa chọn an toàn và thời trang. Đây là gợi ý của tôi:',
      products: [mockProducts[1]],
    };
  }
  
  if (message.includes('áo khoác') || message.includes('jacket')) {
    return {
      content: 'Những chiếc áo khoác này sẽ hoàn thiện outfit của bạn:',
      products: [mockProducts[4], mockProducts[5]],
    };
  }
  
  // Sale/Discount
  if (message.includes('sale') || message.includes('giảm giá') || message.includes('khuyến mãi')) {
    const saleProducts = mockProducts.filter(p => p.discount);
    return {
      content: 'Đây là những sản phẩm đang có chương trình giảm giá hấp dẫn:',
      products: saleProducts.slice(0, 4),
    };
  }
  
  // Default response
  return {
    content: 'Tôi có thể giúp bạn tìm kiếm trang phục phù hợp! Hãy cho tôi biết bạn đang tìm kiếm gì:\n\n• Trang phục công sở\n• Đồ đi chơi casual\n• Outfit dự tiệc/hẹn hò\n• Sản phẩm đang sale\n\nHoặc cho tôi biết loại sản phẩm cụ thể như áo, váy, quần jean...',
  };
};

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Xin chào! 👋 Tôi là trợ lý AI thời trang. Tôi có thể giúp bạn tìm kiếm và gợi ý những outfit phù hợp với phong cách của bạn. Bạn đang tìm kiếm gì hôm nay?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      const aiResponse = getAIResponse(inputValue);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: aiResponse.content,
        products: aiResponse.products,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    'Trang phục công sở',
    'Đồ đi chơi',
    'Sản phẩm sale',
    'Outfit dự tiệc',
  ];

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    setTimeout(() => handleSendMessage(), 100);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-[9999]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCircle className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* Pulse effect */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 -z-10"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'easeOut',
            }}
          />
        )}
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-[9998] w-[380px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Trợ Lý AI Thời Trang</h3>
                <p className="text-xs text-white/80">Luôn sẵn sàng hỗ trợ bạn</p>
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

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                      </div>

                      {/* Product Cards */}
                      {message.products && message.products.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.products.map((product) => (
                            <motion.a
                              key={product.id}
                              href={`/product/${product.id}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer"
                            >
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                                  {product.name}
                                </h4>
                                <p className="text-xs text-gray-500">{product.category}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-semibold text-purple-600">
                                    {product.price.toLocaleString('vi-VN')}đ
                                  </span>
                                  {product.originalPrice && (
                                    <span className="text-xs text-gray-400 line-through">
                                      {product.originalPrice.toLocaleString('vi-VN')}đ
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.a>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <motion.div
                          className="w-2 h-2 bg-gray-400 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-gray-400 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-gray-400 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Quick Actions */}
            {messages.length <= 1 && !isTyping && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-500 mb-2">Gợi ý nhanh:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleQuickAction(action)}
                      className="px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 rounded-full border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
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