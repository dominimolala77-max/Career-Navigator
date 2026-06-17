export type PlanId = "priority_unlimited" | "standard" | "basic";

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  applicationLimit: number | "unlimited";
  processing: string;
  support: string;
  access: string;
  benefits: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "priority_unlimited",
    name: "Priority Unlimited Plan",
    price: 599,
    tagline: "Best for learners who want the team to move as fast as possible.",
    applicationLimit: "unlimited",
    processing: "ASAP priority processing",
    support: "Priority support",
    access: "10 years of free unlimited applications",
    benefits: [
      "Unlimited university, NSFAS, bursary, TVET, and learnership applications",
      "ASAP priority processing by the CareerPath SA team",
      "Priority support and regular status updates",
      "10 years of free unlimited applications",
    ],
  },
  {
    id: "standard",
    name: "Standard Plan",
    price: 299,
    tagline: "A strong package for learners applying to several institutions.",
    applicationLimit: 10,
    processing: "Standard managed processing",
    support: "Status support",
    access: "10 applications total",
    benefits: [
      "10 managed applications",
      "NSFAS counts as 1 application",
      "University, TVET, bursary, and learnership support",
      "Dashboard status tracking",
    ],
  },
  {
    id: "basic",
    name: "Basic Plan",
    price: 199,
    tagline: "Simple managed support for a focused application list.",
    applicationLimit: 5,
    processing: "Standard managed processing",
    support: "Status support",
    access: "5 applications total",
    benefits: [
      "5 managed applications",
      "NSFAS counts as 1 application",
      "Application status dashboard",
      "Document and APS review",
    ],
  },
];

export function formatRand(amount: number) {
  return `R${amount.toLocaleString("en-ZA")}`;
}
