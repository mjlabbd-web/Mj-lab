export type PreviewVariant =
  | 'ecommerce'
  | 'business'
  | 'mobile-app'
  | 'booking'
  | 'restaurant'
  | 'custom-code';

export interface Category {
  id: string;
  name: string;
  slug: 'website' | 'ecommerce' | 'app' | string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  oldPrice: number;
  newPrice: number;
  stock: number;
  imageUrl: string;
  demoUrl?: string;
  previewVariant: PreviewVariant;
  year: string;
  deliveryTime: string;
  stack: string[];
  summary: string;
  description: string;
  features: string[];
  featuredOnHome: boolean;
  createdAt: string;
}

export type OrderStatus = 'completed' | 'processing' | 'pending';

export interface Order {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productImage: string;
  customerName: string;
  customerPhone: string;
  quantity: number;
  amount: number;
  dateLabel: string;
  createdAt: string;
  status: OrderStatus;
}

export interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface SalesPoint {
  label: string;
  sales: number;
  revenue: number;
}

export interface SiteSettings {
  brandName: string;
  logoUrl: string;
  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  bannerImageUrl: string;
  whatsappNumber: string;
  displayPhone: string;
  locationText: string;
  footerCopyright: string;
  footerBadge: string;
  statsRating: number;
  statsVisitors: number;
  statsTotalSell: number;
  statsMusicVideos: number;
  globalDiscountPercent: number;
}

export interface PublicStoreState {
  products: Product[];
  categories: Category[];
  siteSettings: SiteSettings;
  reviews: ReviewItem[];
  updatedAt: string;
}

export interface FullStoreState extends PublicStoreState {
  orders: Order[];
  salesSeries: {
    daily: SalesPoint[];
    monthly: SalesPoint[];
    yearly: SalesPoint[];
  };
}

export const DEFAULT_CATEGORIES: Category[] = [
  {id: 'cat-ecommerce', name: 'ই-কমার্স', slug: 'ecommerce'},
  {id: 'cat-website', name: 'ওয়েবসাইট', slug: 'website'},
  {id: 'cat-app', name: 'অ্যাপ ও কোড', slug: 'app'},
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brandName: 'পার্সোনা',
  logoUrl: '',
  heroEyebrow: 'হ্যালো, আমার নাম',
  heroTitleLine1: 'মোঃ মোমিন',
  heroTitleLine2: 'ইসলাম',
  heroSubtitle: 'আমি একজন ওয়েবসাইট ও অ্যাপ ডেভেলপার',
  bannerImageUrl: '/assets/aistudio/file_000000000f24820899c550a2115ccca0_a16ac199.png',
  whatsappNumber: '8801923948150',
  displayPhone: '+880 1923-948150',
  locationText: 'পল্লীবিদ্যুৎ সরকারবাড়ি বাজার',
  footerCopyright: '© ২০২৫ মোঃ মোমিন ইসলাম। সর্বস্বত্ব সংরক্ষিত।',
  footerBadge: 'বাংলাদেশে তৈরি ❤️',
  statsRating: 4.7,
  statsVisitors: 1362,
  statsTotalSell: 176,
  statsMusicVideos: 400,
  globalDiscountPercent: 0,
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'ecommerce-store',
    code: '০১',
    name: 'ই-কমার্স স্টোর',
    categoryId: 'cat-ecommerce',
    categoryName: 'ই-কমার্স',
    categorySlug: 'ecommerce',
    oldPrice: 12500,
    newPrice: 8500,
    stock: 15,
    imageUrl: '',
    previewVariant: 'ecommerce',
    year: 'অনলাইন শপ',
    deliveryTime: '২ দিনে ডেলিভারি',
    stack: ['রিয়েক্ট', 'নোড.জেএস', 'টেলউইন্ড'],
    summary: 'অনলাইন শপের জন্য দ্রুতগতির প্রোডাক্ট ক্যাটালগ, কার্ট এবং অর্ডার ম্যানেজমেন্ট।',
    description:
      'যেকোনো অনলাইন ব্যবসার জন্য সম্পূর্ণ মোবাইল-ফ্রেন্ডলি ই-কমার্স ওয়েবসাইট। সহজ প্রোডাক্ট ফিল্টারিং, কার্ট এবং সরাসরি অর্ডার সুবিধা।',
    features: [
      'রেসপন্সিভ প্রোডাক্ট গ্যালারি ও ক্যাটাগরি ফিল্টার',
      'সহজ চেকআউট ও হোয়াটসঅ্যাপ অর্ডার সুবিধা',
      'অ্যাডমিন প্যানেল থেকে স্টক ও অর্ডার নিয়ন্ত্রণ',
    ],
    featuredOnHome: true,
    createdAt: '2025-11-01T10:00:00.000Z',
  },
  {
    id: 'business-agency-web',
    code: '০২',
    name: 'বিজনেস ওয়েবসাইট',
    categoryId: 'cat-website',
    categoryName: 'ওয়েবসাইট',
    categorySlug: 'website',
    oldPrice: 8000,
    newPrice: 5500,
    stock: 20,
    imageUrl: '',
    previewVariant: 'business',
    year: 'ল্যান্ডিং পেজ',
    deliveryTime: '২ দিনে ডেলিভারি',
    stack: ['এইচটিএমএল৫', 'সিএসএস৩', 'রিয়েক্ট'],
    summary: 'ব্র্যান্ড ও কোম্পানির জন্য দ্রুতগতির এবং SEO-বান্ধব ওয়েবসাইট।',
    description:
      'আধুনিক ডিজাইন ও দ্রুত লোডিং স্পিডসহ তৈরি বিজনেস ওয়েবসাইট, যা ভিজিটরকে সরাসরি ক্লায়েন্টে রূপান্তর করে।',
    features: [
      'মোবাইল ও ডেস্কটপের জন্য সম্পূর্ণ রেসপন্সিভ ডিজাইন',
      'সার্চ ইঞ্জিন ফ্রেন্ডলি ও দ্রুতগতির পারফরম্যান্স',
      'সরাসরি হোয়াটসঅ্যাপ ও অর্ডার ইন্টিগ্রেশন',
    ],
    featuredOnHome: true,
    createdAt: '2025-11-03T10:00:00.000Z',
  },
  {
    id: 'mobile-app-dashboard',
    code: '০৩',
    name: 'অ্যাপ ও ওয়েব পোর্টাল',
    categoryId: 'cat-app',
    categoryName: 'অ্যাপ ও কোড',
    categorySlug: 'app',
    oldPrice: 18000,
    newPrice: 13500,
    stock: 10,
    imageUrl: '',
    previewVariant: 'mobile-app',
    year: 'ফুল-স্ট্যাক',
    deliveryTime: 'কাস্টম সময়',
    stack: ['রিয়েক্ট নেটিভ', 'টাইপস্ক্রিপ্ট', 'এপিআই'],
    summary: 'ব্যবসা পরিচালনা ও রিয়েলটাইম অ্যানালিটিক্সের জন্য মোবাইল ও ওয়েব অ্যাপ।',
    description:
      'দৈনিক বিক্রয়, কাস্টমার অর্ডার ট্র্যাকিং এবং মোবাইল-ওয়েব সিঙ্ক করার জন্য সম্পূর্ণ কাস্টম অ্যাপ সলিউশন।',
    features: [
      'মোবাইল ও ওয়েব প্ল্যাটফর্মে রিয়েলটাইম ডেটা সিঙ্ক',
      'দৈনিক বিক্রয় ও অর্ডার স্ট্যাটাস ড্যাশবোর্ড',
      'নিয়মিত মেইনটেন্যান্স ও টেকনিক্যাল সাপোর্ট',
    ],
    featuredOnHome: true,
    createdAt: '2025-11-05T10:00:00.000Z',
  },
  {
    id: 'restaurant-order-web',
    code: '০৪',
    name: 'রেস্টুরেন্ট অর্ডার ওয়েব',
    categoryId: 'cat-website',
    categoryName: 'ওয়েবসাইট',
    categorySlug: 'website',
    oldPrice: 7500,
    newPrice: 4990,
    stock: 18,
    imageUrl: '',
    previewVariant: 'restaurant',
    year: 'ফুড মেনু',
    deliveryTime: '২ দিনে ডেলিভারি',
    stack: ['রিয়েক্ট', 'টেলউইন্ড', 'নোড.জেএস'],
    summary: 'রেস্টুরেন্টের জন্য ডিজিটাল মেনু এবং দ্রুত হোম ডেলিভারি অর্ডার সিস্টেম।',
    description:
      'মোবাইল থেকেই খাবার সিলেক্ট করে এক ক্লিকে অর্ডার পাঠানোর আধুনিক রেস্টুরেন্ট ওয়েব অ্যাপ্লিকেশন।',
    features: [
      'ক্যাটাগরি অনুযায়ী লাইভ ডিজিটাল মেনু',
      'এক ক্লিকে হোয়াটসঅ্যাপে অর্ডার পাঠানো',
      'স্পেশাল অফার ও ডেলিভারি টাইম প্রদর্শন',
    ],
    featuredOnHome: false,
    createdAt: '2025-11-08T10:00:00.000Z',
  },
  {
    id: 'custom-coding-suite',
    code: '০৫',
    name: 'কাস্টম কোড ও এপিআই',
    categoryId: 'cat-app',
    categoryName: 'অ্যাপ ও কোড',
    categorySlug: 'app',
    oldPrice: 9500,
    newPrice: 6800,
    stock: 12,
    imageUrl: '',
    previewVariant: 'custom-code',
    year: 'ব্যাকএন্ড',
    deliveryTime: 'ফ্লেক্সিবল',
    stack: ['টাইপস্ক্রিপ্ট', 'নোড.জেএস', 'এপিআই'],
    summary: 'কাস্টম সফটওয়্যার, ওয়েবসাইট স্পিড অপ্টিমাইজেশন ও এপিআই ইন্টিগ্রেশন।',
    description:
      'আপনার বিদ্যমান ওয়েবসাইট বা সফটওয়্যারে নতুন ফিচার যোগ, বাগ ফিক্স এবং পেমেন্ট গেটওয়ে ইন্টিগ্রেশন।',
    features: [
      'কাস্টম এপিআই ও ওয়েব-হুক অটোমেশন',
      'ওয়েবসাইটের গতি ও সিকিউরিটি আপগ্রেড',
      'দীর্ঘমেয়াদী মেইনটেন্যান্স ও ব্যাকআপ সুবিধা',
    ],
    featuredOnHome: false,
    createdAt: '2025-11-11T10:00:00.000Z',
  },
  {
    id: 'fashion-retail-hub',
    code: '০৬',
    name: 'ফ্যাশন শপ স্টোর',
    categoryId: 'cat-ecommerce',
    categoryName: 'ই-কমার্স',
    categorySlug: 'ecommerce',
    oldPrice: 11000,
    newPrice: 7900,
    stock: 25,
    imageUrl: '',
    previewVariant: 'booking',
    year: 'রিটেইল',
    deliveryTime: '২ দিনে ডেলিভারি',
    stack: ['রিয়েক্ট', 'এক্সপ্রেস', 'টেলউইন্ড'],
    summary: 'পোশাক ও লাইফস্টাইল ব্র্যান্ডের জন্য সাইজ-কালার অপশনসহ অনলাইন শপ।',
    description:
      'ফ্যাশন ব্যবসার জন্য আকর্ষণীয় কালেকশন পেজ, সাইজ ও কালার সিলেকশন এবং দ্রুত চেকআউট সিস্টেম।',
    features: [
      'সাইজ ও কালার ভ্যারিয়েন্ট নির্বাচন সুবিধা',
      'ডেলিভারি চার্জ ও ইনভয়েস ক্যালকুলেশন',
      'অর্ডার কনফার্মেশন ও স্টক ম্যানেজমেন্ট',
    ],
    featuredOnHome: false,
    createdAt: '2025-11-15T10:00:00.000Z',
  },
];

export const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: '#১০০১',
    productId: 'ecommerce-store',
    productName: 'ই-কমার্স স্টোর',
    productImage: '',
    customerName: 'রাহিম ইসলাম',
    customerPhone: '+8801712345678',
    quantity: 1,
    amount: 499,
    dateLabel: 'আজ',
    createdAt: '2025-11-25T10:30:00.000Z',
    status: 'completed',
  },
  {
    id: 'ord-1002',
    orderNumber: '#১০০২',
    productId: 'business-agency-web',
    productName: 'বিজনেস ওয়েবসাইট',
    productImage: '',
    customerName: 'করিম আহমেদ',
    customerPhone: '+8801812345679',
    quantity: 2,
    amount: 998,
    dateLabel: 'আজ',
    createdAt: '2025-11-25T09:15:00.000Z',
    status: 'processing',
  },
  {
    id: 'ord-1003',
    orderNumber: '#১০০৩',
    productId: 'mobile-app-dashboard',
    productName: 'অ্যাপ ও ওয়েব পোর্টাল',
    productImage: '',
    customerName: 'নাসিম উদ্দিন',
    customerPhone: '+8801912345680',
    quantity: 1,
    amount: 1299,
    dateLabel: 'আজ',
    createdAt: '2025-11-25T08:05:00.000Z',
    status: 'pending',
  },
];

export const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    author: 'সাকিব মাহমুদ',
    rating: 5,
    comment: 'খুব দ্রুত ও সুন্দরভাবে আমাদের ই-কমার্স ওয়েবসাইটটি ডেলিভারি দিয়েছেন।',
    date: '২৪ নভেম্বর, ২০২৫',
  },
  {
    id: 'rev-2',
    author: 'তানভীর হাসান',
    rating: 4.7,
    comment: 'ডিজাইন এবং মোবাইল রেসপন্সিভনেস অসাধারণ হয়েছে।',
    date: '২২ নভেম্বর, ২০২৫',
  },
  {
    id: 'rev-3',
    author: 'নুসরাত জাহান',
    rating: 4.5,
    comment: 'সাপোর্ট খুব ভালো, যেকোনো পরিবর্তনে সাথে সাথে সাহায্য করেন।',
    date: '১৯ নভেম্বর, ২০২৫',
  },
];

export const DEFAULT_SALES_SERIES = {
  daily: [
    {label: '১ নভে', sales: 68, revenue: 14200},
    {label: '৩ নভে', sales: 92, revenue: 19400},
    {label: '৫ নভে', sales: 54, revenue: 11800},
    {label: '৭ নভে', sales: 72, revenue: 15600},
    {label: '৯ নভে', sales: 98, revenue: 21500},
    {label: '১২ নভে', sales: 52, revenue: 11200},
    {label: '১৪ নভে', sales: 102, revenue: 22900},
    {label: '১৭ নভে', sales: 152, revenue: 34800},
    {label: '২০ নভে', sales: 104, revenue: 23400},
    {label: '২৩ নভে', sales: 122, revenue: 27900},
    {label: '২৬ নভে', sales: 176, revenue: 42500},
    {label: '৩০ নভে', sales: 168, revenue: 39800},
  ],
  monthly: [
    {label: 'জানু', sales: 95, revenue: 28500},
    {label: 'ফেব্রু', sales: 112, revenue: 34200},
    {label: 'মার্চ', sales: 128, revenue: 39800},
    {label: 'এপ্রিল', sales: 119, revenue: 36400},
    {label: 'মে', sales: 144, revenue: 45200},
    {label: 'জুন', sales: 158, revenue: 49600},
    {label: 'জুলাই', sales: 149, revenue: 47100},
    {label: 'আগস্ট', sales: 165, revenue: 52400},
    {label: 'সেপ্টে', sales: 154, revenue: 48900},
    {label: 'অক্টো', sales: 169, revenue: 54600},
    {label: 'নভে', sales: 176, revenue: 58900},
  ],
  yearly: [
    {label: '২০২১', sales: 420, revenue: 145000},
    {label: '২০২২', sales: 680, revenue: 238000},
    {label: '২০২৩', sales: 940, revenue: 342000},
    {label: '২০২৪', sales: 1280, revenue: 485000},
    {label: '২০২৫', sales: 1640, revenue: 642000},
  ],
};

export const DEFAULT_FULL_STORE: FullStoreState = {
  products: DEFAULT_PRODUCTS,
  categories: DEFAULT_CATEGORIES,
  siteSettings: DEFAULT_SITE_SETTINGS,
  reviews: DEFAULT_REVIEWS,
  orders: DEFAULT_ORDERS,
  salesSeries: DEFAULT_SALES_SERIES,
  updatedAt: new Date().toISOString(),
};
