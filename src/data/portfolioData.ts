export type ProjectCategory = 'all' | 'website' | 'ecommerce' | 'app';

export interface ProjectItem {
  id: string;
  code: string;
  title: string;
  category: Exclude<ProjectCategory, 'all'>;
  categoryLabel: string;
  year: string;
  deliveryTime: string;
  stack: string[];
  summary: string;
  description: string;
  features: string[];
  previewVariant: 'ecommerce' | 'business' | 'mobile-app' | 'booking' | 'restaurant' | 'custom-code';
}

export const WHATSAPP_NUMBER = '8801923948150';
export const DISPLAY_PHONE = '+880 1923-948150';
export const LOCATION_TEXT = 'Pollybiduth sarkarbari bajar';

export function buildWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

// Exactly 3 projects shown at the bottom of Home Page: 1 E-Commerce + 2 All Projects
export const HOME_FEATURED_PROJECTS: ProjectItem[] = [
  {
    id: 'ecommerce-store',
    code: '01',
    title: 'E-Commerce Store',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce',
    year: 'Shop UI',
    deliveryTime: '2 Days Delivery',
    stack: ['React', 'Node.js', 'Tailwind CSS'],
    summary: 'Modern online store solution with product catalog, cart, and order tracking.',
    description:
      'A high-converting e-commerce storefront built for fast browsing on mobile and desktop. Includes instant cart updates, product variant selection, and direct WhatsApp order checkout.',
    features: [
      'Responsive product catalog & category filters',
      'Instant cart drawer & order summary calculation',
      'Admin dashboard for inventory & order management',
    ],
    previewVariant: 'ecommerce',
  },
  {
    id: 'business-agency-web',
    code: '02',
    title: 'Business Website',
    category: 'website',
    categoryLabel: 'Website',
    year: 'Landing',
    deliveryTime: '2 Days Delivery',
    stack: ['HTML5', 'CSS3', 'React'],
    summary: 'Clean, fast-loading corporate website engineered for brand authority and leads.',
    description:
      'A responsive business and agency web platform featuring sharp typographic hierarchy, service showcases, and integrated client contact workflows.',
    features: [
      'Custom responsive UI with mobile-first layout',
      'SEO-ready semantic markup & fast asset loading',
      'Direct WhatsApp & inquiry call-to-action flows',
    ],
    previewVariant: 'business',
  },
  {
    id: 'mobile-app-dashboard',
    code: '03',
    title: 'App & Web Portal',
    category: 'app',
    categoryLabel: 'App & Code',
    year: 'Full-Stack',
    deliveryTime: 'Custom Scope',
    stack: ['React Native', 'TypeScript', 'REST API'],
    summary: 'Cross-platform business app and real-time analytics management portal.',
    description:
      'Built for businesses needing daily sales tracking, customer order updates, and seamless mobile-to-web synchronization with ongoing maintenance.',
    features: [
      'Cross-platform mobile & web synchronized views',
      'Real-time sales metrics & order status updates',
      'Dedicated maintenance & ongoing technical support',
    ],
    previewVariant: 'mobile-app',
  },
];

// Full list shown on All Projects page (Page 1)
export const ALL_PROJECTS: ProjectItem[] = [
  ...HOME_FEATURED_PROJECTS,
  {
    id: 'restaurant-order-web',
    code: '04',
    title: 'Restaurant Order Web',
    category: 'website',
    categoryLabel: 'Website',
    year: 'Food & Menu',
    deliveryTime: '2 Days Delivery',
    stack: ['React', 'Tailwind CSS', 'Node.js'],
    summary: 'Digital menu and instant home delivery ordering platform for restaurants.',
    description:
      'Interactive menu showcase allowing customers to browse dishes, check pricing, and place delivery orders directly from their phone.',
    features: [
      'Categorized digital menu with instant search',
      'One-tap WhatsApp food order dispatch',
      'Daily specials & delivery timer highlights',
    ],
    previewVariant: 'restaurant',
  },
  {
    id: 'custom-coding-suite',
    code: '05',
    title: 'Custom Code & API',
    category: 'app',
    categoryLabel: 'Custom Code',
    year: 'Backend',
    deliveryTime: 'Flexible',
    stack: ['TypeScript', 'Node.js', 'API'],
    summary: 'Custom software development, speed optimization, and API integrations.',
    description:
      'Custom-engineered backend automations, payment/messaging API integrations, and performance upgrades for existing web properties.',
    features: [
      'Custom REST API & webhook automation',
      'Core Web Vitals speed & SEO optimization',
      'Long-term maintenance & security backups',
    ],
    previewVariant: 'custom-code',
  },
  {
    id: 'fashion-retail-hub',
    code: '06',
    title: 'Fashion Shop UI',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce',
    year: 'Retail',
    deliveryTime: '2 Days Delivery',
    stack: ['React', 'Express', 'Tailwind CSS'],
    summary: 'Apparel & lifestyle storefront with size/color options and quick checkout.',
    description:
      'Tailored for fashion brands looking to showcase seasonal collections with clean product cards, dynamic pricing, and fast checkout.',
    features: [
      'Size & color variant selectors on product cards',
      'Automated delivery fee calculation by region',
      'Streamlined invoice & order confirmation flow',
    ],
    previewVariant: 'booking',
  },
];

// Dedicated list shown on E-Commerce Projects page (Page 2)
export const ECOMMERCE_PROJECTS: ProjectItem[] = [
  HOME_FEATURED_PROJECTS[0],
  ALL_PROJECTS[5],
  {
    id: 'gadgets-electronics-store',
    code: '07',
    title: 'Gadgets & Tech Shop',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce',
    year: 'Electronics',
    deliveryTime: '2 Days Delivery',
    stack: ['React', 'Node.js', 'Payment API'],
    summary: 'High-speed electronics & accessories shop with specs comparison and warranty tracking.',
    description:
      'Built for gadget retailers with instant search, product specification tables, stock status, and cash-on-delivery checkout.',
    features: [
      'Fast product search & price range filter',
      'Warranty & serial verification ready',
      'Mobile-optimized checkout in 2 steps',
    ],
    previewVariant: 'ecommerce',
  },
  {
    id: 'organic-grocery-mart',
    code: '08',
    title: 'Organic Food Mart',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce',
    year: 'Grocery',
    deliveryTime: '2 Days Delivery',
    stack: ['React', 'Tailwind CSS', 'Express'],
    summary: 'Daily grocery & organic food storefront with weight variants and express delivery.',
    description:
      'Clean online mart for honey, spices, and organic groceries featuring weight selector, basket management, and WhatsApp order confirmation.',
    features: [
      'Weight/pack selector (250g, 500g, 1kg)',
      'Instant delivery charge calculator',
      'One-click reorder from order history',
    ],
    previewVariant: 'restaurant',
  },
];

export const PORTFOLIO_PROJECTS = ALL_PROJECTS;
