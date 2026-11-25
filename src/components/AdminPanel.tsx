import {ChangeEvent, FormEvent, useCallback, useEffect, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  CheckCircle2,
  Crown,
  Edit3,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Play,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  Category,
  FullStoreState,
  OrderStatus,
  PreviewVariant,
  Product,
  SiteSettings,
} from '../types/store';
import {initSupabaseClient} from '../lib/supabaseClient';
import {SalesChart} from './SalesChart';

type AdminTab =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'banner'
  | 'settings'
  | 'logo'
  | 'pricing'
  | 'users'
  | 'reviews'
  | 'videos'
  | 'support';

interface AdminStateResponse extends FullStoreState {
  summary: {
    totalProducts: number;
    totalOrders: number;
    totalVisitors: number;
    totalSell: number;
    totalRevenue: number;
    rating: number;
  };
  supabaseStatus: {
    urlConfigured: boolean;
    anonKeyConfigured: boolean;
    serviceRoleConfigured: boolean;
    connected: boolean;
  };
}

interface AdminPanelProps {
  onBackToUserPanel: () => void;
}

const PREVIEW_VARIANTS: {value: PreviewVariant; label: string}[] = [
  {value: 'ecommerce', label: 'E-Commerce UI'},
  {value: 'business', label: 'Business Web UI'},
  {value: 'mobile-app', label: 'Mobile App UI'},
  {value: 'booking', label: 'Fashion Shop UI'},
  {value: 'restaurant', label: 'Restaurant Menu UI'},
  {value: 'custom-code', label: 'Custom Code UI'},
];

export function AdminPanel({onBackToUserPanel}: AdminPanelProps) {
  // Auth state held strictly in React memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Admin state
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState<AdminStateResponse | null>(null);
  const [reportRange, setReportRange] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [globalSearch, setGlobalSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Product Manager states
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodOldPrice, setProdOldPrice] = useState('');
  const [prodNewPrice, setProdNewPrice] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodVariant, setProdVariant] = useState<PreviewVariant>('ecommerce');
  const [prodDelivery, setProdDelivery] = useState('2 Days Delivery');
  const [prodSummary, setProdSummary] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Quick Logo & Banner state
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);
  const [discountInput, setDiscountInput] = useState('0');

  // Review Form
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth-status');
        if (res.ok) {
          const data = (await res.json()) as {needsSetup: boolean};
          setNeedsSetup(data.needsSetup);
        }
      } catch {
        // Ignore
      } finally {
        setAuthChecked(true);
      }
    };
    void checkAuth();
  }, []);

  const fetchAdminState = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/state', {
        headers: {Authorization: `Bearer ${authToken}`},
      });
      if (res.status === 401) {
        setToken(null);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as AdminStateResponse;
        setAdminData(data);
        setSettingsForm(data.siteSettings);
        setLogoPreviewUrl(data.siteSettings.logoUrl);
        setBannerPreviewUrl(data.siteSettings.bannerImageUrl);
        setDiscountInput(String(data.siteSettings.globalDiscountPercent || 0));
        if (!prodCategoryId && data.categories.length > 0) {
          setProdCategoryId(data.categories[0].id);
        }
      }
    } catch {
      // Ignore
    }
  }, [prodCategoryId]);

  useEffect(() => {
    if (!token) return;
    void fetchAdminState(token);

    // 1. Express WebSocket listener (Node server)
    let socket: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {type?: string};
          if (msg.type === 'admin:refresh') {
            void fetchAdminState(token);
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore on serverless Workers
    }

    // 2. Supabase Realtime listener (works on both Node and Cloudflare Workers)
    let active = true;
    let activeChannel: ReturnType<
      NonNullable<Awaited<ReturnType<typeof initSupabaseClient>>>['channel']
    > | null = null;
    let supabaseRef: Awaited<ReturnType<typeof initSupabaseClient>> = null;

    void initSupabaseClient().then((supabase) => {
      if (!active || !supabase) return;
      supabaseRef = supabase;
      activeChannel = supabase
        .channel('persona-admin-realtime')
        .on('broadcast', {event: 'store_sync'}, () => {
          void fetchAdminState(token);
        })
        .subscribe();
    });

    return () => {
      active = false;
      if (socket) socket.close();
      if (supabaseRef && activeChannel) {
        void supabaseRef.removeChannel(activeChannel);
      }
    };
  }, [token, fetchAdminState]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint = needsSetup ? '/api/admin/claim' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password: passwordInput}),
      });
      const data = (await res.json()) as {token?: string; error?: string};
      if (res.ok && data.token) {
        setToken(data.token);
        setPasswordInput('');
        setNeedsSetup(false);
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch {
      setAuthError('Server connection failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    if (!token) return null;
    if (file.size > 2 * 1024 * 1024) {
      showToast('ছবির সাইজ ২ MB এর কম হতে হবে');
      return null;
    }
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({filename: file.name, dataUrl}),
      });
      const data = (await res.json()) as {url?: string; error?: string};
      if (res.ok && data.url) {
        return data.url;
      }
      showToast(data.error || 'ইমেজ আপলোড ব্যর্থ হয়েছে');
      return null;
    } catch {
      showToast('ইমেজ আপলোড ব্যর্থ হয়েছে');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategoryId(adminData?.categories[0]?.id || '');
    setProdOldPrice('10000');
    setProdNewPrice('7500');
    setProdStock('10');
    setProdImageUrl('');
    setProdVariant('ecommerce');
    setProdDelivery('2 Days Delivery');
    setProdSummary('');
    setProdFeatured(false);
    setProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdCategoryId(product.categoryId);
    setProdOldPrice(String(product.oldPrice));
    setProdNewPrice(String(product.newPrice));
    setProdStock(String(product.stock));
    setProdImageUrl(product.imageUrl);
    setProdVariant(product.previewVariant);
    setProdDelivery(product.deliveryTime);
    setProdSummary(product.summary);
    setProdFeatured(product.featuredOnHome);
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !prodName.trim()) return;

    const payload = {
      name: prodName.trim(),
      categoryId: prodCategoryId,
      oldPrice: Number(prodOldPrice) || 0,
      newPrice: Number(prodNewPrice) || 0,
      stock: Number(prodStock) || 0,
      imageUrl: prodImageUrl.trim(),
      previewVariant: prodVariant,
      deliveryTime: prodDelivery.trim(),
      summary: prodSummary.trim(),
      featuredOnHome: prodFeatured,
    };

    const url = editingProduct
      ? `/api/admin/products/${editingProduct.id}`
      : '/api/admin/products';
    const method = editingProduct ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setProductModalOpen(false);
      await fetchAdminState(token);
      showToast(
        editingProduct
          ? 'প্রোডাক্ট আপডেট হয়েছে ও ইউজার প্যানেলে সিঙ্ক হয়েছে!'
          : 'নতুন প্রোডাক্ট যোগ হয়েছে ও ইউজার প্যানেলে প্রকাশিত হয়েছে!',
      );
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: {Authorization: `Bearer ${token}`},
    });
    if (res.ok) {
      await fetchAdminState(token);
      showToast('প্রোডাক্ট ডিলিট করা হয়েছে');
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    if (!token) return;
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({featuredOnHome: !product.featuredOnHome}),
    });
    if (res.ok) {
      await fetchAdminState(token);
      showToast('হোম পেজ প্রজেক্ট তালিকা আপডেট হয়েছে');
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !newCategoryName.trim()) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({name: newCategoryName.trim()}),
    });
    if (res.ok) {
      setNewCategoryName('');
      await fetchAdminState(token);
      showToast('নতুন ক্যাটাগরি তৈরি হয়েছে');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (!token) return;
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({status}),
    });
    if (res.ok) {
      await fetchAdminState(token);
      showToast('অর্ডার স্ট্যাটাস আপডেট হয়েছে');
    }
  };

  const handleSaveSettings = async (partial: Partial<SiteSettings>, message: string) => {
    if (!token) return;
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(partial),
    });
    if (res.ok) {
      await fetchAdminState(token);
      showToast(message);
    }
  };

  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !reviewAuthor.trim()) return;
    const res = await fetch('/api/admin/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        author: reviewAuthor.trim(),
        rating: Number(reviewRating) || 5,
        comment: reviewComment.trim(),
      }),
    });
    if (res.ok) {
      setReviewAuthor('');
      setReviewComment('');
      await fetchAdminState(token);
      showToast('নতুন রিভিউ ও রেটিং আপডেট হয়েছে');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: {Authorization: `Bearer ${token}`},
    });
    if (res.ok) {
      await fetchAdminState(token);
      showToast('রিভিউ মুছে ফেলা হয়েছে');
    }
  };

  // ---------- Auth Screen ----------
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        <div className="text-sm text-[#a3a3a3]">লোড হচ্ছে...</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#292929] bg-[#141414] p-7 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff5500] text-white">
                <Play className="h-4 w-4 fill-white text-white ml-0.5" />
              </span>
              <div>
                <div className="text-lg font-extrabold leading-none">Persona</div>
                <div className="text-[11px] text-[#a3a3a3]">Admin Panel</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onBackToUserPanel}
              className="inline-flex items-center gap-1.5 text-xs text-[#b8b8b8] hover:text-[#ff5500] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>ইউজার সাইট</span>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5 rounded-xl border border-[#262626] bg-[#101010] p-3">
            <img
              src="/assets/profile-hero.png"
              alt="Md Momin Islam"
              className="h-12 w-12 rounded-full object-cover border border-[#ff5500]"
            />
            <div>
              <div className="text-sm font-bold text-white">Md Momin Islam</div>
              <div className="inline-flex items-center gap-1 text-xs text-amber-400">
                <Crown className="h-3 w-3" />
                <span>Super Admin</span>
              </div>
            </div>
          </div>

          <h1 className="text-xl font-bold text-white">
            {needsSetup ? 'অ্যাডমিন পাসওয়ার্ড সেট করুন' : 'অ্যাডমিন প্যানেল লগইন'}
          </h1>
          <p className="mt-1 text-xs text-[#b8b8b8]">
            {needsSetup
              ? 'প্রথমবার ব্যবহারের জন্য একটি নিরাপদ অ্যাডমিন পাসওয়ার্ড তৈরি করুন (সর্বনিম্ন ৪ অক্ষর)।'
              : 'আপনার অ্যাডমিন পাসওয়ার্ড দিয়ে ড্যাশবোর্ডে প্রবেশ করুন।'}
          </p>

          {authError && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="admin-pass" className="block text-xs font-medium text-[#d4d4d4] mb-1.5">
                পাসওয়ার্ড
              </label>
              <input
                id="admin-pass"
                type="password"
                required
                minLength={4}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="পাসওয়ার্ড লিখুন..."
                className="w-full rounded-xl border border-[#2e2e2e] bg-[#0e0e0e] px-4 py-2.5 text-sm text-white focus:border-[#ff5500] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-[#ff5500] py-2.5 text-sm font-bold text-white hover:bg-[#e54b00] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {authLoading
                ? 'অপেক্ষা করুন...'
                : needsSetup
                  ? 'পাসওয়ার্ড সেট করে প্রবেশ করুন'
                  : 'লগইন করুন'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const products = adminData?.products || [];
  const categories: Category[] = adminData?.categories || [];
  const orders = adminData?.orders || [];
  const reviews = adminData?.reviews || [];
  const summary = adminData?.summary || {
    totalProducts: 0,
    totalOrders: 0,
    totalVisitors: 1362,
    totalSell: 176,
    totalRevenue: 0,
    rating: 4.7,
  };

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;

  const filteredProducts = products.filter((p) => {
    const q = (productSearch || globalSearch).trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q);
    const matchesCat = productCatFilter === 'all' || p.categoryId === productCatFilter;
    return matchesSearch && matchesCat;
  });

  const activeSalesSeries =
    reportRange === 'monthly'
      ? adminData?.salesSeries.monthly || []
      : reportRange === 'yearly'
        ? adminData?.salesSeries.yearly || []
        : adminData?.salesSeries.daily || [];

  const sidebarItems: {id: AdminTab; label: string; icon: typeof LayoutDashboard; arrow?: boolean}[] = [
    {id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard},
    {id: 'products', label: 'পণ্য ব্যবস্থাপনা', icon: Package, arrow: true},
    {id: 'orders', label: 'অর্ডার ব্যবস্থাপনা', icon: ShoppingCart, arrow: true},
    {id: 'banner', label: 'ব্যানার সেটিংস', icon: ImageIcon},
    {id: 'settings', label: 'সাইট সেটিংস', icon: Settings},
    {id: 'logo', label: 'লোগো পরিবর্তন', icon: Play},
    {id: 'pricing', label: 'মূল্য ও ছাড় সেটিংস', icon: Tag},
    {id: 'users', label: 'ইউজার ম্যানেজমেন্ট', icon: Users},
    {id: 'reviews', label: 'রিভিউ ও রেটিং', icon: Star},
    {id: 'videos', label: 'প্রজেক্ট ও শোকেস', icon: Video},
    {id: 'support', label: 'Supabase ও সাপোর্ট', icon: HelpCircle},
  ];

  const getStatusBadge = (status: OrderStatus) => {
    if (status === 'completed') {
      return (
        <span className="inline-block rounded bg-emerald-600/90 px-2.5 py-0.5 text-[11px] font-bold text-white">
          সম্পন্ন
        </span>
      );
    }
    if (status === 'processing') {
      return (
        <span className="inline-block rounded bg-blue-600/90 px-2.5 py-0.5 text-[11px] font-bold text-white">
          প্রসেসিং
        </span>
      );
    }
    return (
      <span className="inline-block rounded bg-[#ff5500] px-2.5 py-0.5 text-[11px] font-bold text-white">
        বিচারাধীন
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#f5f5f5] flex">
      {/* Toast feedback */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-[#ff5500]/50 bg-[#171717] px-4 py-3 text-xs font-semibold text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-[#ff5500]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar — Exact Persona Admin Panel Design */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-[#1f1f1f] bg-[#0f0f0f] flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col overflow-y-auto">
          {/* Logo Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c1c1c]">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5500] text-white">
                <Play className="h-4 w-4 fill-white text-white ml-0.5" />
              </span>
              <div>
                <div className="text-lg font-extrabold text-white leading-none">Persona</div>
                <div className="text-[11px] text-[#9e9e9e]">Admin Panel</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#a3a3a3] hover:text-white"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Admin Profile */}
          <div className="flex flex-col items-center py-5 px-4 border-b border-[#1c1c1c]">
            <div className="relative">
              <img
                src={settingsForm?.bannerImageUrl || '/assets/profile-hero.png'}
                alt="Md Momin Islam"
                className="h-16 w-16 rounded-full object-cover border-2 border-[#2c2c2c]"
              />
            </div>
            <div className="mt-2.5 text-sm font-bold text-white">Md Momin Islam</div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
              <Crown className="h-3.5 w-3.5" />
              <span>Super Admin</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#ff5500] text-white shadow-sm'
                      : 'text-[#cccccc] hover:bg-[#191919] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.arrow && <ArrowRight className="h-3.5 w-3.5 opacity-60" />}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setToken(null)}
              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-[#cccccc] hover:bg-[#191919] hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>লগআউট</span>
            </button>
          </nav>
        </div>

        {/* Bottom Pro / View User Panel Box */}
        <div className="p-3 border-t border-[#1c1c1c] space-y-2.5">
          <div className="rounded-xl border border-[#ff5500]/40 bg-gradient-to-br from-[#231209] to-[#121212] p-3 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span>Persona Pro</span>
            </div>
            <div className="text-[10px] text-[#b8b8b8] mt-0.5">
              লাইভ ইউজার প্যানেল প্রিভিউ
            </div>
            <button
              type="button"
              onClick={onBackToUserPanel}
              className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[#ff5500] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#e54b00] transition-colors cursor-pointer"
            >
              <span>ইউজার সাইট দেখুন</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="text-center text-[10px] text-[#787878]">
            © 2025 Persona. All Rights Reserved.
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-[#1f1f1f] bg-[#101010]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#161616] text-white"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex items-center flex-1 rounded-full border border-[#2a2a2a] bg-[#161616] pl-4 pr-1 py-1">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (e.target.value && activeTab === 'dashboard') {
                    setActiveTab('products');
                  }
                }}
                placeholder="খুঁজুন..."
                className="w-full bg-transparent text-xs text-white placeholder:text-[#808080] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                aria-label="Search"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff5500] text-white hover:bg-[#e54b00] shrink-0 cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={onBackToUserPanel}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#2c2c2c] bg-[#181818] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#ff5500] transition-colors cursor-pointer"
            >
              <span>ইউজার প্যানেল</span>
              <ArrowRight className="h-3 w-3 text-[#ff5500]" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              aria-label="Pending orders"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#262626] bg-[#161616] text-[#d4d4d4] hover:text-white cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff5500] px-1 text-[10px] font-bold text-white tabular-nums">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <img
                src={settingsForm?.bannerImageUrl || '/assets/profile-hero.png'}
                alt="Admin"
                className="h-8 w-8 rounded-full object-cover border border-[#2f2f2f]"
              />
              <span className="hidden sm:inline text-xs font-semibold text-white">
                Md Momin Islam
              </span>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Dashboard Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                  অ্যাডমিন ড্যাশবোর্ড
                </h1>
                <p className="text-xs text-[#9e9e9e]">
                  আপনার ওয়েবসাইটের সম্পূর্ণ নিয়ন্ত্রণ প্যানেল · রিয়েলটাইম সিঙ্ক সক্রিয়
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#262626] bg-[#141414] px-3.5 py-2 text-xs text-[#d4d4d4] tabular-nums">
              <span>২৫ নভেম্বর ২০২৫</span>
              <span className="text-[#4a4a4a]">|</span>
              <span className="text-[#ff5500] font-semibold">
                {adminData?.supabaseStatus.connected ? 'Supabase Realtime যুক্ত' : 'Live WS যুক্ত'}
              </span>
            </div>
          </div>

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 4 KPI Cards matching screenshot colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('products')}
                  className="cursor-pointer rounded-xl border border-[#3a2214] bg-gradient-to-br from-[#23150e] to-[#141414] p-4 flex items-center justify-between hover:border-[#ff5500] transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff5500]/20 text-[#ff5500]">
                      <Box className="h-6 w-6" />
                    </span>
                    <div>
                      <div className="text-xs text-[#b8b8b8]">মোট পণ্য</div>
                      <div className="text-2xl font-extrabold text-white tabular-nums">
                        {summary.totalProducts}
                      </div>
                      <div className="text-[11px] text-[#ff7333]">+ প্রোডাক্ট ম্যানেজমেন্ট</div>
                    </div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff5500]/20 text-[#ff5500]">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab('orders')}
                  className="cursor-pointer rounded-xl border border-[#143322] bg-gradient-to-br from-[#0e2217] to-[#141414] p-4 flex items-center justify-between hover:border-emerald-500 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <ShoppingCart className="h-6 w-6" />
                    </span>
                    <div>
                      <div className="text-xs text-[#b8b8b8]">মোট অর্ডার / বিক্রি</div>
                      <div className="text-2xl font-extrabold text-white tabular-nums">
                        {summary.totalSell}
                      </div>
                      <div className="text-[11px] text-emerald-400 tabular-nums">
                        মোট আয়: ৳{summary.totalRevenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab('users')}
                  className="cursor-pointer rounded-xl border border-[#2a193d] bg-gradient-to-br from-[#1b1228] to-[#141414] p-4 flex items-center justify-between hover:border-violet-500 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                      <Users className="h-6 w-6" />
                    </span>
                    <div>
                      <div className="text-xs text-[#b8b8b8]">মোট ভিজিটর</div>
                      <div className="text-2xl font-extrabold text-white tabular-nums">
                        {summary.totalVisitors}
                      </div>
                      <div className="text-[11px] text-violet-400">লাইভ ইউজার ভিজিট</div>
                    </div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab('reviews')}
                  className="cursor-pointer rounded-xl border border-[#14273f] bg-gradient-to-br from-[#0e1a2b] to-[#141414] p-4 flex items-center justify-between hover:border-sky-500 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                      <Star className="h-6 w-6 fill-sky-400" />
                    </span>
                    <div>
                      <div className="text-xs text-[#b8b8b8]">মোট রেটিং</div>
                      <div className="text-2xl font-extrabold text-white tabular-nums">
                        {summary.rating}
                      </div>
                      <div className="text-[11px] text-sky-400">৪.৭ স্টার রেটিং</div>
                    </div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              {/* Main 12-Col Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left 8 Cols: Sales Graph + Recent Orders */}
                <div className="lg:col-span-8 space-y-5">
                  {/* Sales Graph Card */}
                  <div className="rounded-xl border border-[#262626] bg-[#141414] p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-[#ff5500]" />
                        <h2 className="text-base font-bold text-white">বিক্রয় পরিসংখ্যান</h2>
                      </div>

                      <div className="flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#101010] p-1">
                        {(
                          [
                            {id: 'daily', label: 'দৈনিক'},
                            {id: 'monthly', label: 'মাসিক'},
                            {id: 'yearly', label: 'বার্ষিক'},
                          ] as const
                        ).map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setReportRange(r.id)}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                              reportRange === r.id
                                ? 'bg-[#ff5500] text-white'
                                : 'text-[#b8b8b8] hover:text-white'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <SalesChart data={activeSalesSeries} />
                  </div>

                  {/* Recent Orders Table */}
                  <div className="rounded-xl border border-[#262626] bg-[#141414] p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-[#ff5500]" />
                        <h2 className="text-base font-bold text-white">সাম্প্রতিক অর্ডার</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#2c2c2c] bg-[#1a1a1a] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#ff5500] cursor-pointer"
                      >
                        <span>সব দেখুন</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#252525] text-[#9e9e9e]">
                            <th className="py-2.5 pr-3">#</th>
                            <th className="py-2.5 pr-3">পণ্য</th>
                            <th className="py-2.5 pr-3">গ্রাহক</th>
                            <th className="py-2.5 pr-3">পরিমাণ</th>
                            <th className="py-2.5 pr-3">টাকা</th>
                            <th className="py-2.5 pr-3">তারিখ</th>
                            <th className="py-2.5 text-right">স্ট্যাটাস</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202020]">
                          {orders.slice(0, 5).map((ord) => (
                            <tr key={ord.id} className="hover:bg-[#191919]">
                              <td className="py-3 pr-3 font-semibold text-white tabular-nums">
                                {ord.orderNumber}
                              </td>
                              <td className="py-3 pr-3 text-[#e0e0e0]">{ord.productName}</td>
                              <td className="py-3 pr-3 text-[#cccccc]">{ord.customerName}</td>
                              <td className="py-3 pr-3 text-[#cccccc] tabular-nums">
                                {ord.quantity} টি
                              </td>
                              <td className="py-3 pr-3 font-semibold text-white tabular-nums">
                                ৳ {ord.amount.toLocaleString()}
                              </td>
                              <td className="py-3 pr-3 text-[#b8b8b8]">{ord.dateLabel}</td>
                              <td className="py-3 text-right">{getStatusBadge(ord.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right 4 Cols: Quick Actions + Logo Upload + Banner Upload */}
                <div className="lg:col-span-4 space-y-5">
                  {/* Quick Actions */}
                  <div className="rounded-xl border border-[#262626] bg-[#141414] p-5 space-y-3">
                    <h2 className="text-base font-bold text-white mb-1">দ্রুত অ্যাকশন</h2>

                    <button
                      type="button"
                      onClick={openCreateProduct}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5500] py-2.5 text-xs font-bold text-white hover:bg-[#e54b00] transition-colors cursor-pointer"
                    >
                      <Box className="h-4 w-4" />
                      <span>নতুন পণ্য যোগ করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('banner')}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0070f3] py-2.5 text-xs font-bold text-white hover:bg-[#0060d0] transition-colors cursor-pointer"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>ব্যানার পরিবর্তন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-2.5 text-xs font-bold text-white hover:bg-[#15803d] transition-colors cursor-pointer"
                    >
                      <Settings className="h-4 w-4" />
                      <span>সাইট সেটিংস করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('pricing')}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9333ea] py-2.5 text-xs font-bold text-white hover:bg-[#7e22ce] transition-colors cursor-pointer"
                    >
                      <Tag className="h-4 w-4" />
                      <span>ছাড় সেট করুন</span>
                    </button>
                  </div>

                  {/* Site Logo Change Card */}
                  <div className="rounded-xl border border-[#262626] bg-[#141414] p-5 space-y-3">
                    <h2 className="text-sm font-bold text-white">সাইটের লোগো পরিবর্তন</h2>
                    <div className="flex h-14 items-center justify-center rounded-xl border border-[#282828] bg-[#0e0e0e] px-4">
                      {logoPreviewUrl ? (
                        <img
                          src={logoPreviewUrl}
                          alt="Site logo preview"
                          className="max-h-10 object-contain"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-lg font-extrabold text-white">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff5500]">
                            <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" />
                          </span>
                          <span>{settingsForm?.brandName || 'Persona'}</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const uploaded = await uploadImageFile(file);
                        if (uploaded) setLogoPreviewUrl(uploaded);
                      }}
                      className="block w-full text-xs text-[#b8b8b8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#242424] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#303030]"
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() =>
                        handleSaveSettings(
                          {logoUrl: logoPreviewUrl},
                          'সাইটের লোগো আপডেট হয়েছে এবং ইউজার প্যানেলে যুক্ত হয়েছে!',
                        )
                      }
                      className="w-full rounded-xl bg-[#ff5500] py-2 text-xs font-bold text-white hover:bg-[#e54b00] transition-colors cursor-pointer"
                    >
                      আপডেট করুন
                    </button>
                  </div>

                  {/* Banner Upload Card */}
                  <div className="rounded-xl border border-[#262626] bg-[#141414] p-5 space-y-3">
                    <h2 className="text-sm font-bold text-white">ব্যানার আপলোড</h2>
                    <div className="h-24 w-full overflow-hidden rounded-xl border border-[#282828] bg-[#0e0e0e]">
                      <img
                        src={bannerPreviewUrl || '/assets/profile-hero.png'}
                        alt="Hero banner preview"
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const uploaded = await uploadImageFile(file);
                        if (uploaded) setBannerPreviewUrl(uploaded);
                      }}
                      className="block w-full text-xs text-[#b8b8b8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#242424] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#303030]"
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() =>
                        handleSaveSettings(
                          {bannerImageUrl: bannerPreviewUrl},
                          'ব্যানার ইমেজ আপডেট হয়েছে এবং ইউজার প্যানেলে যুক্ত হয়েছে!',
                        )
                      }
                      className="w-full rounded-xl bg-[#ff5500] py-2 text-xs font-bold text-white hover:bg-[#e54b00] transition-colors cursor-pointer"
                    >
                      আপডেট করুন
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT MANAGEMENT (A to Z Control) */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    প্রোডাক্ট ম্যানেজমেন্ট (মোট {products.length} টি)
                  </h2>
                  <p className="text-xs text-[#9e9e9e]">
                    নতুন প্রোডাক্ট আপলোড, ছবি/নাম/দাম (পুরোনো ও নতুন দাম), স্টক ও ক্যাটাগরি নিয়ন্ত্রণ করুন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#ff5500] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#e54b00] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>নতুন প্রোডাক্ট আপলোড</span>
                </button>
              </div>

              {/* Category Creator + Search & Filter */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-xl border border-[#262626] bg-[#141414] p-4">
                <div className="lg:col-span-4 flex items-center gap-2 rounded-lg border border-[#2c2c2c] bg-[#0e0e0e] px-3 py-2">
                  <Search className="h-4 w-4 text-[#ff5500]" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="প্রোডাক্টের নাম দিয়ে খুঁজুন..."
                    className="w-full bg-transparent text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="lg:col-span-4">
                  <select
                    value={productCatFilter}
                    onChange={(e) => setProductCatFilter(e.target.value)}
                    className="w-full rounded-lg border border-[#2c2c2c] bg-[#0e0e0e] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                  >
                    <option value="all">সব ক্যাটাগরি</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <form onSubmit={handleCreateCategory} className="lg:col-span-4 flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="নতুন ক্যাটাগরি তৈরি..."
                    className="flex-1 rounded-lg border border-[#2c2c2c] bg-[#0e0e0e] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#242424] px-3 py-2 text-xs font-semibold text-white hover:bg-[#ff5500] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    + যোগ করুন
                  </button>
                </form>
              </div>

              {/* Products Table */}
              <div className="rounded-xl border border-[#262626] bg-[#141414] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#252525] text-[#9e9e9e]">
                      <th className="p-4">প্রোডাক্ট</th>
                      <th className="p-4">ক্যাটাগরি</th>
                      <th className="p-4">পুরোনো দাম</th>
                      <th className="p-4">নতুন দাম</th>
                      <th className="p-4">স্টক</th>
                      <th className="p-4">হোম পেজ</th>
                      <th className="p-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202020]">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#191919]">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-10 w-14 rounded-lg object-cover border border-[#2f2f2f]"
                              />
                            ) : (
                              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#222222] text-[10px] font-bold text-[#ff5500]">
                                {product.code}
                              </span>
                            )}
                            <div>
                              <div className="font-bold text-white">{product.name}</div>
                              <div className="text-[11px] text-[#8f8f8f] truncate max-w-[220px]">
                                {product.summary}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-[#d4d4d4]">{product.categoryName}</td>
                        <td className="p-4 text-[#8f8f8f] line-through tabular-nums">
                          ৳{product.oldPrice.toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-[#ff5500] tabular-nums">
                          ৳{product.newPrice.toLocaleString()}
                        </td>
                        <td className="p-4 text-white tabular-nums">{product.stock} টি</td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(product)}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer ${
                              product.featuredOnHome
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-[#222222] text-[#9e9e9e]'
                            }`}
                          >
                            {product.featuredOnHome ? 'হোম পেজে আছে' : 'হোমে যোগ করুন'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditProduct(product)}
                              aria-label="Edit product"
                              className="rounded-lg border border-[#2f2f2f] bg-[#1a1a1a] p-2 text-white hover:border-[#ff5500] cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id)}
                              aria-label="Delete product"
                              className="rounded-lg border border-[#2f2f2f] bg-[#1a1a1a] p-2 text-red-400 hover:border-red-500 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="rounded-xl border border-[#262626] bg-[#141414] p-5 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">অর্ডার ব্যবস্থাপনা</h2>
                <p className="text-xs text-[#9e9e9e]">
                  গ্রাহকের অর্ডার দেখুন ও স্ট্যাটাস পরিবর্তন করুন
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#252525] text-[#9e9e9e]">
                      <th className="py-3 pr-3">#</th>
                      <th className="py-3 pr-3">পণ্য</th>
                      <th className="py-3 pr-3">গ্রাহক ও ফোন</th>
                      <th className="py-3 pr-3">পরিমাণ</th>
                      <th className="py-3 pr-3">টাকা</th>
                      <th className="py-3 pr-3">স্ট্যাটাস পরিবর্তন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202020]">
                    {orders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="py-3 pr-3 font-bold text-white tabular-nums">
                          {ord.orderNumber}
                        </td>
                        <td className="py-3 pr-3 text-[#e0e0e0]">{ord.productName}</td>
                        <td className="py-3 pr-3">
                          <div className="text-white font-semibold">{ord.customerName}</div>
                          <div className="text-[#8f8f8f] tabular-nums">{ord.customerPhone}</div>
                        </td>
                        <td className="py-3 pr-3 tabular-nums">{ord.quantity} টি</td>
                        <td className="py-3 pr-3 font-bold text-[#ff5500] tabular-nums">
                          ৳ {ord.amount.toLocaleString()}
                        </td>
                        <td className="py-3">
                          <select
                            value={ord.status}
                            onChange={(e) =>
                              handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)
                            }
                            className="rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-2.5 py-1.5 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                          >
                            <option value="pending">বিচারাধীন</option>
                            <option value="processing">প্রসেসিং</option>
                            <option value="completed">সম্পন্ন</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: BANNER SETTINGS */}
          {activeTab === 'banner' && settingsForm && (
            <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 max-w-2xl space-y-4">
              <h2 className="text-lg font-bold text-white">ব্যানার ও হিরো সেটিংস</h2>
              <div className="h-44 w-full overflow-hidden rounded-xl border border-[#2c2c2c] bg-[#0e0e0e]">
                <img
                  src={settingsForm.bannerImageUrl}
                  alt="Hero Banner"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#cccccc] mb-1.5">
                  নতুন ব্যানার / প্রোফাইল ছবি আপলোড করুন
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const uploaded = await uploadImageFile(file);
                    if (uploaded) {
                      setSettingsForm({...settingsForm, bannerImageUrl: uploaded});
                      setBannerPreviewUrl(uploaded);
                    }
                  }}
                  className="block w-full text-xs text-[#b8b8b8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#242424] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">ছোট হেডিং (Eyebrow)</label>
                  <input
                    type="text"
                    value={settingsForm.heroEyebrow}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, heroEyebrow: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">সাব-টাইটেল</label>
                  <input
                    type="text"
                    value={settingsForm.heroSubtitle}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, heroSubtitle: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">নামের প্রথম অংশ</label>
                  <input
                    type="text"
                    value={settingsForm.heroTitleLine1}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, heroTitleLine1: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">নামের দ্বিতীয় অংশ</label>
                  <input
                    type="text"
                    value={settingsForm.heroTitleLine2}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, heroTitleLine2: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleSaveSettings(
                    {
                      bannerImageUrl: settingsForm.bannerImageUrl,
                      heroEyebrow: settingsForm.heroEyebrow,
                      heroTitleLine1: settingsForm.heroTitleLine1,
                      heroTitleLine2: settingsForm.heroTitleLine2,
                      heroSubtitle: settingsForm.heroSubtitle,
                    },
                    'ব্যানার সেটিংস সেভ হয়েছে ও ইউজার প্যানেলে আপডেট হয়েছে!',
                  )
                }
                className="rounded-xl bg-[#ff5500] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#e54b00] cursor-pointer"
              >
                পরিবর্তন সেভ করুন
              </button>
            </div>
          )}

          {/* TAB 5: SITE SETTINGS */}
          {activeTab === 'settings' && settingsForm && (
            <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 max-w-3xl space-y-5">
              <h2 className="text-lg font-bold text-white">সাইট সেটিংস ও স্ট্যাটস কন্ট্রোল</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">ব্র্যান্ড নাম</label>
                  <input
                    type="text"
                    value={settingsForm.brandName}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, brandName: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">WhatsApp নম্বর (শুধু সংখ্যা)</label>
                  <input
                    type="text"
                    value={settingsForm.whatsappNumber}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, whatsappNumber: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">ডিসপ্লে ফোন নম্বর</label>
                  <input
                    type="text"
                    value={settingsForm.displayPhone}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, displayPhone: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">ঠিকানা</label>
                  <input
                    type="text"
                    value={settingsForm.locationText}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, locationText: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">রেটিং (Rating)</label>
                  <input
                    type="number"
                    step="0.1"
                    max="5"
                    min="0"
                    value={settingsForm.statsRating}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, statsRating: Number(e.target.value)})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">ভিজিটর (Visitors)</label>
                  <input
                    type="number"
                    value={settingsForm.statsVisitors}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, statsVisitors: Number(e.target.value)})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">মোট বিক্রি (Total Sell)</label>
                  <input
                    type="number"
                    value={settingsForm.statsTotalSell}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, statsTotalSell: Number(e.target.value)})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">মিউজিক ভিডিও সংখ্যা</label>
                  <input
                    type="number"
                    value={settingsForm.statsMusicVideos}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, statsMusicVideos: Number(e.target.value)})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#cccccc] mb-1">ফুটার কপিরাইট টেক্সট</label>
                  <input
                    type="text"
                    value={settingsForm.footerCopyright}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, footerCopyright: e.target.value})
                    }
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleSaveSettings(
                    settingsForm,
                    'সাইট সেটিংস আপডেট হয়েছে এবং ইউজার প্যানেলে প্রতিফলিত হয়েছে!',
                  )
                }
                className="rounded-xl bg-[#ff5500] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#e54b00] cursor-pointer"
              >
                সব সেটিংস সেভ করুন
              </button>
            </div>
          )}

          {/* TAB 6: LOGO CHANGE */}
          {activeTab === 'logo' && settingsForm && (
            <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 max-w-lg space-y-4">
              <h2 className="text-lg font-bold text-white">সাইটের লোগো পরিবর্তন</h2>
              <div className="flex h-20 items-center justify-center rounded-xl border border-[#2c2c2c] bg-[#0e0e0e]">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="Logo" className="max-h-14 object-contain" />
                ) : (
                  <div className="flex items-center gap-2 text-xl font-extrabold text-white">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5500]">
                      <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                    </span>
                    <span>{settingsForm.brandName}</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const uploaded = await uploadImageFile(file);
                  if (uploaded) setLogoPreviewUrl(uploaded);
                }}
                className="block w-full text-xs text-[#b8b8b8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#242424] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleSaveSettings({logoUrl: logoPreviewUrl}, 'লোগো আপডেট হয়েছে!')
                  }
                  className="rounded-xl bg-[#ff5500] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#e54b00] cursor-pointer"
                >
                  আপডেট করুন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreviewUrl('');
                    void handleSaveSettings({logoUrl: ''}, 'ডিফল্ট Persona লোগো ফিরিয়ে আনা হয়েছে!');
                  }}
                  className="rounded-xl border border-[#2f2f2f] px-4 py-2.5 text-xs font-semibold text-[#cccccc] hover:text-white cursor-pointer"
                >
                  ডিফল্ট লোগো
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: PRICING & DISCOUNT */}
          {activeTab === 'pricing' && (
            <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 max-w-2xl space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">মূল্য ও ছাড় সেটিংস</h2>
                <p className="text-xs text-[#9e9e9e]">
                  সকল প্রোডাক্টে একসাথে ডিসকাউন্ট (%) প্রয়োগ করুন — পুরোনো দাম ও নতুন দাম স্বয়ংক্রিয়ভাবে আপডেট হবে।
                </p>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[#cccccc] mb-1">ছাড়ের পরিমাণ (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-sm text-white tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveSettings(
                      {globalDiscountPercent: Number(discountInput) || 0},
                      `${discountInput}% ছাড় সব প্রোডাক্টে প্রয়োগ হয়েছে!`,
                    )
                  }
                  className="rounded-xl bg-[#9333ea] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#7e22ce] cursor-pointer"
                >
                  ছাড় প্রয়োগ করুন
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">ইউজার ও ভিজিটর ম্যানেজমেন্ট</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#282828] bg-[#101010] p-4">
                  <div className="text-xs text-[#9e9e9e]">মোট ভিজিটর</div>
                  <div className="mt-1 text-2xl font-extrabold text-white tabular-nums">
                    {summary.totalVisitors}
                  </div>
                </div>
                <div className="rounded-xl border border-[#282828] bg-[#101010] p-4">
                  <div className="text-xs text-[#9e9e9e]">সক্রিয় অর্ডারদাতা</div>
                  <div className="mt-1 text-2xl font-extrabold text-white tabular-nums">
                    {orders.length}
                  </div>
                </div>
                <div className="rounded-xl border border-[#282828] bg-[#101010] p-4">
                  <div className="text-xs text-[#9e9e9e]">অ্যাডমিন অ্যাকাউন্ট</div>
                  <div className="mt-1 text-sm font-bold text-amber-400">
                    Md Momin Islam (Super Admin)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: REVIEWS & RATING */}
          {activeTab === 'reviews' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#262626] bg-[#141414] p-5 max-w-2xl space-y-4">
                <h2 className="text-lg font-bold text-white">নতুন রিভিউ যোগ করুন</h2>
                <form onSubmit={handleAddReview} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={reviewAuthor}
                      onChange={(e) => setReviewAuthor(e.target.value)}
                      placeholder="গ্রাহকের নাম"
                      className="rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                    />
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(e.target.value)}
                      className="rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                    >
                      <option value="5">5.0 ★</option>
                      <option value="4.8">4.8 ★</option>
                      <option value="4.7">4.7 ★</option>
                      <option value="4.5">4.5 ★</option>
                      <option value="4">4.0 ★</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="রিভিউ মন্তব্য লিখুন..."
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#ff5500] px-5 py-2 text-xs font-bold text-white hover:bg-[#e54b00] cursor-pointer"
                  >
                    রিভিউ প্রকাশ করুন
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-xl border border-[#262626] bg-[#141414] p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{rev.author}</span>
                        <span className="text-xs font-bold text-amber-400 tabular-nums">
                          {rev.rating} ★
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#c4c4c4]">{rev.comment}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#222222] flex items-center justify-between text-[11px] text-[#888888]">
                      <span>{rev.date}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-red-400 hover:underline cursor-pointer"
                      >
                        মুছুন
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: HOME SHOWCASE / PROJECTS */}
          {activeTab === 'videos' && (
            <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">হোম পেজ প্রজেক্ট শোকেস কন্ট্রোল</h2>
              <p className="text-xs text-[#9e9e9e]">
                এখান থেকে সিলেক্ট করা প্রথম ৩টি প্রোডাক্ট ইউজার প্যানেলের হোম পেজে শো করবে।
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[#282828] bg-[#101010] p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{p.name}</div>
                      <div className="text-xs text-[#9e9e9e] tabular-nums">
                        {p.categoryName} · ৳{p.newPrice.toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(p)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                        p.featuredOnHome
                          ? 'bg-[#ff5500] text-white'
                          : 'border border-[#333333] text-[#b8b8b8]'
                      }`}
                    >
                      {p.featuredOnHome ? 'সক্রিয়' : 'বন্ধ'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: SUPABASE REALTIME & SUPPORT */}
          {activeTab === 'support' && (
            <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 space-y-5 max-w-3xl">
              <h2 className="text-lg font-bold text-white">
                Supabase Realtime কানেকশন স্ট্যাটাস
              </h2>
              <p className="text-xs text-[#b8b8b8] leading-relaxed">
                AI Studio-এর Secrets প্যানেলে <code className="text-[#ff5500]">VITE_SUPABASE_URL</code>,{' '}
                <code className="text-[#ff5500]">VITE_SUPABASE_ANON_KEY</code> এবং{' '}
                <code className="text-[#ff5500]">SUPABASE_SERVICE_ROLE_KEY</code> যোগ করলে অ্যাডমিন প্যানেল ও ইউজার প্যানেল স্বয়ংক্রিয়ভাবে Supabase Realtime দিয়ে সিঙ্ক হবে।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-[#282828] bg-[#0e0e0e] p-3">
                  <div className="text-[#9e9e9e]">VITE_SUPABASE_URL</div>
                  <div
                    className={`mt-1 font-bold ${
                      adminData?.supabaseStatus.urlConfigured ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {adminData?.supabaseStatus.urlConfigured ? 'যুক্ত আছে' : 'সেট করা হয়নি'}
                  </div>
                </div>
                <div className="rounded-lg border border-[#282828] bg-[#0e0e0e] p-3">
                  <div className="text-[#9e9e9e]">VITE_SUPABASE_ANON_KEY</div>
                  <div
                    className={`mt-1 font-bold ${
                      adminData?.supabaseStatus.anonKeyConfigured
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {adminData?.supabaseStatus.anonKeyConfigured ? 'যুক্ত আছে' : 'সেট করা হয়নি'}
                  </div>
                </div>
                <div className="rounded-lg border border-[#282828] bg-[#0e0e0e] p-3">
                  <div className="text-[#9e9e9e]">SUPABASE_SERVICE_ROLE_KEY</div>
                  <div
                    className={`mt-1 font-bold ${
                      adminData?.supabaseStatus.serviceRoleConfigured
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {adminData?.supabaseStatus.serviceRoleConfigured
                      ? 'সার্ভারে সুরক্ষিত যুক্ত'
                      : 'সেট করা হয়নি'}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#282828] bg-[#0c0c0c] p-4">
                <div className="text-xs font-bold text-white mb-2">
                  ঐচ্ছিক Supabase SQL টেবিল (ডাটাবেজে স্থায়ীভাবে সেভ করার জন্য):
                </div>
                <pre className="overflow-x-auto text-[11px] text-[#c4c4c4] font-mono leading-relaxed">
{`create table if not exists persona_store_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter publication supabase_realtime add table persona_store_state;`}
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Product Create / Edit Modal */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setProductModalOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2c2c2c] bg-[#141414] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingProduct ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট আপলোড করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2f2f2f] text-white hover:bg-[#ff5500] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">প্রোডাক্টের নাম *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="যেমন: E-Commerce Store Pro"
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">ক্যাটাগরি</label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">পুরোনো দাম (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={prodOldPrice}
                    onChange={(e) => setProdOldPrice(e.target.value)}
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">নতুন দাম (৳) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodNewPrice}
                    onChange={(e) => setProdNewPrice(e.target.value)}
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">স্টক সংখ্যা</label>
                  <input
                    type="number"
                    min={0}
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">
                    প্রোডাক্টের ছবি আপলোড
                  </label>
                  <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#3a3a3a] bg-[#0e0e0e] px-3 py-2 text-xs text-[#cccccc] hover:border-[#ff5500] cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-[#ff5500]" />
                    <span>{uploadingImage ? 'আপলোড হচ্ছে...' : 'ছবি সিলেক্ট করুন'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const uploaded = await uploadImageFile(file);
                        if (uploaded) setProdImageUrl(uploaded);
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-[#cccccc] mb-1">
                    অথবা ছবির URL / প্রিভিউ স্টাইল
                  </label>
                  <select
                    value={prodVariant}
                    onChange={(e) => setProdVariant(e.target.value as PreviewVariant)}
                    className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                  >
                    {PREVIEW_VARIANTS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {prodImageUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-[#2a2a2a] bg-[#0e0e0e] p-2">
                  <img
                    src={prodImageUrl}
                    alt="Preview"
                    className="h-12 w-16 rounded object-cover"
                  />
                  <span className="text-xs text-[#b8b8b8] truncate flex-1">{prodImageUrl}</span>
                  <button
                    type="button"
                    onClick={() => setProdImageUrl('')}
                    className="text-xs text-red-400 hover:underline cursor-pointer"
                  >
                    সরান
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs text-[#cccccc] mb-1">সংক্ষিপ্ত বিবরণ</label>
                <textarea
                  rows={2}
                  value={prodSummary}
                  onChange={(e) => setProdSummary(e.target.value)}
                  placeholder="প্রোডাক্ট সম্পর্কে সংক্ষিপ্ত বিবরণ..."
                  className="w-full rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] px-3 py-2 text-xs text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodFeatured}
                  onChange={(e) => setProdFeatured(e.target.checked)}
                  className="accent-[#ff5500]"
                />
                <span>হোম পেজের নিচে প্রদর্শন করুন</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="rounded-lg border border-[#2f2f2f] px-4 py-2 text-xs text-[#cccccc] hover:text-white cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#ff5500] px-5 py-2 text-xs font-bold text-white hover:bg-[#e54b00] cursor-pointer"
                >
                  {editingProduct ? 'আপডেট করুন' : 'প্রোডাক্ট সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
