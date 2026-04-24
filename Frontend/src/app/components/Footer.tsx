import { Link } from 'react-router';

export function Footer() {
  return (
    <footer className="bg-black text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">OUTFIO</h3>
            <p className="text-gray-400 text-sm">
              Thời trang cao cấp cho mọi phong cách
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Mua Sắm</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Nữ</a></li>
              <li><a href="#" className="hover:text-white">Nam</a></li>
              <li><a href="#" className="hover:text-white">Phụ Kiện</a></li>
              <li><a href="#" className="hover:text-white">Sale</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Hỗ Trợ</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Liên Hệ</a></li>
              <li><a href="#" className="hover:text-white">Giao Hàng</a></li>
              <li><a href="#" className="hover:text-white">Đổi Trả</a></li>
              <li><a href="#" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Theo Dõi</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Facebook</a></li>
              <li><a href="#" className="hover:text-white">Instagram</a></li>
              <li><a href="#" className="hover:text-white">TikTok</a></li>
              <li><a href="#" className="hover:text-white">YouTube</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>© 2026 OUTFIO. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
