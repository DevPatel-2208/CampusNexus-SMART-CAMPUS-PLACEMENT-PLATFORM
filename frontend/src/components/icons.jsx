import { Award, BadgeCheck, Bell, Bookmark, BookOpen, Building2, CalendarDays, BarChart3, ClipboardList, Download, FileText, FolderKanban, Globe2, LayoutDashboard, ListOrdered, Mail, Megaphone, Plus, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Star, TrendingUp, UploadCloud, User2, UserCog, Users2, Video, Zap, Briefcase } from 'lucide-react';

const MAP = {
  dashboard: LayoutDashboard, jobs: Briefcase, sparkles: Sparkles, globe: Globe2, bookmark: Bookmark,
  calendar: CalendarDays, file: FileText, clipboard: ClipboardList, video: Video, award: Award,
  trending: TrendingUp, user: User2, book: BookOpen, zap: Zap, folder: FolderKanban, badge: BadgeCheck,
  upload: UploadCloud, sliders: SlidersHorizontal, bell: Bell, star: Star, chart: BarChart3,
  users: Users2, building: Building2, download: Download, mail: Mail, list: ListOrdered,
  megaphone: Megaphone, shield: ShieldCheck, plus: Plus, settings: Settings, account: UserCog,
};
export function Icon({ name, size = 18 }) {
  const C = MAP[name] || FileText;
  return <C size={size} />;
}
