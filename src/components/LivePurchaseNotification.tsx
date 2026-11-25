import {useEffect, useState} from 'react';
import {ShoppingBag, X} from 'lucide-react';
import {Product} from '../types/store';

interface LivePurchaseSample {
  buyer: string;
  countText: string;
  projectTitle: string;
  timeAgo: string;
}

const SAMPLE_PURCHASES: LivePurchaseSample[] = [
  {
    buyer: 'রাহিম ইসলাম',
    countText: '২টি ওয়েবসাইট',
    projectTitle: 'ই-কমার্স স্টোর',
    timeAgo: '৩ মিনিট আগে',
  },
  {
    buyer: 'করিম আহমেদ',
    countText: '১টি ওয়েবসাইট',
    projectTitle: 'বিজনেস ওয়েবসাইট',
    timeAgo: '৭ মিনিট আগে',
  },
  {
    buyer: 'তানভীর হাসান',
    countText: '৩টি ওয়েবসাইট',
    projectTitle: 'অ্যাপ ও ওয়েব পোর্টাল',
    timeAgo: '১২ মিনিট আগে',
  },
  {
    buyer: 'সাকিব মাহমুদ',
    countText: '১টি ওয়েবসাইট',
    projectTitle: 'রেস্টুরেন্ট অর্ডার ওয়েব',
    timeAgo: '১৮ মিনিট আগে',
  },
  {
    buyer: 'নুসরাত জাহান',
    countText: '২টি ওয়েবসাইট',
    projectTitle: 'ফ্যাশন শপ স্টোর',
    timeAgo: '২৫ মিনিট আগে',
  },
  {
    buyer: 'মাহমুদুল হাসান',
    countText: '১টি ওয়েবসাইট',
    projectTitle: 'কাস্টম কোড ও এপিআই',
    timeAgo: '৩৪ মিনিট আগে',
  },
];

interface LivePurchaseNotificationProps {
  products: Product[];
}

export function LivePurchaseNotification({products}: LivePurchaseNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let hideTimer: number | null = null;
    let firstTimer: number | null = null;

    const triggerToast = () => {
      setVisible(true);
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
      }, 5500);
    };

    // Show first notification quickly, then every 15 seconds
    firstTimer = window.setTimeout(() => {
      triggerToast();
    }, 3000);

    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SAMPLE_PURCHASES.length);
      triggerToast();
    }, 15000);

    return () => {
      if (firstTimer) window.clearTimeout(firstTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
      window.clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  const base = SAMPLE_PURCHASES[index];
  const matchedProduct = products[index % Math.max(1, products.length)];
  const projectLabel = matchedProduct ? matchedProduct.name : base.projectTitle;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-3 right-3 sm:left-5 sm:right-auto sm:max-w-sm z-40 rounded-xl border border-[#ff5500]/60 bg-[#141414]/95 px-3.5 py-3 shadow-2xl backdrop-blur-md transition-all duration-300"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff5500] text-white">
          <ShoppingBag className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1 text-xs leading-snug">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-white truncate">{base.buyer}</span>
            <span className="text-[10px] font-semibold text-[#ff5500] whitespace-nowrap shrink-0">
              {base.timeAgo}
            </span>
          </div>
          <p className="mt-0.5 text-[#d4d4d4]">
            <span className="font-bold text-white">{base.countText}</span> কিনেছেন —{' '}
            <span className="text-[#ff8547] font-semibold">{projectLabel}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="নোটিফিকেশন বন্ধ করুন"
          className="text-[#8a8a8a] hover:text-white cursor-pointer p-0.5 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
