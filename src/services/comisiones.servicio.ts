import { NativeModules, Platform } from 'react-native';
import { API_HOST } from '../config/constantes';
import api from './api.cliente';
import { AlmacenamientoAuxiliar } from './storage';

export const metodosComision = { efectivo: 'Efectivo', qr: 'QR', transferencia: 'Transferencia' };
export const estadosComision = { abierto: 'Abierta', pendiente_pago: 'Pendiente', under_review: 'En revisión', atrasado: 'Vencida', pagado: 'Pagada' };
export type MetodoComision = keyof typeof metodosComision;
export type ComprobanteComision = {
  id: string;
  estado: 'under_review' | 'aceptado' | 'rechazado';
  tipoArchivo: 'image/jpeg' | 'image/png' | 'application/pdf';
  metodo: MetodoComision;
  referencia: string | null;
  fecha: string;
  motivo: string | null;
  aTiempo: boolean | null;
};

export type LiquidacionComision = {
  id: string; conductor: string; periodo: string; vence: string | null; viajes: number;
  comision: number; pagado: number; saldo: number; estado: keyof typeof estadosComision;
  metodo: MetodoComision | null; fechaPago: string | null; comprobante: ComprobanteComision | null; esPrueba?: boolean;
};

export type ArchivoComprobante = { uri: string; name: string; type: string };
const MAXIMO_ARCHIVO = 8 * 1024 * 1024;
export const pdfComprobantesEnAndroid = Platform.OS === 'android';
const moduloPdf = (pdfComprobantesEnAndroid ? NativeModules.ComprobantePdf : undefined) as { elegir(): Promise<string | null>; abrir(url: string, token: string): Promise<void> } | undefined;

export async function elegirPdf(): Promise<ArchivoComprobante | null> {
  if (!moduloPdf) throw new Error('Actualiza la app para adjuntar archivos PDF.');
  const uri = await moduloPdf.elegir();
  return uri ? { uri, name: 'comprobante.pdf', type: 'application/pdf' } : null;
}

export const obtenerMisComisiones = () => api.obtener<{ instrucciones: string | null; liquidaciones: LiquidacionComision[] }>('/conductores/estados-comision');

export async function enviarComprobante(id: string, archivo: ArchivoComprobante, metodo: MetodoComision, referencia: string) {
  const token = AlmacenamientoAuxiliar.obtenerElemento('authToken');
  if (!token) throw new Error('Inicia sesión para enviar el comprobante.');
  const formulario = new FormData();
  formulario.append('comprobante', archivo as unknown as Blob);
  formulario.append('metodo', metodo);
  formulario.append('referencia', referencia.trim());
  const respuesta = await fetch(`${API_HOST}/api/conductores/estados-comision/${encodeURIComponent(id)}/comprobantes`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formulario
  });
  if (!respuesta.ok) {
    const problema = await respuesta.json().catch(() => ({}));
    throw new Error(problema.error || 'No se pudo enviar el comprobante.');
  }
}

export function imagenComprobante(uri: string, tipo: string | undefined, tamaño?: number): ArchivoComprobante {
  if (tipo !== 'image/jpeg' && tipo !== 'image/png') throw new Error('Selecciona una imagen JPG o PNG.');
  if (tamaño && tamaño > MAXIMO_ARCHIVO) throw new Error('El comprobante debe pesar hasta 8 MB.');
  return { uri, type: tipo, name: tipo === 'image/png' ? 'comprobante.png' : 'comprobante.jpg' };
}

export function origenComprobante(id: string, comprobanteId: string, administrador: boolean) {
  const ruta = administrador ? 'administracion/liquidaciones' : 'conductores/estados-comision';
  const uri = `${API_HOST}/api/${ruta}/${encodeURIComponent(id)}/comprobantes/${encodeURIComponent(comprobanteId)}`;
  return { uri, headers: { Authorization: `Bearer ${AlmacenamientoAuxiliar.obtenerElemento('authToken') || ''}` } };
}

export async function abrirPdfComprobante(id: string, comprobanteId: string, administrador: boolean) {
  if (!pdfComprobantesEnAndroid) throw new Error('Los comprobantes PDF se abren desde Android.');
  if (!moduloPdf) throw new Error('Actualiza la app para abrir comprobantes PDF.');
  const token = AlmacenamientoAuxiliar.obtenerElemento('authToken');
  if (!token) throw new Error('Inicia sesión para abrir el comprobante.');
  await moduloPdf.abrir(origenComprobante(id, comprobanteId, administrador).uri, token);
}
