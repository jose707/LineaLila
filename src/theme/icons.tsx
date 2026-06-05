import React from 'react';
import {
  Search,
  LocateFixed,
  Menu,
  Clock,
  ArrowRight,
  Banknote,
  Check,
  Star,
  Car,
  User,
  History,
  ChevronRight,
  Minus,
  Plus,
  Pencil,
  PenLine,
  Settings,
  Bell,
  CircleHelp,
  MessageCircle,
  Handshake,
  AlertCircle,
  Info,
  Home,
  Briefcase,
  MapPin,
  ChevronLeft,
  X,
} from 'lucide-react-native';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

export const Icon = {
  Search: ({
    size = 20,
    color = T.inkLight,
  }: {
    size?: number;
    color?: string;
  }) => <Search size={size} color={color} />,
  MyLocation: ({
    size = 20,
    color = T.accent,
    strokeWidth,
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => <LocateFixed size={size} color={color} strokeWidth={strokeWidth} />,
  Menu: ({ size = 20, color = T.ink }: { size?: number; color?: string }) => (
    <Menu size={size} color={color} />
  ),
  Clock: ({
    size = 16,
    color = T.inkMid,
    strokeWidth,
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => <Clock size={size} color={color} strokeWidth={strokeWidth} />,
  Distance: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <ArrowRight size={size} color={color} />,
  Money: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Banknote size={size} color={color} />,
  Check: ({
    size = 16,
    color = T.white,
  }: {
    size?: number;
    color?: string;
  }) => <Check size={size} color={color} />,
  Close: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <X size={size} color={color} />,
  Star: ({
    size = 14,
    color = '#F59E0B',
    filled = true,
  }: {
    size?: number;
    color?: string;
    filled?: boolean;
  }) => <Star size={size} color={color} fill={filled ? color : 'transparent'} />,
  Car: ({ size = 18, color = T.accent }: { size?: number; color?: string }) => (
    <Car size={size} color={color} />
  ),
  User: ({
    size = 20,
    color = T.inkMid,
    strokeWidth,
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => <User size={size} color={color} strokeWidth={strokeWidth} />,
  History: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <History size={size} color={color} />,
  Ride: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Car size={size} color={color} />,
  ChevronRight: ({
    size = 16,
    color = T.border,
  }: {
    size?: number;
    color?: string;
  }) => <ChevronRight size={size} color={color} />,
  Minus: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Minus size={size} color={color} />,
  Plus: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Plus size={size} color={color} />,
  Pencil: ({
    size = 16,
    color = T.inkMid,
    strokeWidth,
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => <Pencil size={size} color={color} strokeWidth={strokeWidth} />,
  PenLine: ({
    size = 16,
    color = T.inkMid,
    strokeWidth,
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => <PenLine size={size} color={color} strokeWidth={strokeWidth} />,
  Settings: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Settings size={size} color={color} />,
  Bell: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Bell size={size} color={color} />,
  HelpCircle: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <CircleHelp size={size} color={color} />,
  MessageCircle: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <MessageCircle size={size} color={color} />,
  Handshake: ({
    size = 20,
    color = T.inkMid,
    strokeWidth,
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => <Handshake size={size} color={color} strokeWidth={strokeWidth} />,
  AlertCircle: ({
    size = 14,
    color = T.accent,
  }: {
    size?: number;
    color?: string;
  }) => <AlertCircle size={size} color={color} />,
  ArrowRight: ({
    size = 14,
    color = T.accent,
  }: {
    size?: number;
    color?: string;
  }) => <ArrowRight size={size} color={color} />,
  Info: ({ size = 14, color = T.accent }: { size?: number; color?: string }) => (
    <Info size={size} color={color} />
  ),
  Home: ({ size = 20, color = T.inkMid }: { size?: number; color?: string }) => (
    <Home size={size} color={color} />
  ),
  Briefcase: ({ size = 20, color = T.inkMid }: { size?: number; color?: string }) => (
    <Briefcase size={size} color={color} />
  ),
  MapPin: ({ size = 20, color = T.inkMid }: { size?: number; color?: string }) => (
    <MapPin size={size} color={color} />
  ),
  Back: ({ size = 20, color = T.inkMid, strokeWidth }: { size?: number; color?: string; strokeWidth?: number }) => (
    <ChevronLeft size={size} color={color} strokeWidth={strokeWidth} />
  ),
};
