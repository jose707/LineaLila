import React from 'react';
import {
  Search as Buscar,
  LocateFixed,
  Menu,
  Clock as Reloj,
  ArrowRight as ArrowDerecha,
  Banknote,
  Check as Comprobar,
  Star,
  Car,
  User as Usuario,
  History as Historial,
  ChevronRight as ChevronDerecha,
  Minus,
  Plus,
  Pencil,
  PenLine as PenLinea,
  Settings as Ajustes,
  Bell,
  CircleHelp as CircleAyuda,
  MessageCircle as MensajeCircle,
  Handshake,
  AlertCircle,
  Info,
  Home,
  Briefcase,
  MapPin as MapaPin,
  ChevronLeft as ChevronIzquierda,
  X } from
'lucide-react-native';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

const Icono = {
  Busqueda: ({
    size: tamano = 20,
    color = T.inkLight



  }: {size?: number;color?: string;}) => <Buscar size={tamano} color={color} />,
  MiUbicacion: ({
    size: tamano = 20,
    color = T.accent,
    strokeWidth: trazoAncho




  }: {size?: number;color?: string;strokeWidth?: number;}) => <LocateFixed size={tamano} color={color} strokeWidth={trazoAncho} />,
  Menu: ({ size: tamano = 20, color = T.ink }: {size?: number;color?: string;}) =>
  <Menu size={tamano} color={color} />,

  Reloj: ({
    size: tamano = 16,
    color = T.inkMid,
    strokeWidth: trazoAncho




  }: {size?: number;color?: string;strokeWidth?: number;}) => <Reloj size={tamano} color={color} strokeWidth={trazoAncho} />,
  Distancia: ({
    size: tamano = 16,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <ArrowDerecha size={tamano} color={color} />,
  Dinero: ({
    size: tamano = 16,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <Banknote size={tamano} color={color} />,
  Comprobar: ({
    size: tamano = 16,
    color = T.white



  }: {size?: number;color?: string;}) => <Comprobar size={tamano} color={color} />,
  Close: ({
    size: tamano = 16,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <X size={tamano} color={color} />,
  Star: ({
    size: tamano = 14,
    color = '#F59E0B',
    filled: relleno = true




  }: {size?: number;color?: string;filled?: boolean;}) => <Star size={tamano} color={color} fill={relleno ? color : 'transparent'} />,
  Car: ({ size: tamano = 18, color = T.accent }: {size?: number;color?: string;}) =>
  <Car size={tamano} color={color} />,

  Usuario: ({
    size: tamano = 20,
    color = T.inkMid,
    strokeWidth: trazoAncho




  }: {size?: number;color?: string;strokeWidth?: number;}) => <Usuario size={tamano} color={color} strokeWidth={trazoAncho} />,
  Historial: ({
    size: tamano = 20,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <Historial size={tamano} color={color} />,
  Viaje: ({
    size: tamano = 20,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <Car size={tamano} color={color} />,
  ChevronDerecha: ({
    size: tamano = 16,
    color = T.border



  }: {size?: number;color?: string;}) => <ChevronDerecha size={tamano} color={color} />,
  Minus: ({
    size: tamano = 16,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <Minus size={tamano} color={color} />,
  Plus: ({
    size: tamano = 16,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <Plus size={tamano} color={color} />,
  Pencil: ({
    size: tamano = 16,
    color = T.inkMid,
    strokeWidth: trazoAncho




  }: {size?: number;color?: string;strokeWidth?: number;}) => <Pencil size={tamano} color={color} strokeWidth={trazoAncho} />,
  PenLinea: ({
    size: tamano = 16,
    color = T.inkMid,
    strokeWidth: trazoAncho




  }: {size?: number;color?: string;strokeWidth?: number;}) => <PenLinea size={tamano} color={color} strokeWidth={trazoAncho} />,
  Ajustes: ({
    size: tamano = 20,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <Ajustes size={tamano} color={color} />,
  Bell: ({
    size: tamano = 20,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <Bell size={tamano} color={color} />,
  AyudaCircle: ({
    size: tamano = 20,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <CircleAyuda size={tamano} color={color} />,
  MensajeCircle: ({
    size: tamano = 20,
    color = T.inkMid



  }: {size?: number;color?: string;}) => <MensajeCircle size={tamano} color={color} />,
  Handshake: ({
    size: tamano = 20,
    color = T.inkMid,
    strokeWidth: trazoAncho




  }: {size?: number;color?: string;strokeWidth?: number;}) => <Handshake size={tamano} color={color} strokeWidth={trazoAncho} />,
  AlertCircle: ({
    size: tamano = 14,
    color = T.accent



  }: {size?: number;color?: string;}) => <AlertCircle size={tamano} color={color} />,
  ArrowDerecha: ({
    size: tamano = 14,
    color = T.accent



  }: {size?: number;color?: string;}) => <ArrowDerecha size={tamano} color={color} />,
  Info: ({ size: tamano = 14, color = T.accent }: {size?: number;color?: string;}) =>
  <Info size={tamano} color={color} />,

  Home: ({ size: tamano = 20, color = T.inkMid }: {size?: number;color?: string;}) =>
  <Home size={tamano} color={color} />,

  Briefcase: ({ size: tamano = 20, color = T.inkMid }: {size?: number;color?: string;}) =>
  <Briefcase size={tamano} color={color} />,

  MapaPin: ({ size: tamano = 20, color = T.inkMid }: {size?: number;color?: string;}) =>
  <MapaPin size={tamano} color={color} />,

  Reverso: ({ size: tamano = 20, color = T.inkMid, strokeWidth: trazoAncho }: {size?: number;color?: string;strokeWidth?: number;}) =>
  <ChevronIzquierda size={tamano} color={color} strokeWidth={trazoAncho} />

};export { Icono as Icon };
