import { Button } from './ui/button';

interface HeroProps {
  imageUrl: string;
}

export function Hero({ imageUrl }: HeroProps) {
  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden bg-gray-100">
      <img
        src={imageUrl}
        alt="Fashion Hero"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent">
        <div className="container mx-auto px-4 h-full flex items-center">
          <div className="max-w-xl text-white">
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              Bộ Sưu Tập Mùa Xuân 2026
            </h2>
            <p className="text-lg md:text-xl mb-6 opacity-90">
              Khám phá những xu hướng thời trang mới nhất
            </p>
            <Button size="lg" className="bg-white text-black hover:bg-gray-100">
              Mua Ngay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
