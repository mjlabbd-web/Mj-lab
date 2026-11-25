import {useEffect, useState} from 'react';
import {ArrowRight, ArrowUpRight, MapPin, MessageCircle, Phone, Search, X} from 'lucide-react';
import {Product, SiteSettings} from '../types/store';

interface SearchModalProps {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSelectProject: (project: Product) => void;
}

export function SearchModal({open, products, onClose, onSelectProject}: SearchModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matches = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.stack.some((s) => s.toLowerCase().includes(q)),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="প্রজেক্ট খুঁজুন"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#2c2c2c] bg-[#141414] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#262626] px-4 py-3">
          <Search className="h-4 w-4 text-[#ff5500] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="প্রজেক্ট খুঁজুন (যেমন: ই-কমার্স, বিজনেস, অ্যাপ)..."
            className="w-full bg-transparent text-sm text-white placeholder:text-[#7a7a7a] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#a3a3a3] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-[#222222]">
          {matches.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#999999]">
              কোনো প্রজেক্ট খুঁজে পাওয়া যায়নি।
            </div>
          ) : (
            matches.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  onSelectProject(project);
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-[#1c1c1c] transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{project.name}</div>
                  <div className="text-xs text-[#9e9e9e] mt-0.5 tabular-nums">
                    {project.categoryName} · ৳{project.newPrice.toLocaleString()} · {project.stack.join(' · ')}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#ff5500] shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface ContactModalProps {
  mode: 'about' | 'contact' | null;
  siteSettings: SiteSettings;
  onClose: () => void;
}

export function InfoModal({mode, siteSettings, onClose}: ContactModalProps) {
  useEffect(() => {
    if (!mode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, onClose]);

  if (!mode) return null;

  const whatsappUrl = `https://wa.me/${siteSettings.whatsappNumber}?text=${encodeURIComponent(
    'আসসালামু আলাইকুম মোঃ মোমিন ইসলাম, আমি একটি নতুন প্রজেক্ট নিয়ে কথা বলতে চাই।',
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'about' ? 'আমাদের সম্পর্কে' : 'যোগাযোগ করুন'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#2c2c2c] bg-[#141414] p-6 text-[#f5f5f5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-[#ff5500]">
              {mode === 'about' ? 'পরিচিতি' : 'যোগাযোগ করুন'}
            </div>
            <h3 className="mt-1 text-2xl font-bold text-white">
              {siteSettings.heroTitleLine1} {siteSettings.heroTitleLine2}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2f2f2f] bg-[#1c1c1c] text-white hover:border-[#ff5500] hover:bg-[#ff5500] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-[#c8c8c8] leading-relaxed">
          আধুনিক ওয়েবসাইট, ই-কমার্স স্টোর এবং মোবাইল অ্যাপ ডেভেলপমেন্টের জন্য সরাসরি ফোন বা হোয়াটসঅ্যাপে যোগাযোগ করুন।
        </p>

        <div className="mt-5 space-y-3 border-t border-[#262626] pt-4 text-sm">
          <a
            href={`tel:+${siteSettings.whatsappNumber}`}
            className="flex items-center gap-3 text-[#e5e5e5] hover:text-[#ff5500] transition-colors"
          >
            <Phone className="h-4 w-4 text-[#ff5500]" />
            <span className="tabular-nums">{siteSettings.displayPhone}</span>
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-[#e5e5e5] hover:text-[#ff5500] transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-[#ff5500]" />
            <span className="tabular-nums">হোয়াটসঅ্যাপ: {siteSettings.displayPhone}</span>
          </a>
          <div className="flex items-center gap-3 text-[#e5e5e5]">
            <MapPin className="h-4 w-4 text-[#ff5500]" />
            <span>{siteSettings.locationText}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#ff5500] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e54b00] transition-colors"
          >
            <span>হোয়াটসঅ্যাপে চ্যাট করুন</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
