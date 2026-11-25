import {PreviewVariant} from '../types/store';

interface ProjectPreviewProps {
  variant: PreviewVariant;
  title: string;
  imageUrl?: string;
  compact?: boolean;
}

export function ProjectPreview({
  variant,
  title,
  imageUrl,
  compact = false,
}: ProjectPreviewProps) {
  const heightClass = compact
    ? 'h-[96px] min-[400px]:h-[112px] sm:h-[165px] lg:h-[180px]'
    : 'h-[185px]';

  if (imageUrl) {
    return (
      <div className={`relative ${heightClass} w-full overflow-hidden bg-[#141414]`}>
        <img
          src={imageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (variant === 'ecommerce') {
    return (
      <div
        aria-label={`${title} প্রিভিউ`}
        className={`relative ${heightClass} w-full overflow-hidden bg-gradient-to-br from-[#071c4d] via-[#0f4592] to-[#080d1a] p-2 sm:p-3.5 select-none`}
      >
        <div className="h-full w-full rounded sm:rounded-lg border border-white/15 bg-[#0c1428]/90 p-1.5 sm:p-3 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-0.5 sm:pb-1.5">
            <span className="text-[8px] sm:text-[11px] font-bold text-white truncate">
              অনলাইন শপ
            </span>
            <span className="text-[7.5px] sm:text-[10px] text-[#ff6b2b] font-semibold">
              কার্ট (৩)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 sm:gap-2 my-auto py-0.5 sm:py-1">
            <div className="rounded bg-white/5 p-1 sm:p-1.5 border border-white/10">
              <div className="h-5 sm:h-9 rounded-sm bg-gradient-to-tr from-[#ff5500]/60 to-[#ff8c42]/30 mb-0.5 sm:mb-1.5" />
              <div className="h-1 sm:h-1.5 w-3/4 rounded bg-white/50 mb-0.5 sm:mb-1" />
              <div className="h-1 sm:h-1.5 w-1/2 rounded bg-[#ff5500]" />
            </div>
            <div className="rounded bg-white/5 p-1 sm:p-1.5 border border-white/10">
              <div className="h-5 sm:h-9 rounded-sm bg-gradient-to-tr from-sky-400/40 to-white/10 mb-0.5 sm:mb-1.5" />
              <div className="h-1 sm:h-1.5 w-4/5 rounded bg-white/50 mb-0.5 sm:mb-1" />
              <div className="h-1 sm:h-1.5 w-1/2 rounded bg-[#ff5500]" />
            </div>
            <div className="rounded bg-white/5 p-1 sm:p-1.5 border border-white/10">
              <div className="h-5 sm:h-9 rounded-sm bg-gradient-to-tr from-indigo-400/40 to-white/10 mb-0.5 sm:mb-1.5" />
              <div className="h-1 sm:h-1.5 w-2/3 rounded bg-white/50 mb-0.5 sm:mb-1" />
              <div className="h-1 sm:h-1.5 w-1/2 rounded bg-[#ff5500]" />
            </div>
          </div>
          <div className="hidden sm:flex items-center justify-between text-[10px] text-slate-300">
            <span>ই-কমার্স স্টোর</span>
            <span className="font-semibold text-[#ff6b2b]">লাইভ চেকআউট</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'business') {
    return (
      <div
        aria-label={`${title} প্রিভিউ`}
        className={`relative ${heightClass} w-full overflow-hidden bg-gradient-to-br from-[#07182e] via-[#132247] to-[#1e1036] p-2 sm:p-3.5 select-none`}
      >
        <div className="h-full w-full rounded sm:rounded-lg border border-white/15 bg-[#0e1526]/90 p-1.5 sm:p-3 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5 sm:gap-1.5">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white/40" />
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white/25" />
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white/15" />
            </div>
            <span className="text-[7.5px] sm:text-[10px] text-cyan-300 truncate">
              বিজনেস সাইট
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 items-center my-auto">
            <div className="col-span-3 space-y-1 sm:space-y-1.5">
              <div className="h-1.5 sm:h-2 w-8 sm:w-14 rounded bg-cyan-400/80" />
              <div className="h-2 sm:h-3 w-full rounded bg-white/90" />
              <div className="h-2 sm:h-3 w-4/5 rounded bg-white/65" />
              <div className="hidden sm:block pt-1">
                <span className="inline-block rounded bg-[#ff5500] px-2.5 py-0.5 text-[9px] font-bold text-white">
                  বিস্তারিত দেখুন
                </span>
              </div>
            </div>
            <div className="col-span-2 h-10 sm:h-20 rounded sm:rounded-md border border-cyan-400/25 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 p-1 sm:p-2 flex flex-col justify-end">
              <div className="h-1 sm:h-1.5 w-full rounded bg-white/40 mb-0.5 sm:mb-1" />
              <div className="h-1 sm:h-1.5 w-2/3 rounded bg-cyan-300/80" />
            </div>
          </div>
          <div className="hidden sm:flex items-center justify-between border-t border-white/10 pt-1.5 text-[9px] text-slate-300">
            <span>রেসপন্সিভ ডিজাইন</span>
            <span>ফাস্ট লোডিং</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'mobile-app') {
    return (
      <div
        aria-label={`${title} প্রিভিউ`}
        className={`relative ${heightClass} w-full overflow-hidden bg-gradient-to-br from-[#351105] via-[#b83b07] to-[#1a0a06] p-2 sm:p-3.5 flex items-center justify-center gap-1.5 sm:gap-3 select-none`}
      >
        <div className="w-11 sm:w-24 h-full rounded sm:rounded-xl border border-white/20 bg-[#121212]/95 p-1 sm:p-2.5 flex flex-col justify-between shadow-lg">
          <div className="mx-auto h-0.5 sm:h-1 w-4 sm:w-7 rounded-full bg-white/25" />
          <div className="space-y-1 sm:space-y-1.5 my-auto">
            <div className="rounded bg-[#ff5500]/20 border border-[#ff5500]/40 p-0.5 sm:p-1.5">
              <div className="hidden sm:block text-[8px] text-orange-300 font-semibold">আয়</div>
              <div className="text-[8px] sm:text-[11px] font-bold text-white tabular-nums">৳১২.৪K</div>
            </div>
            <div className="rounded bg-white/5 p-0.5 sm:p-1.5 space-y-0.5 sm:space-y-1">
              <div className="h-1 sm:h-1.5 w-3/4 rounded bg-white/40" />
              <div className="h-1 sm:h-1.5 w-1/2 rounded bg-white/20" />
            </div>
          </div>
          <div className="hidden sm:flex justify-around border-t border-white/10 pt-1 text-[8px] text-neutral-400">
            <span className="text-[#ff5500] font-semibold">হোম</span>
            <span>অর্ডার</span>
          </div>
        </div>
        <div className="flex-1 h-full rounded sm:rounded-lg border border-white/15 bg-[#121212]/90 p-1.5 sm:p-3 flex flex-col justify-between shadow-lg">
          <div className="text-[7.5px] sm:text-[10px] font-bold text-[#ff7333] truncate">
            ওয়েব পোর্টাল
          </div>
          <div className="space-y-1 sm:space-y-2 my-auto">
            <div className="hidden sm:flex items-center justify-between text-[10px] text-neutral-200">
              <span>অ্যাক্টিভ ইউজার</span>
              <span className="font-semibold tabular-nums">১,৩৬২</span>
            </div>
            <div className="h-1 sm:h-1.5 w-full rounded bg-white/10 overflow-hidden">
              <div className="h-full w-4/5 bg-[#ff5500] rounded" />
            </div>
            <div className="hidden sm:flex items-center justify-between text-[10px] text-neutral-200">
              <span>সম্পন্ন কাজ</span>
              <span className="font-semibold tabular-nums">৯৮%</span>
            </div>
            <div className="h-1 sm:h-1.5 w-full rounded bg-white/10 overflow-hidden">
              <div className="h-full w-11/12 bg-amber-400 rounded" />
            </div>
          </div>
          <div className="hidden sm:block text-[9px] text-neutral-400">রিয়েলটাইম সিঙ্ক</div>
        </div>
      </div>
    );
  }

  if (variant === 'booking') {
    return (
      <div
        aria-label={`${title} প্রিভিউ`}
        className={`relative ${heightClass} w-full overflow-hidden bg-gradient-to-br from-[#2a1d0b] via-[#181512] to-[#111111] p-2 sm:p-4 select-none`}
      >
        <div className="h-full w-full rounded-lg border border-white/10 bg-[#151310] p-2 sm:p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-[9px] sm:text-[11px] font-semibold text-amber-300">
              ফ্যাশন শপ স্টোর
            </span>
            <span className="text-[8px] sm:text-[10px] text-neutral-400">কালেকশন</span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-auto">
            <div className="rounded-md bg-[#201c17] p-1.5 sm:p-2 border border-white/5">
              <div className="h-6 sm:h-11 rounded bg-gradient-to-br from-amber-500/30 to-[#ff5500]/20 mb-1" />
              <div className="flex items-center justify-between text-[8px] sm:text-[10px]">
                <span className="text-white/80">পাঞ্জাবি</span>
                <span className="text-amber-400 font-semibold">৳১,৬৫০</span>
              </div>
            </div>
            <div className="rounded-md bg-[#201c17] p-1.5 sm:p-2 border border-white/5">
              <div className="h-6 sm:h-11 rounded bg-gradient-to-br from-white/15 to-amber-500/15 mb-1" />
              <div className="flex items-center justify-between text-[8px] sm:text-[10px]">
                <span className="text-white/80">জ্যাকেট</span>
                <span className="text-amber-400 font-semibold">৳২,২০০</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-neutral-400">
            <span>সাইজ: M / L / XL</span>
            <span className="text-[#ff5500] font-semibold">অর্ডার করুন</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'restaurant') {
    return (
      <div
        aria-label={`${title} প্রিভিউ`}
        className={`relative ${heightClass} w-full overflow-hidden bg-gradient-to-br from-[#2d110e] via-[#191212] to-[#111111] p-2 sm:p-4 select-none`}
      >
        <div className="h-full w-full rounded-lg border border-white/10 bg-[#161111] p-2 sm:p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-semibold text-white">স্পাইস কিচেন</span>
            <span className="text-[8px] sm:text-[10px] text-[#ff5500] font-semibold">
              ডিজিটাল মেনু
            </span>
          </div>
          <div className="space-y-1.5 my-auto">
            <div className="flex items-center justify-between rounded bg-[#221918] px-2 py-1.5 border border-white/5">
              <div>
                <div className="text-[9px] sm:text-[11px] font-medium text-white">
                  স্পেশাল প্ল্যাটার
                </div>
                <div className="text-[7px] sm:text-[9px] text-neutral-400">
                  বোরহানি ও কাবাবসহ
                </div>
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold text-[#ff5500] tabular-nums">
                ৳৪২০
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-[#221918] px-2 py-1.5 border border-white/5">
              <div>
                <div className="text-[9px] sm:text-[11px] font-medium text-white">
                  ক্রিস্পি গ্রিল বার্গার
                </div>
                <div className="text-[7px] sm:text-[9px] text-neutral-400">
                  চিজ ও ফ্রেঞ্চ ফ্রাই
                </div>
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold text-[#ff5500] tabular-nums">
                ৳২৯০
              </span>
            </div>
          </div>
          <div className="text-[8px] sm:text-[9px] text-neutral-400 flex justify-between">
            <span>৩০ মিনিটে ডেলিভারি</span>
            <span>হোয়াটসঅ্যাপ অর্ডার</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label={`${title} প্রিভিউ`}
      className={`relative ${heightClass} w-full overflow-hidden bg-gradient-to-br from-[#1f1535] via-[#151320] to-[#111111] p-2 sm:p-4 select-none`}
    >
      <div className="h-full w-full rounded-lg border border-white/10 bg-[#13121c] p-2 sm:p-3 flex flex-col justify-between font-mono">
        <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] sm:text-[10px] text-neutral-400">
          <span>api.service.ts</span>
          <span className="text-violet-400">TypeScript</span>
        </div>
        <div className="space-y-1 text-[8px] sm:text-[10px] leading-relaxed text-neutral-300 my-auto">
          <div>
            <span className="text-violet-400">export async function</span>{' '}
            <span className="text-sky-300">handleOrder</span>() {'{'}
          </div>
          <div className="pl-2 sm:pl-3 text-neutral-400">
            const ok = <span className="text-emerald-400">&apos;verified&apos;</span>;
          </div>
          <div className="pl-2 sm:pl-3 text-neutral-400">
            return <span className="text-[#ff5500]">dispatch</span>(ok);
          </div>
          <div>{'}'}</div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-1 text-[8px] sm:text-[9px] font-sans text-neutral-400">
          <span>কাস্টম এপিআই সাপোর্ট</span>
          <span className="text-violet-300">৯৯.৯% আপটাইম</span>
        </div>
      </div>
    </div>
  );
}
