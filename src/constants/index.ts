import {
  benefitIcon1,
  benefitIcon2,
  benefitIcon3,
  benefitIcon4,
  benefitImage2,
  benefitsol,
  chromecast,
  disc02,
  discord,
  discordBlack,
  facebook,
  figma,
  file02,
  framer,
  homeSmile,
  instagram,
  notification2,
  notification3,
  notification4,
  notion,
  photoshop,
  plusSquare,
  protopie,
  raindrop,
  recording01,
  recording03,
  roadmap1,
  roadmap2,
  roadmap3,
  roadmap4,
  searchMd,
  slack,
  sliders04,
  telegram,
  twitter,
  yourlogo,
  jup,
  step,
  kamino,
  marginfi,
  phantom,
  rug,
  solflare,
  meteora,
} from "../assets";

export const navigation = [
  {
    id: "0",
    title: "Features",
    url: "#features",
  },
  {
    id: "1",
    title: "Pricing",
    url: "#pricing",
  },
  {
    id: "2",
    title: "How to use",
    url: "#how-to-use",
  },
  {
    id: "3",
    title: "Roadmap",
    url: "#roadmap",
  },
  {
    id: "4",
    title: "New account",
    url: "#signup",
    onlyMobile: true,
  },
  {
    id: "5",
    title: "Sign in",
    url: "#login",
    onlyMobile: true,
  },
];

export const heroIcons = [homeSmile, file02, searchMd, plusSquare];

export const notificationImages = [notification4, notification3, notification2];

export const companyLogos = [yourlogo, yourlogo, yourlogo, yourlogo, yourlogo];

export const brainwaveServices = [
 "Flag suspicious token approvals instantly",
  "Analyze risk levels before signing transactions",
  "Collaborate on wallet watchlists with your team",
];

export const brainwaveServicesIcons = [
  recording03,
  recording01,
  disc02,
  chromecast,
  sliders04,
];

export const roadmap = [
  {
    id: "0",
    title: "AI Transaction Monitoring",
    text: "Our AI now actively monitors and flags suspicious wallet activity in real time, helping users avoid scams and errors.",
    date: "Q2 2025",
    status: "done",
    imageUrl: roadmap1,
    colorful: true,
  },
  {
    id: "1",
    title: "AI-Powered Wallet Recovery",
    text: "Lost access? Our upcoming recovery protocol uses behavioral AI and encrypted identity patterns to help verify ownership and restore wallets securely—without exposing private keys.",
    date: "Q3 2025",
    status: "in progress",
    imageUrl: roadmap2,
  },
  {
    id: "2",
    title: "Guardian Autopilot Mode",
    text: "Enabling 24/7 background protection for your Web3 assets through intelligent automation and behavioral prediction.",
    date: "Q4 2025",
    status: "in progress",
    imageUrl: roadmap3,
  },
  {
    id: "3",
    title: "Cross-Chain Support",
    text: "SolGuard will soon protect assets across Ethereum, Solana, and Layer 2 chains",
    date: "Q1 2026",
    status: "in progress",
    imageUrl: roadmap4,
  },
];

export const collabText =
  " Built for DAOs, traders, and power users. SolGuard enables collaborative risk defense so your team stays ahead of Solana threats.";

export const collabContent = [
  {
    id: "0",
    title: "Scan wallets and tokens as a team and flag suspicious behavior in real-time across your network.",
 
  },
  {
    id: "1",
    title: "Intercept risky approvals with shared AI insights before they happen.",
  },
  {
    id: "2",
    title: "Intercept risky approvals with shared AI insights before they happen.",
  },
];

export const collabApps = [
  {
    id: "0",
    title: "Jup",
    icon: jup,
    width: 26,
    height: 36,
  },
  {
    id: "1",
    title: "Step",
    icon: step,
    width: 34,
    height: 36,
  },
  {
    id: "2",
    title: "Kamino",
    icon: kamino,
    width: 36,
    height: 28,
  },
  {
    id: "3",
    title: "Marginfi",
    icon: marginfi,
    width: 34,
    height: 35,
  },
  {
    id: "4",
    title: "Phantom",
    icon: phantom,
    width: 34,
    height: 34,
  },
  {
    id: "5",
    title: "Rug",
    icon: rug,
    width: 34,
    height: 34,
  },
  {
    id: "6",
    title: "Solflare",
    icon: solflare,
    width: 26,
    height: 34,
  },
  {
    id: "7",
    title: "Meteora",
    icon: meteora,
    width: 38,
    height: 32,
  },
];

export const pricing = [
  {
    id: "0",
    title: "Basic",
    description: "AI chatbot, personalized recommendations",
    price: "0",
    features: [
      "An AI chatbot that can understand your queries",
      "Personalized recommendations based on your preferences",
      "Ability to explore the app and its features without any cost",
    ],
  },
  {
    id: "1",
    title: "Premium",
    description: "Advanced AI chatbot, priority support, analytics dashboard",
    price: "9.99",
    features: [
      "An advanced AI chatbot that can understand complex queries",
      "An analytics dashboard to track your conversations",
      "Priority support to solve issues quickly",
    ],
  },
  {
    id: "2",
    title: "Enterprise",
    description: "Custom AI chatbot, advanced analytics, dedicated account",
    price: null,
    features: [
      "An AI chatbot that can understand your queries",
      "Personalized recommendations based on your preferences",
      "Ability to explore the app and its features without any cost",
    ],
  },
];

export const benefits = [
  {
    id: "0",
    title: "Analyze Any Token",
    text: "Let users quickly check any Solana token for security risks without having to search through multiple sources.",
    backgroundUrl: "./src/assets/benefits/card-1.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitsol,
  },
  {
    id: "1",
    title: "Scam Detection",
    text: "Detect scams and rugs on Solana with SolGuard's advanced security features.",
    backgroundUrl: "./src/assets/benefits/card-2.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitsol,
    light: true,
  },
  {
    id: "2",
    title: "Token Safety Score",
    text: "Get a token safety score based on its security features and risk factors.",
    backgroundUrl: "./src/assets/benefits/card-3.svg",
    iconUrl: benefitIcon3,
    imageUrl: benefitsol,
  },
  {
    id: "3",
    title: "Instant Risk Alerts",
    text: "Get immediate notifications about suspicious tokens and transactions in your wallet, allowing you to respond quickly to potential threats.",
    backgroundUrl: "./src/assets/benefits/card-4.svg",
    iconUrl: benefitIcon4,
    imageUrl: benefitsol,
    light: true,
  },
  {
    id: "4",
    title: "Token History",
    text: "View the transaction history of any token on Solana.",
    backgroundUrl: "./src/assets/benefits/card-5.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitsol,
  },
  {
    id: "5",
    title: " Real-time Protection",
    text: "The platform uses advanced blockchain analysis to understand token patterns and provide accurate and relevant risk assessments",
    backgroundUrl: "./src/assets/benefits/card-6.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitsol,
  },
];

export const socials = [
  {
    id: "0",
    title: "Discord",
    iconUrl: discordBlack,
    url: "#",
  },
  {
    id: "1",
    title: "Twitter",
    iconUrl: twitter,
    url: "#",
  },
  {
    id: "2",
    title: "Instagram",
    iconUrl: instagram,
    url: "#",
  },
  {
    id: "3",
    title: "Telegram",
    iconUrl: telegram,
    url: "#",
  },
  {
    id: "4",
    title: "Facebook",
    iconUrl: facebook,
    url: "#",
  },
];
