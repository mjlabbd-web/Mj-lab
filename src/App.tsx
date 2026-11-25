import {useEffect, useRef, useState} from 'react';
import {
  ArrowRight,
  ExternalLink,
  Facebook,
  Instagram,
  LayoutGrid,
  Music,
  Play,
  Search,
  Send,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Star,
  Users,
  Youtube,
} from 'lucide-react';
import {Product} from './types/store';
import {useRealtimeStore} from './hooks/useRealtimeStore';
import {ProjectPreview} from './components/ProjectPreview';
import {ProjectModal} from './components/ProjectModal';
import {InfoModal, SearchModal} from './components/InfoModals';
import {AdminPanel} from './components/AdminPanel';
import {LivePurchaseNotification} from './components/LivePurchaseNotification';

const DEFAULT_VISITING_CARD_BANNER =
  '/assets/aistudio/file_000000000f24820899c550a2115ccca0_a16ac199.png';

function getSafeDemoUrl(raw?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function WhatsAppOutlineIcon({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M9.5 9.5c.3 1.7 1.9 3.4 3.6 3.8l1.2-1a.6.6 0 0 1 .7-.1l1.5.7a.6.6 0 0 1 .3.7c-.2.8-1 1.4-1.9 1.4-2.8 0-5.9-3.1-5.9-5.9 0-.9.6-1.7 1.4-1.9a.6.6 0 0 1 .7.3l.7 1.5a.6.6 0 0 1-.1.7l-1.2.8z" />
    </svg>
  );
}

function isAdminPath(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname.startsWith('/admin') ||
    window.location.hash === '#admin' ||
    new URLSearchParams(window.location.search).get('panel') === 'admin'
  );
}

export default function App() {
  const {store} = useRealtimeStore();
  const {products, categories, siteSettings} = store;

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(isAdminPath);
  const [activeServiceCard, setActiveServiceCard] = useState<'all' | 'whatsapp' | 'ecommerce'>(
    'all',
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Product | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [infoModalMode, setInfoModalMode] = useState<'about' | 'contact' | null>(null);
  const [heroImageError, setHeroImageError] = useState(false);

  const visitorCountedRef = useRef(false);

  useEffect(() => {
    setHeroImageError(false);
  }, [siteSettings.bannerImageUrl]);

  useEffect(() => {
    const onPopState = () => setIsAdminRoute(isAdminPath());
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  useEffect(() => {
    if (isAdminRoute || visitorCountedRef.current) return;
    visitorCountedRef.current = true;
    void fetch('/api/visitors/hit', {method: 'POST'}).catch(() => {});
  }, [isAdminRoute]);

  const openAdminPanel = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const openUserPanel = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const scrollToSection = (sectionId: string, categoryId?: string) => {
    if (categoryId) {
      setSelectedCategoryId(categoryId);
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({behavior: 'smooth'});
    }
  };

  if (isAdminRoute) {
    return <AdminPanel onBackToUserPanel={openUserPanel} />;
  }

  // Strictly 3 featured projects shown on the main Home section
  const featuredCandidates = products.filter((p) => p.featuredOnHome);
  const homeProjects =
    featuredCandidates.length >= 3 ? featuredCandidates.slice(0, 3) : products.slice(0, 3);

  // Full list shown when scrolling/sliding down
  const filteredAllProjects =
    selectedCategoryId === 'all'
      ? products
      : products.filter((p) => p.categoryId === selectedCategoryId);

  const ecommerceCat = categories.find(
    (c) => c.slug === 'ecommerce' || c.name.includes('ই-কমার্স'),
  );

  const whatsappUrl = `https://wa.me/${siteSettings.whatsappNumber}?text=${encodeURIComponent(
    'আসসালামু আলাইকুম মোঃ মোমিন ইসলাম, আমি একটি প্রজেক্ট নিয়ে কথা বলতে চাই।',
  )}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col overflow-x-hidden">
      {/* Header — Clean Top Bar without Services / About / Blog pages */}
      <header className="sticky top-0 z-40 h-14 sm:h-[70px] border-b border-[#1c1c1c] bg-[#0a0a0a]/95 backdrop-blur-md">
        <div className="mx-auto flex h-full w-full max-w-[1120px] px-3.5 sm:px-6 items-center justify-between gap-4">
          {/* Logo */}
          <a
            href="#home"
            className="flex items-center gap-2 sm:gap-2.5 text-lg sm:text-2xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.brandName}
                className="h-7 sm:h-9 w-auto object-contain"
              />
            ) : (
              <>
                <span className="inline-flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-[#ff5500] text-white">
                  <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white text-white ml-0.5" />
                </span>
                <span>{siteSettings.brandName}</span>
              </>
            )}
          </a>

          {/* Right: Search + Talk CTA */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="প্রজেক্ট খুঁজুন"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#242424] bg-[#141414] text-[#e0e0e0] hover:border-[#ff5500] hover:text-white transition-colors cursor-pointer"
            >
              <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-[#ff5500] px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-[#e54b00] whitespace-nowrap shrink-0"
            >
              <span>কথা বলুন</span>
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Banner Section — Exact Visiting Card Display */}
        <section
          id="home"
          className="relative overflow-hidden border-b border-[#1c1c1c] bg-[#0a0a0a] py-2.5 sm:py-4"
        >
          <div className="mx-auto w-full max-w-[1120px] px-3 sm:px-6">
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#2a2a2a] bg-[#0d0d0d] shadow-2xl">
              {!heroImageError ? (
                <img
                  src={siteSettings.bannerImageUrl || DEFAULT_VISITING_CARD_BANNER}
                  alt="Md Momin Islam — Visiting Card Banner"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImageError(true)}
                  className="block w-full h-auto object-contain"
                />
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-[#2b1408] to-[#0c0c0c] text-white/80 text-base font-bold">
                  {siteSettings.heroTitleLine1} {siteSettings.heroTitleLine2}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 01: Services Header with Contact Us (WhatsApp Logo) right in the middle below Banner */}
        <section id="services" className="pt-5 sm:pt-9 pb-3 sm:pb-5">
          <div className="mx-auto w-full max-w-[1120px] px-3.5 sm:px-6">
            {/* Row right below banner: Left = সেবা সমূহ | Middle = যোগাযোগ (WhatsApp logo) | Right = সব প্রজেক্ট */}
            <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
              <div className="shrink-0">
                <div className="text-[11px] sm:text-xs font-extrabold text-[#ff5500]">০১.</div>
                <h2 className="font-display text-lg sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-none">
                  সেবা সমূহ
                </h2>
              </div>

              {/* Contact Us with matching WhatsApp Logo centered between Services and View All Projects */}
              <button
                type="button"
                onClick={() => setInfoModalMode('contact')}
                className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-[#ff5500]/60 bg-[#18110d] px-3 py-1.5 sm:px-5 sm:py-2.5 text-[11px] sm:text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#ff5500] cursor-pointer whitespace-nowrap shrink-0"
              >
                <WhatsAppOutlineIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#ff5500] group-hover:text-white shrink-0 transition-colors" />
                <span>যোগাযোগ করুন</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('all-projects', 'all')}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-bold text-white transition-colors hover:border-[#ff5500] cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>সব প্রজেক্ট</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#ff5500]" />
              </button>
            </div>

            {/* 3 Service Cards — Active Clicked Card Turns Orange */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-5">
              <article
                onClick={() => {
                  setActiveServiceCard('all');
                  scrollToSection('all-projects', 'all');
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveServiceCard('all');
                    scrollToSection('all-projects', 'all');
                  }
                }}
                className={`flex min-h-[135px] sm:min-h-[205px] cursor-pointer flex-col items-start justify-between rounded-xl border p-3 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeServiceCard === 'all'
                    ? 'border-[#ff6b26] bg-gradient-to-br from-[#ff5e00] to-[#ff4500] text-white'
                    : 'border-[#262626] bg-[#161616] text-white hover:border-[#ff5500]'
                }`}
              >
                <div>
                  <LayoutGrid className="h-6 w-6 sm:h-8 sm:w-8 mb-2 sm:mb-4 text-white" />
                  <h3 className="text-xs sm:text-lg font-bold leading-snug">সব প্রজেক্ট</h3>
                  <p
                    className={`mt-1 sm:mt-1.5 text-[10px] sm:text-sm leading-snug sm:leading-relaxed ${
                      activeServiceCard === 'all' ? 'text-white/90' : 'text-[#c2c2c2]'
                    }`}
                  >
                    ওয়েবসাইট, অ্যাপ ও সব ক্রিয়েটিভ কাজ দেখুন।
                  </p>
                </div>
                <span
                  className={`mt-2.5 sm:mt-4 inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold ${
                    activeServiceCard === 'all' ? 'text-white' : 'text-[#ff5500]'
                  }`}
                >
                  <span>দেখুন</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
              </article>

              <article
                onClick={() => setActiveServiceCard('whatsapp')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveServiceCard('whatsapp');
                  }
                }}
                className={`flex min-h-[135px] sm:min-h-[205px] cursor-pointer flex-col items-start justify-between rounded-xl border p-3 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeServiceCard === 'whatsapp'
                    ? 'border-[#ff6b26] bg-gradient-to-br from-[#ff5e00] to-[#ff4500] text-white'
                    : 'border-[#262626] bg-[#161616] text-white hover:border-[#ff5500]'
                }`}
              >
                <div>
                  <WhatsAppOutlineIcon className="h-6 w-6 sm:h-8 sm:w-8 mb-2 sm:mb-4 text-white" />
                  <h3 className="text-xs sm:text-lg font-bold text-white leading-snug">
                    হোয়াটসঅ্যাপ
                  </h3>
                  <p
                    className={`mt-1 sm:mt-1.5 text-[10px] sm:text-sm leading-snug sm:leading-relaxed ${
                      activeServiceCard === 'whatsapp' ? 'text-white/90' : 'text-[#c2c2c2]'
                    }`}
                  >
                    যেকোনো কাজ বা পরামর্শের জন্য সরাসরি মেসেজ দিন।
                  </p>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveServiceCard('whatsapp');
                  }}
                  className={`mt-2.5 sm:mt-4 inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold ${
                    activeServiceCard === 'whatsapp'
                      ? 'text-white'
                      : 'text-[#ff5500] hover:text-[#ff7533]'
                  }`}
                >
                  <span>চ্যাট করুন</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </a>
              </article>

              <article
                onClick={() => {
                  setActiveServiceCard('ecommerce');
                  scrollToSection('all-projects', ecommerceCat?.id || 'all');
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveServiceCard('ecommerce');
                    scrollToSection('all-projects', ecommerceCat?.id || 'all');
                  }
                }}
                className={`flex min-h-[135px] sm:min-h-[205px] cursor-pointer flex-col items-start justify-between rounded-xl border p-3 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeServiceCard === 'ecommerce'
                    ? 'border-[#ff6b26] bg-gradient-to-br from-[#ff5e00] to-[#ff4500] text-white'
                    : 'border-[#262626] bg-[#161616] text-white hover:border-[#ff5500]'
                }`}
              >
                <div>
                  <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 mb-2 sm:mb-4 text-white" />
                  <h3 className="text-xs sm:text-lg font-bold text-white leading-snug">
                    ই-কমার্স শপ
                  </h3>
                  <p
                    className={`mt-1 sm:mt-1.5 text-[10px] sm:text-sm leading-snug sm:leading-relaxed ${
                      activeServiceCard === 'ecommerce' ? 'text-white/90' : 'text-[#c2c2c2]'
                    }`}
                  >
                    আপনার ব্যবসার জন্য আধুনিক অনলাইন স্টোর।
                  </p>
                </div>
                <span
                  className={`mt-2.5 sm:mt-4 inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold ${
                    activeServiceCard === 'ecommerce' ? 'text-white' : 'text-[#ff5500]'
                  }`}
                >
                  <span>দেখুন</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
              </article>
            </div>

            {/* 4-Column Stats Box — Larger Mobile App Icons & Text */}
            <div className="mt-4 sm:mt-6 grid grid-cols-4 rounded-xl border border-[#262626] bg-[#131313] py-3.5 sm:py-5">
              <div className="flex flex-col items-center justify-center px-1.5 sm:px-4 border-r border-[#ff5500]/75">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-[#ff5500] fill-[#ff5500] mb-1 sm:mb-1.5" />
                <strong className="text-base sm:text-2xl font-extrabold text-white tabular-nums leading-tight">
                  {siteSettings.statsRating}
                </strong>
                <span className="text-[10px] sm:text-xs text-[#c2c2c2] mt-0.5">রেটিং</span>
              </div>
              <div className="flex flex-col items-center justify-center px-1.5 sm:px-4 border-r border-[#ff5500]/75">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#ff5500] mb-1 sm:mb-1.5" />
                <strong className="text-base sm:text-2xl font-extrabold text-white tabular-nums leading-tight">
                  {siteSettings.statsVisitors}
                </strong>
                <span className="text-[10px] sm:text-xs text-[#c2c2c2] mt-0.5">ভিজিটর</span>
              </div>
              <div className="flex flex-col items-center justify-center px-1.5 sm:px-4 border-r border-[#ff5500]/75">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-[#ff5500] mb-1 sm:mb-1.5" />
                <strong className="text-base sm:text-2xl font-extrabold text-white tabular-nums leading-tight">
                  {siteSettings.statsTotalSell}
                </strong>
                <span className="text-[10px] sm:text-xs text-[#c2c2c2] mt-0.5">মোট বিক্রি</span>
              </div>
              <div className="flex flex-col items-center justify-center px-1.5 sm:px-4">
                <Music className="h-5 w-5 sm:h-6 sm:w-6 text-[#ff5500] mb-1 sm:mb-1.5" />
                <strong className="text-base sm:text-2xl font-extrabold text-white tabular-nums leading-tight">
                  {siteSettings.statsMusicVideos}
                </strong>
                <span className="text-[10px] sm:text-xs text-[#c2c2c2] mt-0.5">মিউজিক ভিডিও</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 02: Home Top 3 Featured Projects */}
        <section id="portfolio" className="pt-4 sm:pt-7 pb-6 sm:pb-10">
          <div className="mx-auto w-full max-w-[1120px] px-3.5 sm:px-6">
            <div className="mb-4 sm:mb-6 flex items-end justify-between gap-2">
              <div>
                <div className="text-[11px] sm:text-xs font-extrabold text-[#ff5500]">০২.</div>
                <h2 className="font-display text-lg sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-none">
                  ওয়েবসাইট পোর্টফোলিও
                </h2>
              </div>

              <button
                type="button"
                onClick={() => scrollToSection('all-projects', 'all')}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-bold text-white transition-colors hover:border-[#ff5500] cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>সব প্রজেক্ট দেখুন</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#ff5500]" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-5">
              {homeProjects.map((project) => {
                const demoUrl = getSafeDemoUrl(project.demoUrl);
                return (
                  <article
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProject(project);
                      }
                    }}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-[#2b2b2b] bg-[#141414] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ff5500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500]"
                  >
                    <ProjectPreview
                      variant={project.previewVariant}
                      title={project.name}
                      imageUrl={project.imageUrl || project.images?.[0]}
                      compact
                    />

                    <div className="border-t border-[#242424] bg-[#111111] px-2.5 py-2 sm:px-4 sm:py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
                        <h3 className="text-[11px] sm:text-sm font-bold text-white group-hover:text-[#ff5500] transition-colors truncate">
                          {project.name}
                        </h3>
                        <span className="hidden sm:inline text-xs font-bold text-[#ff5500] tabular-nums whitespace-nowrap shrink-0">
                          ৳{project.newPrice.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5">
                        {demoUrl ? (
                          <a
                            href={demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-md border border-[#ff5500]/60 bg-[#1a100a] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9.5px] sm:text-[11px] font-bold text-[#ff7333] hover:bg-[#ff5500] hover:text-white transition-colors whitespace-nowrap"
                          >
                            <span>ডেমো লিংক</span>
                            <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-[#2d2d2d] bg-[#181818] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9.5px] sm:text-[11px] font-bold text-[#d4d4d4] hover:border-[#ff5500] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <span>ডেমো লিংক</span>
                            <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#ff5500]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 03: Down-Slide All Projects Showcase */}
        <section id="all-projects" className="pt-4 sm:pt-8 pb-10 sm:pb-14 border-t border-[#1c1c1c]">
          <div className="mx-auto w-full max-w-[1120px] px-3.5 sm:px-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] sm:text-xs font-extrabold text-[#ff5500]">০৩.</div>
                <h2 className="font-display text-lg sm:text-3xl font-extrabold text-white tracking-tight">
                  সকল প্রজেক্টসমূহ
                </h2>
              </div>

              {/* Category Filter Tabs */}
              <div
                role="tablist"
                aria-label="প্রজেক্ট ক্যাটাগরি"
                className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#282828] bg-[#141414] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategoryId === 'all'}
                  onClick={() => setSelectedCategoryId('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategoryId === 'all'
                      ? 'bg-[#ff5500] text-white'
                      : 'text-[#b8b8b8] hover:text-white'
                  }`}
                >
                  সব প্রজেক্ট
                </button>
                {categories.map((cat) => {
                  const active = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        active ? 'bg-[#ff5500] text-white' : 'text-[#b8b8b8] hover:text-white'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredAllProjects.map((project) => {
                const demoUrl = getSafeDemoUrl(project.demoUrl);
                return (
                  <article
                    key={`all-${project.id}`}
                    onClick={() => setSelectedProject(project)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProject(project);
                      }
                    }}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-[#2b2b2b] bg-[#141414] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ff5500]"
                  >
                    <ProjectPreview
                      variant={project.previewVariant}
                      title={project.name}
                      imageUrl={project.imageUrl || project.images?.[0]}
                    />
                    <div className="p-4 border-t border-[#242424] bg-[#111111] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-[#9e9e9e] mb-1.5">
                          <span className="font-bold text-[#ff5500]">
                            {project.categoryName} · {project.deliveryTime}
                          </span>
                          <span className="tabular-nums">
                            {project.oldPrice > project.newPrice && (
                              <span className="line-through mr-1.5 text-[#737373]">
                                ৳{project.oldPrice.toLocaleString()}
                              </span>
                            )}
                            <span className="text-white font-bold">
                              ৳{project.newPrice.toLocaleString()}
                            </span>
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-[#ff5500] transition-colors">
                          {project.name}
                        </h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-[#bdbdbd] line-clamp-2 leading-relaxed">
                          {project.summary}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#1e1e1e] flex items-center justify-between gap-2">
                        {demoUrl ? (
                          <a
                            href={demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#ff5500]/70 bg-[#1a100a] px-3 py-1.5 text-xs font-bold text-[#ff7333] hover:bg-[#ff5500] hover:text-white transition-colors"
                          >
                            <span>ডেমো লিংক</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2c2c2c] bg-[#181818] px-3 py-1.5 text-xs font-bold text-[#e0e0e0] hover:border-[#ff5500] hover:text-white transition-colors cursor-pointer"
                          >
                            <span>ডেমো লিংক</span>
                            <ExternalLink className="h-3.5 w-3.5 text-[#ff5500]" />
                          </button>
                        )}
                        <span className="text-xs font-semibold text-[#b8b8b8] group-hover:text-white inline-flex items-center gap-1">
                          <span>বিস্তারিত</span>
                          <ArrowRight className="h-3.5 w-3.5 text-[#ff5500]" />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer — 100% Bengali */}
      <footer className="border-t border-[#1e1e1e] bg-[#080808] py-4 sm:py-5 text-[10px] sm:text-xs text-[#cccccc]">
        <div className="mx-auto flex w-full max-w-[1120px] px-3.5 sm:px-6 flex-wrap items-center justify-between gap-2">
          <span className="truncate">{siteSettings.footerCopyright}</span>
          <span className="whitespace-nowrap shrink-0">{siteSettings.footerBadge}</span>
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0" aria-label="ফুটার লিংক">
            <button
              type="button"
              onClick={() => scrollToSection('all-projects', 'all')}
              aria-label="ইউটিউব"
              className="text-white/90 hover:text-[#ff5500] transition-colors cursor-pointer"
            >
              <Youtube className="h-4 w-4" />
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ফেসবুক"
              className="text-white/90 hover:text-[#ff5500] transition-colors"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => scrollToSection('all-projects', ecommerceCat?.id || 'all')}
              aria-label="ইনস্টাগ্রাম"
              className="text-white/90 hover:text-[#ff5500] transition-colors cursor-pointer"
            >
              <Instagram className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openAdminPanel}
              aria-label="অ্যাডমিন প্যানেল খুলুন"
              title="অ্যাডমিন প্যানেল"
              className="inline-flex items-center gap-1 rounded-md border border-[#2c2c2c] bg-[#141414] px-2 py-1 text-[10px] sm:text-xs font-bold text-[#ff5500] hover:border-[#ff5500] transition-colors cursor-pointer"
            >
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>অ্যাডমিন</span>
            </button>
          </div>
        </div>
      </footer>

      <ProjectModal
        project={selectedProject}
        whatsappNumber={siteSettings.whatsappNumber}
        onClose={() => setSelectedProject(null)}
      />
      <SearchModal
        open={searchOpen}
        products={products}
        onClose={() => setSearchOpen(false)}
        onSelectProject={(project) => setSelectedProject(project)}
      />
      <InfoModal
        mode={infoModalMode}
        siteSettings={siteSettings}
        onClose={() => setInfoModalMode(null)}
      />
      <LivePurchaseNotification products={products} />
    </div>
  );
}
