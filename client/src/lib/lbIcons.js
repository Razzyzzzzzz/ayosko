import { CreditCard, User, GraduationCap, Briefcase, Award, Receipt, ShieldCheck, FileText } from 'lucide-vue-next';
export const CAT_ICON = { ids: CreditCard, personal: User, school: GraduationCap, employment: Briefcase, certificates: Award, receipts: Receipt, warranties: ShieldCheck, other: FileText };
export const iconOf = (k) => CAT_ICON[k] ?? FileText;