import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ImageSourcePropType } from 'react-native';
import { CompanyRegistrationIcon, CFOServicesIcon, GSTFilingIcon, InvoiceFinancingIcon, ITRFilingIcon, TDSFilingIcon } from '@/constants/assets';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Segment = 'Status' | 'Overview' | 'Transaction';

type ServiceIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type ServiceItem = {
  title: string;
  icon: ServiceIconName;
  /** Optional custom image (e.g. Company Registration). Use resizeMode="contain", transparent bg. */
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
  { title: 'Company Registration', icon: 'office-building-outline', image: CompanyRegistrationIcon },
  { title: 'GST Filing', icon: 'file-document-edit-outline', image: GSTFilingIcon },
  { title: 'ITR Filing', icon: 'text-box-search-outline', image: ITRFilingIcon },
  { title: 'CFO Services', icon: 'briefcase-account-outline', image: CFOServicesIcon },
  { title: 'TDS Filing', icon: 'file-percent-outline', image: TDSFilingIcon },
  { title: 'Invoice Financing', icon: 'receipt-text-outline', image: InvoiceFinancingIcon },
];

export const tools: ToolItem[] = [
  { line1: 'Tax', line2: 'Calculator', icon: 'file-document-check-outline' },
  { line1: 'EMI', line2: 'Calculator', icon: 'cash-multiple' },
  { line1: 'TDS', line2: 'Calculator', icon: 'file-percent-outline' },
  { line1: 'HRA', line2: 'Calculator', icon: 'home-city-outline' },
];
