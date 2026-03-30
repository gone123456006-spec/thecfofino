import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ImageSourcePropType } from 'react-native';
import { CompanyRegistrationIcon, CFOServicesIcon, GSTFilingIcon, InvoiceFinancingIcon, ITRFilingIcon, TDSFilingIcon } from '@/constants/assets';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Segment = 'Status' | 'Overview' | 'Transaction';

export type ServiceId = 'company-registration' | 'gst-filing' | 'itr-filing' | 'cfo-services' | 'tds-filing' | 'invoice-financing';

type ServiceIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type ServiceItem = {
  id: ServiceId;
  title: string;
  description: string;
  features: string[];
  icon: ServiceIconName;
  /** Optional custom image. Use resizeMode="contain", transparent bg. */
  image?: ImageSourcePropType;
};

export type ToolItem = {
  line1: string;
  line2: string;
  icon: ServiceIconName;
};

// ─── Data ────────────────────────────────────────────────────────────────────

export const segmentLabels: Segment[] = ['Status', 'Overview', 'Transaction'];

export const services: ServiceItem[] = [
  {
    id: 'company-registration',
    title: 'Company Registration',
    description: '',
    features: [],
    icon: 'office-building-outline',
    image: CompanyRegistrationIcon
  },
  {
    id: 'gst-filing',
    title: 'GST Filing',
    description: 'Accurate and timely GST return filing to keep your business regular and compliant. We manage GSTR-1, 3B, and provide input tax credit (ITC) reconciliation.',
    features: ['Error-free GSTR Filing', 'ITC Reconciliation', 'Timely Reminders', 'Expert Compliance Support'],
    icon: 'file-document-edit-outline',
    image: GSTFilingIcon
  },
  {
    id: 'itr-filing',
    title: 'ITR Filing',
    description: 'Professional income tax return filing for individuals, professionals, and businesses. Maximize your tax savings with structured tax planning and deductions.',
    features: ['Personal & Business ITR', 'Detailed Tax Computation', 'TDS Reconciliation', 'Audit Support'],
    icon: 'text-box-search-outline',
    image: ITRFilingIcon
  },
  {
    id: 'cfo-services',
    title: 'CFO Services',
    description: 'Get high-level financial leadership for your growing business at a fraction of the cost. Strategic budgeting, cash-flow management, and financial MIS.',
    features: ['Strategic Planning', 'Cash Flow Optimization', 'Financial Reporting (MIS)', 'Budgeting & Control'],
    icon: 'briefcase-account-outline',
    image: CFOServicesIcon
  },
  {
    id: 'tds-filing',
    title: 'TDS Filing',
    description: 'Comprehensive TDS compliance and filing services. We ensure accurate deduction calculations, challan generation, and timely quarterly return filing.',
    features: ['Quarterly Returns Filing', 'Challan & Form 16/16A', 'Default Resolution', 'Compliance Audits'],
    icon: 'file-percent-outline',
    image: TDSFilingIcon
  },
  {
    id: 'invoice-financing',
    title: 'Invoice Financing',
    description: 'Quickly unlock working capital from your unpaid invoices. Solve your cash-flow issues and keep your operations running smoothly without waiting for client payments.',
    features: ['Fast Fund Disbursement', 'No Collateral Required', 'Flexible Terms', 'Smooth Cashflow Cycle'],
    icon: 'receipt-text-outline',
    image: InvoiceFinancingIcon
  },
];

export const tools: ToolItem[] = [
  { line1: 'Tax', line2: 'Calculator', icon: 'file-document-check-outline' },
  { line1: 'EMI', line2: 'Calculator', icon: 'cash-multiple' },
  { line1: 'TDS', line2: 'Calculator', icon: 'file-percent-outline' },
  { line1: 'HRA', line2: 'Calculator', icon: 'home-city-outline' },
];
