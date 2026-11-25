import {FormEvent, useEffect, useState} from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  X,
} from 'lucide-react';
import {Product} from '../types/store';
import {ProjectPreview} from './ProjectPreview';

function WhatsAppIcon({className}: {className?: string}) {
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

interface ProjectModalProps {
  project: Product | null;
  whatsappNumber: string;
  onClose: () => void;
}

export function ProjectModal({project, whatsappNumber, onClose}: ProjectModalProps) {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setShowOrderForm(false);
    setOrderMessage(null);
    setQuantity(1);
    setActiveImageIndex(0);
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, onClose]);

  if (!project) return null;

  const galleryImages = Array.from(
    new Set(
      [...(project.images || []), ...(project.imageUrl ? [project.imageUrl] : [])].filter(Boolean),
    ),
  ).slice(0, 5);

  const safeActiveIndex =
    galleryImages.length > 0 ? Math.min(activeImageIndex, galleryImages.length - 1) : 0;

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `হ্যালো মোঃ মোমিন ইসলাম, আমি "${project.name}" (৳${project.newPrice}) প্রজেক্টটি অর্ডার করতে চাই।`,
  )}`;

  const handleOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) return;
    setSubmitting(true);
    setOrderMessage(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          productId: project.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          quantity,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {order?: {orderNumber: string}};
        setOrderMessage(`অর্ডার ${data.order?.orderNumber || ''} সফলভাবে সম্পন্ন হয়েছে!`);
        setCustomerName('');
        setCustomerPhone('');
        setShowOrderForm(false);
      } else {
        setOrderMessage('অর্ডার সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।');
      }
    } catch {
      setOrderMessage('নেটওয়ার্ক সমস্যার কারণে অর্ডার সম্পন্ন হয়নি।');
    } finally {
      setSubmitting(false);
    }
  };

  const safeDemoUrl = (() => {
    const raw = project.demoUrl?.trim();
    if (!raw) return '';
    try {
      const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : '';
    } catch {
      return '';
    }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#2c2c2c] bg-[#141414] text-[#f5f5f5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Website Images Gallery (up to 5 uploaded photos) */}
        <div className="relative border-b border-[#262626] bg-[#0e0e0e]">
          {galleryImages.length > 0 ? (
            <div>
              <div className="relative h-[220px] sm:h-[310px] w-full overflow-hidden bg-[#0b0b0b]">
                <img
                  src={galleryImages[safeActiveIndex]}
                  alt={`${project.name} স্ক্রিনশট ${safeActiveIndex + 1}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev === 0 ? galleryImages.length - 1 : prev - 1,
                        )
                      }
                      aria-label="আগের ছবি"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white hover:border-[#ff5500] hover:bg-[#ff5500] cursor-pointer"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
                      }
                      aria-label="পরের ছবি"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white hover:border-[#ff5500] hover:bg-[#ff5500] cursor-pointer"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-2.5 right-3 rounded-full bg-black/80 px-2.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
                      {safeActiveIndex + 1} / {galleryImages.length}
                    </span>
                  </>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2 border-t border-[#222222] bg-[#111111] p-2.5">
                  {galleryImages.map((imgSrc, idx) => (
                    <button
                      key={`${imgSrc}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-12 sm:h-16 overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                        idx === safeActiveIndex
                          ? 'border-[#ff5500] ring-1 ring-[#ff5500]'
                          : 'border-[#292929] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgSrc}
                        alt={`${project.name} প্রিভিউ ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ProjectPreview
              variant={project.previewVariant}
              title={project.name}
              imageUrl={project.imageUrl}
            />
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="প্রজেক্ট বিস্তারিত বন্ধ করুন"
            className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white transition-colors hover:border-[#ff5500] hover:bg-[#ff5500] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Right Below Website Images: Direct Order & Large Contact WhatsApp Icon CTA */}
        <div className="border-b border-[#242424] bg-[#101010] px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowOrderForm((prev) => !prev)}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-[#ff5500]/70 bg-[#1a110b] px-5 py-3.5 text-sm sm:text-base font-extrabold text-white transition-colors hover:bg-[#ff5500] cursor-pointer"
            >
              <ShoppingBag className="h-6 w-6 text-[#ff5500]" />
              <span>অর্ডার করুন</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] px-5 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-lg transition-transform hover:scale-[1.01]"
            >
              <WhatsAppIcon className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-white" />
              <span>হোয়াটসঅ্যাপে যোগাযোগ</span>
              <ArrowUpRight className="h-5 w-5 shrink-0" />
            </a>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {orderMessage && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {orderMessage}
            </div>
          )}

          {showOrderForm && (
            <form
              onSubmit={handleOrderSubmit}
              className="rounded-xl border border-[#2c2c2c] bg-[#101010] p-4 space-y-3"
            >
              <div className="text-xs font-bold text-[#ff5500]">সরাসরি অর্ডার করুন</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="আপনার নাম"
                  className="rounded-lg border border-[#2f2f2f] bg-[#161616] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="ফোন / হোয়াটসঅ্যাপ"
                  className="rounded-lg border border-[#2f2f2f] bg-[#161616] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="rounded-lg border border-[#2f2f2f] bg-[#161616] px-3 py-2 text-xs text-white tabular-nums focus:border-[#ff5500] focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#b8b8b8] tabular-nums">
                  মোট মূল্য: ৳{(project.newPrice * quantity).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOrderForm(false)}
                    className="rounded-lg border border-[#2f2f2f] px-3 py-1.5 text-xs text-[#c4c4c4] hover:text-white cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-[#ff5500] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#e54b00] disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'অর্ডার হচ্ছে...' : 'অর্ডার কনফার্ম'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#a3a3a3] mb-1.5">
              <span className="font-bold text-[#ff5500]">প্রজেক্ট {project.code}</span>
              <span aria-hidden="true">·</span>
              <span>{project.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span>{project.deliveryTime}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {project.stock > 0 ? `স্টক: ${project.stock} টি` : 'স্টক শেষ'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 id="project-modal-title" className="text-2xl font-bold text-white">
                {project.name}
              </h3>
              <div className="flex items-baseline gap-2 tabular-nums">
                {project.oldPrice > project.newPrice && (
                  <span className="text-sm text-[#8a8a8a] line-through">
                    ৳{project.oldPrice.toLocaleString()}
                  </span>
                )}
                <span className="text-xl font-extrabold text-[#ff5500]">
                  ৳{project.newPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="mt-2 text-sm text-[#cfcfcf] leading-relaxed">{project.description}</p>
          </div>

          <div className="border-t border-[#242424] pt-4">
            <h4 className="text-xs font-bold text-[#a3a3a3] mb-2.5">মূল ফিচারসমূহ</h4>
            <ul className="space-y-2">
              {project.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-[#e0e0e0]">
                  <Check className="h-4 w-4 shrink-0 text-[#ff5500] mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#242424] pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-[#a3a3a3]">
              <span className="text-white font-medium">প্রযুক্তি: </span>
              {project.stack.join(' · ')}
            </div>
            {safeDemoUrl && (
              <a
                href={safeDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#ff5500] bg-[#1d110a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#ff5500] transition-colors whitespace-nowrap shrink-0"
              >
                <span>ডেমো লিংক দেখুন</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
