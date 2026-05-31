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
      <Link to={`/product/${product.id}`} className="block aspect-[3/4] bg-gray-100 rounded-md overflow-hidden mb-2.5 relative">
        <img
          src={product.image || "/favicon.svg"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.discount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded text-[11px] font-semibold z-10">
            -{product.discount}%
          </div>
        )}
      </Link>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full h-8 w-8 bg-white hover:bg-gray-100 pointer-events-auto"
        >
          <Heart className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="font-medium text-[13px] hover:text-indigo-600 transition-colors line-clamp-2">{product.name}</h3>
        </Link>
        <p className="text-[11px] text-gray-600">{product.category}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-sm font-semibold">
              {product.price.toLocaleString('vi-VN')} VND
            </span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">
                {product.originalPrice.toLocaleString('vi-VN')} VND
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void onAddToCart(product)}
            className="h-7 w-7 shrink-0 p-0"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
