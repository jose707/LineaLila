// src/services/ocr.service.ts
import { API_BASE_URL } from '../config/constants';

export interface OcrExtractResponse {
  documentType: string;
  fields: Record<string, string>;
  rawText: string;
  missing: string[];
  facesFound?: number;
  rejected?: boolean;
  rejectReason?: string;
  /** Vista previa (data URI) de la imagen exacta que se analizó (ya recortada) */
  previewBase64?: string;
}

/** Geometría del molde de la cámara (dp) para recortar el documento en el backend */
export interface OcrCropRect {
  screenW: number;
  screenH: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Envía una foto de un documento al backend para extraer sus datos con OCR.
 * @param imageUri URI local de la imagen seleccionada
 * @param documentType Tipo de documento (ciFront, ciBack, licenseFront,
 *   licenseBack, soatPhoto, ruatPhoto, ...)
 * @param options.crop Geometría del molde: el backend recorta solo esa zona
 *   de la imagen para que el OCR ignore lo que está fuera del recuadro
 */
export async function extractDocument(
  imageUri: string,
  documentType: string,
  token: string,
  options?: { crop?: OcrCropRect },
): Promise<OcrExtractResponse> {
  const form = new FormData();
  form.append('documentType', documentType);
  if (options?.crop) {
    form.append('cropScreenW', String(options.crop.screenW));
    form.append('cropScreenH', String(options.crop.screenH));
    form.append('cropX', String(options.crop.x));
    form.append('cropY', String(options.crop.y));
    form.append('cropW', String(options.crop.w));
    form.append('cropH', String(options.crop.h));
  }
  form.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: `${documentType}-ocr.jpg`,
  } as any);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/requests/ocr-extract`, {
      method: 'POST', body: form, signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('La lectura tardó demasiado. Comprueba tu conexión y repite la captura.');
    }
    throw error;
  } finally { clearTimeout(timer); }

  if (!res.ok) {
    let msg = `Error ${res.status} al extraer datos`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Respuesta inválida del servidor (${res.status}).`);
  }
  return data as OcrExtractResponse;
}

export const ocrService = { extractDocument };
