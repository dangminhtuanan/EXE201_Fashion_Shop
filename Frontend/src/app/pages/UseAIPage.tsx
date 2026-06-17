import React, { useEffect, useMemo, useState } from 'react';
import {
  Home,
  Shirt,
  Wand2,
  Library,
  Users,
  History,
  UserCircle,
  CreditCard,
  Settings2,
  HelpCircle,
  Info,
  Plus,
  SlidersHorizontal,
  ChevronLeft,
  X,
  Check,
  ArrowRight,
  MonitorPlay,
  Code,
  Globe,
  Users2,
  Box,
  Layers,
  Sparkles,
  Palette,
  Sun,
  Cloud,
  Snowflake,
  Droplets,
  MapPin,
  TrendingUp,
  Upload,
  Download,
  Share2,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router';

// Import images from local assets
import tshirtProduct from '@/assets/8a55393af5b2913bc9b718f78f6d9d7649ea15b6.png';
import modelWithTshirt from '@/assets/04a106332b46fd32e303290a6fcb306e80cb9a91.png';
import outfitComplete from '@/assets/d027e7715d02e5973bda20d895640cb4a33ba4d1.png';
import modelWhiteOutfit from '@/assets/027f9141fc5b4d041b83cbfd34283e0f6c08e067.png';
import { getStoredAuthSession } from '../lib/auth-storage';
import { aiApi, getErrorMessage, productsApi, uploadApi } from '../lib/api';
import type { AIOutfitHistoryItem, Product } from '../types';

const CLOTHES_IMAGES = [
  tshirtProduct, // Add the ICDN tshirt as first item
  "https://images.unsplash.com/photo-1621198059871-0d5f9b449233?auto=format&fit=crop&q=80&w=150&h=200", // clothing flat lay
  "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&q=80&w=150&h=200", // fashion dress flat lay
  "https://images.unsplash.com/photo-1708523842501-800cd1c7505e?auto=format&fit=crop&q=80&w=150&h=200", // denim jacket isolated
  "https://images.unsplash.com/photo-1527332042004-0b1a4d8646a3?auto=format&fit=crop&q=80&w=150&h=200", // skirt flat lay
  "https://images.unsplash.com/photo-1767605520993-3351a27aae40?auto=format&fit=crop&q=80&w=150&h=200", // t-shirt folded flat
  "https://images.unsplash.com/photo-1765654603344-c0d4dda58f5c?auto=format&fit=crop&q=80&w=150&h=200"  // sweater isolated
];

const MODEL_IMAGES = [
  modelWhiteOutfit, // New model with white outfit
  modelWhiteOutfit, // Repeat new model
  modelWhiteOutfit,
  modelWhiteOutfit,
  modelWhiteOutfit,
  modelWhiteOutfit,
];

const UPLOADED_MODEL_STORAGE_PREFIX = 'outfio-ai-uploaded-models';

function getUploadedModelStorageKey() {
  const userId = getStoredAuthSession()?.profile?._id || 'guest';
  return `${UPLOADED_MODEL_STORAGE_PREFIX}:${userId}`;
}

function getUniqueModelUrls(urls: unknown) {
  if (!Array.isArray(urls)) {
    return [];
  }

  return Array.from(
    new Set(
      urls
        .filter((url): url is string => typeof url === 'string')
        .map((url) => url.trim())
        .filter(Boolean)
    )
  );
}

function loadUploadedModelImages() {
  if (typeof window === 'undefined') {
    return [];
  }

  const storedValue = window.localStorage.getItem(getUploadedModelStorageKey());
  if (!storedValue) {
    return [];
  }

  try {
    return getUniqueModelUrls(JSON.parse(storedValue));
  } catch {
    window.localStorage.removeItem(getUploadedModelStorageKey());
    return [];
  }
}

function saveUploadedModelImages(urls: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getUploadedModelStorageKey(), JSON.stringify(getUniqueModelUrls(urls)));
}

const MIX_MATCH_KEYWORDS = [
  'ao',
  'top',
  'shirt',
  'tshirt',
  'tee',
  'blouse',
  'hoodie',
  'sweater',
  'jacket',
  'coat',
  'polo',
  'somi',
  'thun',
  'khoac',
  'quan',
  'bottom',
  'pants',
  'trousers',
  'jean',
  'jeans',
  'short',
  'shorts',
  'skirt',
  'legging',
  'jogger',
];

const TOP_KEYWORDS = [
  'ao',
  'top',
  'shirt',
  'tshirt',
  'tee',
  'blouse',
  'hoodie',
  'sweater',
  'jacket',
  'coat',
  'polo',
  'somi',
  'thun',
  'khoac',
];

const BOTTOM_KEYWORDS = [
  'quan',
  'bottom',
  'pants',
  'trousers',
  'jean',
  'jeans',
  'short',
  'shorts',
  'skirt',
  'chanvay',
  'legging',
  'jogger',
];

const FULL_SET_KEYWORDS = ['vay', 'dam', 'dress', 'jumpsuit', 'set', 'suit'];
const UNSAFE_MENS_TOP_KEYWORDS = [
  'babytee',
  'bralette',
  'bra',
  'bustier',
  'camisole',
  'boxy',
  'cropped',
  'croptop',
  'crop',
  'cutout',
  'halter',
  'strapless',
  'tank',
  'tube',
];

function normalizeSearchText(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function hasProductTypeKeyword(text: string, keywords: string[]) {
  const compactText = text.replace(/\s+/g, '');
  const words = new Set(text.split(/[^a-z0-9]+/).filter(Boolean));

  return keywords.some((keyword) => {
    if (keyword.length <= 3) {
      return words.has(keyword);
    }

    return words.has(keyword) || compactText.includes(keyword);
  });
}

function getTryOnClothType(product: Product): 'upper' | 'lower' | 'full_set' {
  const categoryText = normalizeSearchText(
    [product.category, product.categorySlug].filter(Boolean).join(' ')
  );
  const fallbackText = normalizeSearchText(product.name);

  if (hasProductTypeKeyword(categoryText, FULL_SET_KEYWORDS)) {
    return 'full_set';
  }

  if (hasProductTypeKeyword(categoryText, BOTTOM_KEYWORDS)) {
    return 'lower';
  }

  if (hasProductTypeKeyword(categoryText, TOP_KEYWORDS)) {
    return 'upper';
  }

  if (hasProductTypeKeyword(fallbackText, FULL_SET_KEYWORDS)) {
    return 'full_set';
  }

  if (hasProductTypeKeyword(fallbackText, BOTTOM_KEYWORDS)) {
    return 'lower';
  }

  return 'upper';
}

function canMixMatchProduct(product: Product) {
  const text = normalizeSearchText(
    [product.name, product.category, product.categorySlug, product.description].filter(Boolean).join(' ')
  );
  const compactText = text.replace(/\s+/g, '');
  const words = new Set(text.split(/[^a-z0-9]+/).filter(Boolean));

  return MIX_MATCH_KEYWORDS.some((keyword) => words.has(keyword) || compactText.includes(keyword));
}

function isMixMatchProductSafeForGender(product: Product, modelGender?: Product["gender"]) {
  if (modelGender !== 'men' && modelGender !== 'unisex') {
    return true;
  }

  if (modelGender === 'men' && product.gender === 'women') {
    return false;
  }

  if (modelGender === 'unisex' && product.gender === 'women') {
    return false;
  }

  if (modelGender === 'unisex' && product.gender && product.gender !== 'unisex') {
    return false;
  }

  if (getTryOnClothType(product) !== 'upper') {
    return true;
  }

  const text = normalizeSearchText(
    [product.name, product.category, product.categorySlug, product.description].filter(Boolean).join(' ')
  );

  return product.gender !== 'women' && !hasProductTypeKeyword(text, UNSAFE_MENS_TOP_KEYWORDS);
}

const CLOTHING_CATEGORIES = [
  { name: 'Áo', icon: Shirt, items: 8 },
  { name: 'Quần', icon: Shirt, items: 12 },
  { name: 'Váy', icon: Shirt, items: 6 },
  { name: 'Phụ kiện', icon: Sparkles, items: 15 }
];

const STYLE_SUGGESTIONS = [
  {
    id: 1,
    name: 'Street Style',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=300&h=400',
    items: ['Áo hoodie', 'Quần jean', 'Sneakers'],
    season: 'Mùa đông',
    occasion: 'Casual'
  },
  {
    id: 2,
    name: 'Office Chic',
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&q=80&w=300&h=400',
    items: ['Áo sơ mi', 'Quần tây', 'Giày cao gót'],
    season: 'Mọi mùa',
    occasion: 'Công sở'
  },
  {
    id: 3,
    name: 'Summer Vibes',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=300&h=400',
    items: ['Váy maxi', 'Sandal', 'Túi cói'],
    season: 'Mùa hè',
    occasion: 'Dạo phố'
  },
  {
    id: 4,
    name: 'Elegant Evening',
    image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=300&h=400',
    items: ['Váy dài', 'Clutch', 'Jewelry'],
    season: 'Mọi mùa',
    occasion: 'Dự tiệc'
  }
];

const WEATHER_CONDITIONS = [
  { icon: Sun, label: 'Nắng', temp: '28-32°C' },
  { icon: Cloud, label: 'Nhiều mây', temp: '24-28°C' },
  { icon: Droplets, label: 'Mưa', temp: '22-26°C' },
  { icon: Snowflake, label: 'Lạnh', temp: '15-20°C' }
];

// Reusable components
const NavItem = ({ icon: Icon, label, active = false, badge, onClick }: { icon: React.ElementType, label: string, active?: boolean, badge?: React.ReactNode, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${active ? 'text-gray-900' : 'text-gray-500'}`} />
      <span>{label}</span>
    </div>
    {badge && <div>{badge}</div>}
  </button>
);

const SectionHeading = ({ title, showTip = true }: { title: string, showTip?: boolean }) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    {showTip && (
      <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700">
        <Info className="w-4 h-4" />
        Mẹo
      </button>
    )}
  </div>
);

const SegmentedControl = ({ options, activeIndex, onChange }: { options: string[], activeIndex: number, onChange: (index: number) => void }) => (
  <div className="flex p-1 bg-gray-100/80 rounded-lg mb-4">
    {options.map((option, idx) => (
      <button
        key={option}
        onClick={() => onChange(idx)}
        className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${
          activeIndex === idx ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {option}
      </button>
    ))}
  </div>
);

function formatHistoryDate(value?: string) {
  if (!value) {
    return 'Vua tao';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function historyTypeLabel(item: AIOutfitHistoryItem) {
  return item.clothType === 'combo' ? 'Mix and match' : 'AI try on';
}

function getLowerClothingImageUrl(item: AIOutfitHistoryItem) {
  const value = item.rawResponse?.lowerClothingImageUrl;
  return typeof value === 'string' ? value : '';
}

const AIHistoryView = ({
  historyItems,
  isLoading,
  onRefresh,
}: {
  historyItems: AIOutfitHistoryItem[];
  isLoading: boolean;
  onRefresh: () => void;
}) => (
  <div className="flex-1 overflow-y-auto bg-[#F9F9FB] p-4 md:p-6">
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử AI</h1>
          <p className="mt-1 text-sm text-gray-600">Các ảnh AI try on và mix and match đã tạo theo tài khoản hiện tại.</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Đang tải lịch sử...
        </div>
      )}

      {!isLoading && historyItems.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="font-medium text-gray-900">Chưa có ảnh nào trong lịch sử</p>
          <p className="mt-1 text-sm text-gray-500">Sau khi tạo AI try on hoặc mix and match, kết quả sẽ hiển thị ở đây.</p>
        </div>
      )}

      {!isLoading && historyItems.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {historyItems.map((item) => {
            const lowerClothingImageUrl = getLowerClothingImageUrl(item);

            return (
            <div key={item._id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="relative aspect-[3/4] bg-gray-100">
                <img
                  src={item.resultImageUrl}
                  alt={historyTypeLabel(item)}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-800 shadow-sm">
                  {historyTypeLabel(item)}
                </div>
                <div className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-800 shadow-sm">
                  {item.status}
                </div>
              </div>

              <div className="space-y-3 p-3">
                <div>
                  <p className="line-clamp-1 text-sm font-semibold text-gray-900">
                    {item.product?.name || (item.clothType === 'combo' ? 'Outfit mix and match' : 'Thử đồ AI')}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{formatHistoryDate(item.createdAt)}</p>
                </div>

                <div className={`grid gap-2 ${lowerClothingImageUrl ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="aspect-[3/4] overflow-hidden rounded-md bg-gray-100">
                    <img src={item.modelImageUrl} alt="Model" className="h-full w-full object-cover" />
                  </div>
                  <div className="aspect-[3/4] overflow-hidden rounded-md bg-gray-100">
                    <img src={item.clothingImageUrl} alt="Clothing" className="h-full w-full object-cover" />
                  </div>
                  {lowerClothingImageUrl && (
                    <div className="aspect-[3/4] overflow-hidden rounded-md bg-gray-100">
                      <img src={lowerClothingImageUrl} alt="Lower clothing" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>

                <a
                  href={item.resultImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#20B29A] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1a9682]"
                >
                  <Download className="h-4 w-4" />
                  Mở ảnh kết quả
                </a>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

export function UseAIPage() {
  const navigate = useNavigate();
  const [activeResource, setActiveResource] = useState<'create' | 'history'>('create');
  const [mainMode, setMainMode] = useState(0); // 0: Thử đồ AI, 1: Phối đồ với AI
  const [clothesTab, setClothesTab] = useState(0);
  const [modelTab, setModelTab] = useState(0);
  const [highQuality, setHighQuality] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState(0);
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [selectedClothing, setSelectedClothing] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  
  // State for "Phối đồ với AI" mode
  const [stylingClothing, setStylingClothing] = useState<number | null>(null);
  const [stylingModel, setStylingModel] = useState<number | null>(null);
  const [stylingModelGender, setStylingModelGender] = useState<Product["gender"]>("men");
  const [isGeneratingStyling, setIsGeneratingStyling] = useState(false);
  const [stylingResult, setStylingResult] = useState<string | null>(null);
  const [stylingOutfit, setStylingOutfit] = useState<{ top?: Product; bottom?: Product } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [uploadedModelImages, setUploadedModelImages] = useState<string[]>(() => loadUploadedModelImages());
  const [isUploadingModel, setIsUploadingModel] = useState(false);
  const [brokenImageUrls, setBrokenImageUrls] = useState<Set<string>>(() => new Set());
  const [historyItems, setHistoryItems] = useState<AIOutfitHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const navigateFromSidebar = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const openCreateMode = (mode: 0 | 1) => {
    setActiveResource('create');
    setMainMode(mode);
    setMobileMenuOpen(false);
  };

  const openHistory = () => {
    setActiveResource('history');
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await productsApi.getAll({
          limit: 100,
          sort: 'newest',
          inStock: true,
        });

        if (!cancelled) {
          setProducts(response.products);
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          alert(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await aiApi.getMyTryOns();
      setHistoryItems(response.recommendations);
    } catch (error) {
      setHistoryItems([]);
      alert(getErrorMessage(error));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeResource === 'history') {
      void loadHistory();
    }
  }, [activeResource]);

  const productChoices = useMemo(
    () => products.filter((product) => Boolean(product.image) && !brokenImageUrls.has(product.image)),
    [brokenImageUrls, products]
  );

  const stylingProductChoices = useMemo(
    () => productChoices.filter((product) =>
      canMixMatchProduct(product) && isMixMatchProductSafeForGender(product, stylingModelGender)
    ),
    [productChoices, stylingModelGender]
  );

  const modelChoices = useMemo(
    () => [...uploadedModelImages, ...MODEL_IMAGES],
    [uploadedModelImages]
  );

  const tryOnModelChoices = useMemo(
    () => (modelTab === 1 ? uploadedModelImages : MODEL_IMAGES),
    [modelTab, uploadedModelImages]
  );

  const getModelChoiceIndex = (displayIndex: number) => (
    modelTab === 1 ? displayIndex : uploadedModelImages.length + displayIndex
  );

  useEffect(() => {
    if (stylingClothing !== null && stylingClothing >= stylingProductChoices.length) {
      setStylingClothing(null);
    }
  }, [stylingClothing, stylingProductChoices.length]);

  useEffect(() => {
    if (selectedClothing !== null && selectedClothing >= productChoices.length) {
      setSelectedClothing(null);
    }
  }, [productChoices.length, selectedClothing]);

  const handleUploadModelImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: 'try-on' | 'styling'
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsUploadingModel(true);
    try {
      const response = await uploadApi.uploadImage(file);
      setUploadedModelImages((prev) => {
        const next = getUniqueModelUrls([response.url, ...prev]);
        saveUploadedModelImages(next);
        return next;
      });

      if (target === 'try-on') {
        setModelTab(1);
        setSelectedModel(0);
      } else {
        setStylingModel(0);
      }
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setIsUploadingModel(false);
    }
  };

  const markBrokenImage = (url?: string) => {
    if (!url) {
      return;
    }

    setBrokenImageUrls((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selectedClothing === null || selectedModel === null) {
      return;
    }

    const selectedProduct = productChoices[selectedClothing];
    const selectedModelImage = modelChoices[selectedModel];

    if (!selectedProduct || !selectedModelImage) {
      return;
    }

    if (brokenImageUrls.has(selectedProduct.image)) {
      alert('Ảnh sản phẩm này đang lỗi 404. Vui lòng chọn sản phẩm có ảnh hợp lệ.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await aiApi.createTryOn({
        modelImageUrl: selectedModelImage,
        clothingImageUrl: selectedProduct.image,
        productId: selectedProduct.productId,
        clothType: getTryOnClothType(selectedProduct),
        hdMode: highQuality,
      });

      if (!response.resultImageUrl) {
        alert('AI đang xử lý, vui lòng thử lại sau ít phút.');
        return;
      }

      setGeneratedResult(response.resultImageUrl);
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedResult(null);
    setSelectedClothing(null);
    setSelectedModel(null);
  };
  
  const handleGenerateStyling = async () => {
    if (stylingClothing === null || stylingModel === null) {
      return;
    }

    const selectedProduct = stylingProductChoices[stylingClothing];
    const selectedModelImage = modelChoices[stylingModel];

    if (!selectedProduct || !selectedModelImage) {
      return;
    }

    if (brokenImageUrls.has(selectedProduct.image)) {
      alert('Ảnh sản phẩm này đang lỗi 404. Vui lòng chọn sản phẩm có ảnh hợp lệ.');
      return;
    }

    setIsGeneratingStyling(true);
    try {
      const response = await aiApi.createMixMatchTryOn({
        modelImageUrl: selectedModelImage,
        productId: selectedProduct.productId,
        modelGender: stylingModelGender,
        hdMode: highQuality,
      });

      if (!response.resultImageUrl) {
        alert('AI đang xử lý, vui lòng thử lại sau ít phút.');
        return;
      }

      setStylingResult(response.resultImageUrl);
      setStylingOutfit(response.outfit);
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setIsGeneratingStyling(false);
    }
  };

  const handleResetStyling = () => {
    setStylingResult(null);
    setStylingOutfit(null);
    setStylingClothing(null);
    setStylingModel(null);
  };

  const canGenerate = selectedClothing !== null && selectedModel !== null;
  const canGenerateStyling = stylingClothing !== null && stylingModel !== null;

  return (
    <div className="flex h-screen bg-[#F9F9FB] font-sans text-sm overflow-hidden flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 shrink-0">
        <div className="font-semibold text-gray-900 flex items-center gap-2">
          {activeResource === 'history' ? (
            <>
              <History className="w-5 h-5 text-[#20B29A]" />
              Lịch sử AI
            </>
          ) : mainMode === 0 ? (
            <>
              <Shirt className="w-5 h-5 text-[#20B29A]" />
              Thử đồ AI
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-[#20B29A]" />
              Phối đồ với AI
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-600 hover:text-gray-900"
            aria-label="Về trang chủ"
            title="Về trang chủ"
          >
            <Home className="w-5 h-5" />
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </div>
      </div>

      {/* Sidebar - Desktop & Mobile overlay */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-gray-200 flex flex-col h-full transition-transform transform md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between md:block">
          <NavItem icon={Home} label="Trang chủ" onClick={() => navigateFromSidebar('/')} />
          <button className="md:hidden p-2 text-gray-400" onClick={() => setMobileMenuOpen(false)}>
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="mb-6">
            <h3 className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Tạo</h3>
            <NavItem icon={Shirt} label="Thử đồ AI" active={activeResource === 'create' && mainMode === 0} onClick={() => openCreateMode(0)} />
            <NavItem icon={Sparkles} label="Phối đồ với AI" active={activeResource === 'create' && mainMode === 1} onClick={() => openCreateMode(1)} />
            <NavItem icon={Wand2} label="Trình tạo mẫu AI" />
          </div>

          <div className="mb-6">
            <h3 className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Tài nguyên</h3>
            <NavItem icon={Library} label="Tủ đồ của tôi" />
            <NavItem icon={Users} label="Mẫu của tôi" />
            {mainMode === 1 && <NavItem icon={Palette} label="Bộ sưu tập" />}
            <NavItem icon={History} label="Lịch sử" active={activeResource === 'history'} onClick={openHistory} />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 space-y-1">
          <NavItem icon={UserCircle} label="Tài khoản của tôi" onClick={() => navigateFromSidebar('/profile')} />
          <NavItem 
            icon={CreditCard} 
            label="Gói của tôi" 
            onClick={() => navigateFromSidebar('/ai-packages')}
            badge={
              <span className="flex items-center gap-1 text-[10px] font-bold bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                Mua credit
              </span>
            } 
          />
          <NavItem icon={Settings2} label="Quản lý API" />
          <NavItem icon={HelpCircle} label="Hỗ trợ" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative h-full">
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {activeResource === 'history' ? (
          <AIHistoryView
            historyItems={historyItems}
            isLoading={isLoadingHistory}
            onRefresh={() => void loadHistory()}
          />
        ) : (
          <>

        {/* Configuration Panel */}
        <div className="w-full md:w-[360px] bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col shrink-0 relative z-10 shadow-none md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] h-auto md:h-full">
          {/* Mobile-like header back button (hidden on mobile) */}
          <div className="hidden md:flex items-center p-4 pb-2 text-gray-400">
            <ChevronLeft className="w-5 h-5 cursor-pointer hover:text-gray-700" />
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-[140px] pt-4 md:pt-0">
            {mainMode === 0 ? (
              <>
                {/* Thử đồ AI Mode */}
                {/* Section 1: Chọn quần áo */}
                <div className="mb-8">
                  <SectionHeading title="Chọn quần áo" />
                  <SegmentedControl
                    options={["Quần áo đơn", "Trên & dưới"]}
                    activeIndex={clothesTab}
                    onChange={setClothesTab}
                  />

                  <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center py-8 mb-6 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center justify-center text-[#20B29A] font-medium mb-1 gap-1">
                      <Plus className="w-5 h-5" /> Thêm item
                    </div>
                    <p className="text-xs text-gray-500">Hoặc kéo & thả vào đây</p>
                  </div>

                  <label className="border border-gray-200 rounded-xl bg-white flex flex-col items-center justify-center py-4 mb-6 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-center text-[#20B29A] font-medium mb-1 gap-1">
                      <Upload className="w-4 h-4" /> Upload ảnh mẫu lên Cloudinary
                    </div>
                    <p className="text-xs text-gray-500">{isUploadingModel ? 'Đang upload...' : 'Chọn ảnh người dùng để thử đồ'}</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => void handleUploadModelImage(event, 'try-on')}
                    />
                  </label>

                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Mục gần đây</h3>
                    <button className="text-xs font-medium text-[#20B29A] hover:underline">Xem tất cả</button>
                  </div>

                  <div className="flex overflow-x-auto gap-2 pb-2 -mx-1 px-1 scrollbar-hide">
                    {isLoadingProducts && (
                      <div className="text-xs text-gray-500 py-4">Đang tải sản phẩm...</div>
                    )}
                    {!isLoadingProducts && productChoices.length === 0 && (
                      <div className="text-xs text-gray-500 py-4">Chưa có sản phẩm có ảnh trong API.</div>
                    )}
                    {productChoices.map((product, i) => (
                      <button 
                        key={product.productId || product.id} 
                        onClick={() => setSelectedClothing(i)}
                        className={`relative w-14 h-[76px] flex-shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          selectedClothing === i 
                            ? 'border-[#20B29A] ring-2 ring-[#20B29A] ring-offset-1' 
                            : 'border-gray-200 hover:border-[#20B29A]'
                        }`}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={() => markBrokenImage(product.image)}
                        />
                        {selectedClothing === i && (
                          <div className="absolute top-1 right-1 bg-[#20B29A] rounded-full p-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] px-1 py-0.5 font-medium text-center">
                          {product.name}
                        </div>
                      </button>
                    ))}
                  </div>

                </div>

                <hr className="border-gray-100 mb-8" />

                {/* Section 2: Chọn một mẫu */}
                <div>
                  <SectionHeading title="Chọn một mẫu" />
                  <p className="text-xs text-gray-500 mb-4">Chọn mẫu của chúng tôi hoặc tải lên mẫu của bạn để thử</p>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1">
                      <SegmentedControl
                        options={["Mẫu của chúng tôi", "Mẫu của bạn"]}
                        activeIndex={modelTab}
                        onChange={setModelTab}
                      />
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 h-[34px] mb-4">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Tất cả
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <button className="border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center aspect-[3/4] bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">Tải lên</span>
                    </button>

                    <label className="border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center aspect-[3/4] bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">{isUploadingModel ? 'Đang tải' : 'Cloudinary'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleUploadModelImage(event, 'try-on')}
                      />
                    </label>

                    {modelTab === 1 && uploadedModelImages.length === 0 && (
                      <div className="col-span-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
                        Chưa có mẫu nào. Upload ảnh lên Cloudinary để lưu vào mẫu của tôi.
                      </div>
                    )}

                    {tryOnModelChoices.map((src, i) => {
                      const modelIndex = getModelChoiceIndex(i);

                      return (
                      <button
                        key={`${modelTab}-${src}-${i}`}
                        onClick={() => setSelectedModel(modelIndex)}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all border-2 ${
                          selectedModel === modelIndex
                            ? 'border-[#20B29A] ring-2 ring-[#20B29A] ring-offset-1'
                            : 'border-transparent hover:border-[#20B29A]'
                        }`}
                      >
                        <img src={src} alt="Model" className="w-full h-full object-cover" />
                        {selectedModel === modelIndex && (
                          <div className="absolute top-1 right-1 bg-[#20B29A] rounded-full p-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Phối đồ với AI Mode */}
                {/* Chọn sản phẩm từ tủ đồ */}
                <div className="mb-8">
                  <SectionHeading title="Chọn sản phẩm" />
                  <p className="text-xs text-gray-500 mb-4">Chọn sản phẩm bạn muốn phối đồ</p>

                  <div className="flex overflow-x-auto gap-2 pb-2 -mx-1 px-1 scrollbar-hide mb-4">
                    {isLoadingProducts && (
                      <div className="text-xs text-gray-500 py-4">Đang tải sản phẩm...</div>
                    )}
                    {!isLoadingProducts && stylingProductChoices.length === 0 && (
                      <div className="text-xs text-gray-500 py-4">Chưa có sản phẩm áo/quần có ảnh trong API.</div>
                    )}
                    {stylingProductChoices.map((product, i) => (
                      <button 
                        key={product.productId || product.id} 
                        onClick={() => setStylingClothing(i)}
                        className={`relative w-14 h-[76px] flex-shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          stylingClothing === i 
                            ? 'border-[#20B29A] ring-2 ring-[#20B29A] ring-offset-1' 
                            : 'border-gray-200 hover:border-[#20B29A]'
                        }`}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={() => markBrokenImage(product.image)}
                        />
                        {stylingClothing === i && (
                          <div className="absolute top-1 right-1 bg-[#20B29A] rounded-full p-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] px-1 py-0.5 font-medium text-center">
                          {product.name}
                        </div>
                      </button>
                    ))}
                  </div>

                </div>

                <hr className="border-gray-100 mb-8" />

                {/* Chọn người mẫu */}
                <div className="mb-8">
                  <SectionHeading title="Chọn người mẫu" />
                  <p className="text-xs text-gray-500 mb-4">Chọn người mẫu để xem gợi ý phối đồ</p>

                  <div className="grid grid-cols-4 gap-2">
                    <label className="border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center aspect-[3/4] bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">{isUploadingModel ? 'Đang tải' : 'Cloudinary'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleUploadModelImage(event, 'styling')}
                      />
                    </label>

                    {modelChoices.slice(0, 8).map((src, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setStylingModel(i);
                          if (i >= uploadedModelImages.length) {
                            setStylingModelGender("women");
                            setStylingClothing(null);
                          }
                        }}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all border-2 ${
                          stylingModel === i
                            ? 'border-[#20B29A] ring-2 ring-[#20B29A] ring-offset-1'
                            : 'border-transparent hover:border-[#20B29A]'
                        }`}
                      >
                        <img src={src} alt="Model" className="w-full h-full object-cover" />
                        {stylingModel === i && (
                          <div className="absolute top-1 right-1 bg-[#20B29A] rounded-full p-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <p className="mb-2 text-xs font-medium text-gray-600">Phối theo giới tính mẫu</p>
                    <div className="grid grid-cols-3 gap-1 rounded-md bg-white p-1">
                      {[
                        { label: 'Nam', value: 'men' },
                        { label: 'Nữ', value: 'women' },
                        { label: 'Unisex', value: 'unisex' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setStylingModelGender(option.value as Product["gender"]);
                            setStylingClothing(null);
                          }}
                          className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                            stylingModelGender === option.value
                              ? 'bg-[#20B29A] text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100 mb-8" />

                {/* Tủ đồ hiện tại */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Tủ đồ hiện tại</h2>
                    <button className="text-xs font-medium text-[#20B29A] hover:underline flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      Thêm mới
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {CLOTHING_CATEGORIES.map((category, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200">
                        <category.icon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <p className="text-xs font-medium text-gray-900 mb-0.5">{category.name}</p>
                        <p className="text-[10px] text-gray-500">{category.items} items</p>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="border-gray-100 mb-8" />

                {/* Điều kiện thời tiết */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Thời tiết hôm nay</h2>
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {WEATHER_CONDITIONS.map((weather, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedWeather(idx)}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          selectedWeather === idx
                            ? 'border-[#20B29A] bg-[#20B29A]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <weather.icon className={`w-6 h-6 ${selectedWeather === idx ? 'text-[#20B29A]' : 'text-gray-500'}`} />
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-900">{weather.label}</p>
                          <p className="text-[10px] text-gray-500">{weather.temp}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-gray-100 mb-8" />

                {/* Dịp sự kiện */}
                <div className="mb-8">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Dịp sự kiện</h2>

                  <div className="space-y-2">
                    {['Đi làm', 'Đi chơi', 'Dự tiệc', 'Du lịch', 'Thể thao'].map((occasion) => (
                      <button
                        key={occasion}
                        onClick={() => setSelectedOccasion(occasion)}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                          selectedOccasion === occasion
                            ? 'bg-[#20B29A] text-white shadow-sm'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {occasion}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-gray-100 mb-8" />

                {/* Phong cách yêu thích */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Phong cách yêu thích</h2>
                    <button className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <Settings2 className="w-3.5 h-3.5" />
                      Tùy chỉnh
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['Hiện đại', 'Cổ điển', 'Tối giản', 'Năng động', 'Sang trọng'].map((style) => (
                      <button
                        key={style}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-full transition-colors"
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        {/* Bottom Sticky Action Area */}
        <div className="sticky bottom-0 md:absolute md:bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 md:p-5 z-20">
          {mainMode === 0 ? (
            <>
              {/* Selection Status */}
              {!canGenerate && (
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 text-center">
                    {selectedClothing === null && selectedModel === null && '⚠️ Vui lòng chọn quần áo và người mẫu'}
                    {selectedClothing !== null && selectedModel === null && '⚠️ Vui lòng chọn người mẫu'}
                    {selectedClothing === null && selectedModel !== null && '⚠️ Vui lòng chọn quần áo'}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-2">
                  {/* Custom Toggle Switch */}
                  <button
                    onClick={() => setHighQuality(!highQuality)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${highQuality ? 'bg-[#20B29A]' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${highQuality ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm font-medium text-gray-800">Chế độ chất lượng cao</span>
                  <span className="text-[10px] font-bold text-white bg-blue-500 rounded-full px-1.5 py-0.5 leading-none">HD</span>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
                className={`w-full font-medium rounded-xl py-3.5 flex items-center justify-center relative transition-colors shadow-sm ${
                  canGenerate 
                    ? 'bg-[#20B29A] hover:bg-[#1a9682] text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } ${isGenerating ? 'opacity-75' : ''}`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <span>Tạo</span>
                    {canGenerate && (
                      <span className="absolute right-4 text-xs font-semibold bg-white/20 px-2 py-1 rounded-md">Nhanh - 1 credit</span>
                    )}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Selection Status for Styling */}
              {!canGenerateStyling && (
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 text-center">
                    {stylingClothing === null && stylingModel === null && '⚠️ Vui lòng chọn sản phẩm và người mẫu'}
                    {stylingClothing !== null && stylingModel === null && '⚠️ Vui lòng chọn người mẫu'}
                    {stylingClothing === null && stylingModel !== null && '⚠️ Vui lòng chọn sản phẩm'}
                  </p>
                </div>
              )}

              <button
                onClick={handleGenerateStyling}
                disabled={isGeneratingStyling || !canGenerateStyling}
                className={`w-full font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors shadow-sm ${
                  canGenerateStyling
                    ? 'bg-[#20B29A] hover:bg-[#1a9682] text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } ${isGeneratingStyling ? 'opacity-75' : ''}`}
              >
                {isGeneratingStyling ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang tạo gợi ý...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Tạo gợi ý phối đồ</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      {mainMode === 0 ? (
        <div className="w-full md:flex-1 flex items-center justify-center p-4 md:p-8 bg-[#F9F9FB] relative min-h-[500px] md:h-full">
          {!generatedResult ? (
            <div className="bg-white rounded-2xl shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] p-6 md:p-10 w-full max-w-[800px] flex flex-col md:flex-row items-center gap-8 md:gap-10">
              {/* Illustration Side */}
              <div className="w-full md:flex-1 relative flex items-center justify-center h-[250px] md:h-[300px]">
                {/* Mocking the graphic with composed elements */}
                <div className="relative w-full h-full max-w-[280px]">
                  {/* Back model shadow/outline */}
                  <div className="absolute right-0 bottom-0 w-[140px] h-[220px] rounded-t-full bg-blue-50 overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1663248473494-44e1908f52c2?auto=format&fit=crop&q=80&w=300&h=400" className="w-full h-full object-cover object-top opacity-50 grayscale" alt="Silhouette" />
                  </div>
                  {/* Front colored model */}
                  <div className="absolute left-10 bottom-0 w-[160px] h-[260px] rounded-t-[80px] overflow-hidden shadow-lg border-4 border-white z-10 bg-white">
                    <img src="https://images.unsplash.com/photo-1658860547138-1e28dfb90867?auto=format&fit=crop&q=80&w=300&h=500" className="w-full h-full object-cover object-top" alt="Final Model" />
                  </div>
                  {/* Floating Clothing Item */}
                  <div className="absolute left-0 top-10 w-24 h-28 bg-white rounded-xl shadow-xl border border-indigo-100 p-2 z-20 transform -rotate-6">
                    <div className="w-full h-full rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center relative">
                      <img src={tshirtProduct} alt="Clothes" className="w-full h-full object-cover" />
                      <div className="absolute -right-2 -top-2 bg-indigo-500 rounded-full p-1 text-white shadow-sm">
                        <Plus className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  {/* Arrow */}
                  <svg className="absolute top-1/2 left-[40%] w-16 h-8 text-[#20B29A] z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>

              {/* Text Steps Side */}
              <div className="flex-1 space-y-8">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-base">Chọn quần áo</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Chọn quần áo bạn muốn thử, vui lòng làm theo hướng dẫn</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-base">Chọn hoặc tải lên mẫu</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Chọn mẫu hoặc tải lên mẫu của bạn để thử!</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-base">Thử ngay!</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Nhấp vào 'Tạo' để xem bộ đồ trở nên sống động trên mẫu!</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Result View */
            <div className="w-full max-w-[900px]">
              <div className="bg-white rounded-2xl shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Kết quả thử đồ AI</h3>
                    <p className="text-sm text-gray-500">Đã tạo thành công với {highQuality ? 'chất lượng HD' : 'chất lượng chuẩn'}</p>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Tạo mới
                  </button>
                </div>

                {/* Image Result */}
                <div className="relative bg-gray-50">
                  <img 
                    src={generatedResult} 
                    alt="AI Generated Result" 
                    className="w-full h-auto object-contain max-h-[600px] mx-auto"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
                    <span className="text-xs font-semibold text-gray-900">AI Generated</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100">
                  <div className="flex flex-col md:flex-row gap-3">
                    <button className="flex-1 bg-[#20B29A] hover:bg-[#1a9682] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                      <Download className="w-5 h-5" />
                      Tải xuống
                    </button>
                    <button className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-gray-200 transition-colors">
                      <Share2 className="w-5 h-5" />
                      Chia sẻ
                    </button>
                    <button className="md:w-auto px-6 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 border border-gray-200 transition-colors">
                      <Plus className="w-5 h-5" />
                      Lưu vào bộ sưu tập
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Below */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <button className="bg-white hover:bg-gray-50 p-4 rounded-xl border border-gray-200 text-center transition-colors">
                  <div className="text-2xl mb-2">✨</div>
                  <p className="text-xs font-medium text-gray-900">Thử trang phục khác</p>
                </button>
                <button className="bg-white hover:bg-gray-50 p-4 rounded-xl border border-gray-200 text-center transition-colors">
                  <div className="text-2xl mb-2">👥</div>
                  <p className="text-xs font-medium text-gray-900">Đổi mẫu</p>
                </button>
                <button className="bg-white hover:bg-gray-50 p-4 rounded-xl border border-gray-200 text-center transition-colors">
                  <div className="text-2xl mb-2">🎨</div>
                  <p className="text-xs font-medium text-gray-900">Chỉnh sửa</p>
                </button>
                <button className="bg-white hover:bg-gray-50 p-4 rounded-xl border border-gray-200 text-center transition-colors">
                  <div className="text-2xl mb-2">📸</div>
                  <p className="text-xs font-medium text-gray-900">Tạo biến thể</p>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F9F9FB]">
          {!stylingResult ? (
            <div className="max-w-[1200px] mx-auto">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">Gợi ý phối đồ AI</h1>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <TrendingUp className="w-4 h-4" />
                    Xu hướng
                  </button>
                </div>
                <p className="text-sm text-gray-600">Dựa trên thời tiết, dịp sự kiện và phong cách của bạn</p>
              </div>

              {/* Style Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {STYLE_SUGGESTIONS.map((style) => (
                  <div key={style.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-gray-100">
                    <div className="aspect-[3/4] relative overflow-hidden bg-gray-100">
                      <img
                        src={style.image}
                        alt={style.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3">
                        <button className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm">
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-base">{style.name}</h3>
                        <div className="flex gap-1">
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">{style.season}</span>
                          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md font-medium">{style.occasion}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">Gồm có:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {style.items.map((item, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="flex-1 bg-[#20B29A] hover:bg-[#1a9682] text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                          Thử ngay
                        </button>
                        <button className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              <div className="mt-8 text-center">
                <button className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Xem thêm gợi ý
                </button>
              </div>
            </div>
          ) : (
            /* Styling Result View */
            <div className="w-full max-w-[900px] mx-auto">
              <div className="bg-white rounded-2xl shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Gợi ý phối đồ AI</h3>
                    <p className="text-sm text-gray-500">Dựa trên sản phẩm và phong cách bạn chọn</p>
                  </div>
                  <button 
                    onClick={handleResetStyling}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Tạo mới
                  </button>
                </div>

                {/* Image Result */}
                <div className="relative bg-gray-50">
                  <img 
                    src={stylingResult} 
                    alt="AI Styling Suggestion" 
                    className="w-full h-auto object-contain max-h-[600px] mx-auto"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
                    <span className="text-xs font-semibold text-gray-900">AI Styled</span>
                  </div>
                  
                  {/* Outfit Details Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Chi tiết outfit</h4>
                    <div className="flex flex-wrap gap-2">
                      {stylingOutfit?.top && (
                        <span className="text-xs px-2 py-1 bg-[#20B29A]/10 text-[#20B29A] rounded-md font-medium">
                          {stylingOutfit.top.name}
                        </span>
                      )}
                      {stylingOutfit?.bottom && (
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                          {stylingOutfit.bottom.name}
                        </span>
                      )}
                    </div>
                    </div>
                  </div>

                {/* Action Buttons */}
                <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100">
                  <div className="flex flex-col md:flex-row gap-3">
                    <button className="flex-1 bg-[#20B29A] hover:bg-[#1a9682] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                      <Download className="w-5 h-5" />
                      Tải xuống
                    </button>
                    <button className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-gray-200 transition-colors">
                      <Share2 className="w-5 h-5" />
                      Chia sẻ
                    </button>
                    <button className="md:w-auto px-6 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 border border-gray-200 transition-colors">
                      <Plus className="w-5 h-5" />
                      Lưu vào bộ sưu tập
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Suggestions */}
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Gợi ý khác</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STYLE_SUGGESTIONS.slice(0, 3).map((style) => (
                    <div key={style.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-all cursor-pointer">
                      <div className="aspect-[3/4] relative">
                        <img src={style.image} alt={style.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium text-gray-900 mb-1">{style.name}</p>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">{style.occasion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
          </>
        )}
    </div>

    {/* Plan Modal */}
    {isPlanModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-[#222222] text-white rounded-2xl w-full max-w-[840px] shadow-2xl relative border border-[#333333]">
          {/* Close button */}
          <button 
            onClick={() => setIsPlanModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            <h2 className="text-2xl font-bold mb-2">Sẵn sàng trải nghiệm AI Premium?</h2>
            <p className="text-gray-400 text-[15px] mb-8">Nâng cấp lên Professional để mở khóa toàn bộ tính năng và sáng tạo không giới hạn.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              {/* Divider */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#333333] -translate-x-1/2"></div>

              {/* Left Column: Starter */}
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold">Starter</h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-500 text-gray-300">Gói hiện tại</span>
                </div>
                <p className="text-[#a3a3a3] text-sm mb-12">Tốt nhất cho những ai muốn dùng thử nghiệm ứng dụng AI</p>

                <div className="mt-auto">
                  <p className="font-medium text-[15px] mb-4 pb-4 border-b border-[#333333]">Miễn phí, nhưng giới hạn tính năng</p>
                  
                  <ul className="space-y-4 text-sm text-[#d4d4d4]">
                    <li className="flex items-start gap-3 opacity-80">
                      <X className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      <span>Không thể tải ảnh chất lượng siêu cao (HD)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                      <span>3 lượt thử đồ AI mỗi ngày</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                      <span>Tải lên tối đa 1 người mẫu cá nhân</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Professional */}
              <div className="flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Professional</h3>
                <p className="text-[#a3a3a3] text-sm mb-8">Tốt nhất cho nhà sáng tạo và người dùng thường xuyên</p>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center pb-4 border-b border-[#333333]">
                    <div>
                      <span className="font-medium block mb-2 text-[15px]">Full</span>
                      <div className="flex items-center gap-1.5">
                        <div className="bg-[#8b5cf6] p-1 rounded-sm"><MonitorPlay className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#f97316] p-1 rounded-sm"><Box className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#22c55e] p-1 rounded-sm"><Code className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#a855f7] p-1 rounded-sm"><Layers className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#3b82f6] p-1 rounded-sm"><Globe className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#0ea5e9] p-1 rounded-sm"><Users2 className="w-3 h-3 text-white" /></div>
                      </div>
                    </div>
                    <span className="font-bold text-lg">199.000đ<span className="text-[#a3a3a3] text-sm font-normal">/tháng</span></span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-[#333333]">
                    <div>
                      <span className="font-medium block mb-2 text-[15px]">Dev</span>
                      <div className="flex items-center gap-1.5">
                        <div className="bg-[#8b5cf6] p-1 rounded-sm"><MonitorPlay className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#f97316] p-1 rounded-sm"><Box className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#22c55e] p-1 rounded-sm"><Code className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#a855f7] p-1 rounded-sm"><Layers className="w-3 h-3 text-white" /></div>
                      </div>
                    </div>
                    <span className="font-bold text-lg">149.000đ<span className="text-[#a3a3a3] text-sm font-normal">/tháng</span></span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-[#333333]">
                    <div>
                      <span className="font-medium block mb-2 text-[15px]">Collab</span>
                      <div className="flex items-center gap-1.5">
                        <div className="bg-[#8b5cf6] p-1 rounded-sm"><MonitorPlay className="w-3 h-3 text-white" /></div>
                        <div className="bg-[#f97316] p-1 rounded-sm"><Box className="w-3 h-3 text-white" /></div>
                      </div>
                    </div>
                    <span className="font-bold text-lg">49.000đ<span className="text-[#a3a3a3] text-sm font-normal">/tháng</span></span>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-[#d4d4d4] mb-6">
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <span className="font-medium text-white">Lưu và tải hình ảnh độ phân giải siêu cao (HD)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <span className="font-medium text-white">Không giới hạn số lượt tạo ảnh và thử đồ AI</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <span className="font-medium text-white">Quản lý không giới hạn người mẫu cá nhân</span>
                  </li>
                </ul>

                <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 mb-8 w-fit transition-colors">
                  Xem tất cả tính năng <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button className="w-full bg-white hover:bg-gray-100 text-black font-semibold py-3 rounded-lg transition-colors mt-auto">
                  Nâng cấp lên Professional
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
