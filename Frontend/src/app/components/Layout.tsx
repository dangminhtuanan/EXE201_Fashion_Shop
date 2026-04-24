import { useState } from 'react';
import { Outlet } from 'react-router';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartSheet } from './CartSheet';
import { ChatBot } from './ChatBot';
import { useCart } from '../contexts/CartContext';

export function Layout() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { items, totalItems, updateQuantity, removeItem } = useCart();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header cartCount={totalItems} onCartClick={() => setIsCartOpen(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartSheet 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={items}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
      />
      <ChatBot />
    </div>
  );
}