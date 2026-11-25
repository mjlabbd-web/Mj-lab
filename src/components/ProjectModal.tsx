import {FormEvent, useEffect, useState} from 'react';
import {ArrowUpRight, Check, MessageCircle, ShoppingBag, X} from 'lucide-react';
import {Product} from '../types/store';
import {ProjectPreview} from './ProjectPreview';

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

  useEffect(() => {
    setShowOrderForm(false);
    setOrderMessage(null);
    setQuantity(1);
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
        setOrderMessage(
          `অর্ডার ${data.order?.orderNumber || ''} সফলভাবে সম্পন্ন হয়েছে!`,
        );
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2c2c2c] bg-[#141414] text-[#f5f5f5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-[#262626]">
          <ProjectPreview
            variant={project.previewVariant}
            title={project.name}
            imageUrl={project.imageUrl}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="প্রজেক্ট বিস্তারিত বন্ধ করুন"
            className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white transition-colors hover:border-[#ff5500] hover:bg-[#ff5500] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
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

          <div className="border-t border-[#242424] pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-[#a3a3a3]">
              <span className="text-white font-medium">প্রযুক্তি: </span>
              {project.stack.join(' · ')}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {safeDemoUrl && (
                <a
                  href={safeDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#ff5500] bg-[#1d110a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#ff5500] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>ডেমো লিংক</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowOrderForm((prev) => !prev)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#333333] bg-[#1b1b1b] px-4 py-2.5 text-xs font-bold text-white hover:border-[#ff5500] cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="h-4 w-4 text-[#ff5500]" />
                <span>অর্ডার করুন</span>
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5500] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#e54b00] whitespace-nowrap shrink-0"
              >
                <MessageCircle className="h-4 w-4" />
                <span>হোয়াটসঅ্যাপ</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
