import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Product } from '../types';
import { Link } from 'react-router';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void | Promise<void>;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="group relative">
      <Link to={`/product/${product.id}`} className="block aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
        <img
          src={product.image || "/favicon.svg"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.discount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold z-10">
            -{product.discount}%
          </div>
        )}
      </Link>
      
      {/* Heart button removed from inside the Link to prevent hydration/nesting issues, absolutely positioned over the container */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full h-9 w-9 bg-white hover:bg-gray-100 pointer-events-auto"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="font-medium text-sm hover:text-indigo-600 transition-colors">{product.name}</h3>
        </Link>
        <p className="text-xs text-gray-600">{product.category}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {product.price.toLocaleString('vi-VN')}₫
            </span>
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                {product.originalPrice.toLocaleString('vi-VN')}₫
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void onAddToCart(product)}
            className="h-8 w-8 p-0"
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
