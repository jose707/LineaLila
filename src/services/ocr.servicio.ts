// src/services/ocr.servicio.ts
import { API_BASE_URL } from "../config/constantes";

export interface OcrExtraerRespuesta {
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
export interface RectanguloRecorteOcr {
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
async function extraerDocumento(
imagenUri: string,
documentoTipo: string,
token: string,
opciones?: {crop?: RectanguloRecorteOcr;})
: Promise<OcrExtraerRespuesta> {
  const formulario = new FormData();
  formulario.append('documentType', documentoTipo);
  if (opciones?.crop) {
    formulario.append('cropScreenW', String(opciones.crop.screenW));
    formulario.append('cropScreenH', String(opciones.crop.screenH));
    formulario.append('cropX', String(opciones.crop.x));
    formulario.append('cropY', String(opciones.crop.y));
    formulario.append('cropW', String(opciones.crop.w));
    formulario.append('cropH', String(opciones.crop.h));
  }
  formulario.append('image', {
    uri: imagenUri,
    type: 'image/jpeg',
    name: `${documentoTipo}-ocr.jpg`
  } as any);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 60000);
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_BASE_URL}/solicitudes/extraer-ocr`, {
      method: 'POST', body: formulario, signal: controlador.signal,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('La lectura tardó demasiado. Comprueba tu conexión y repite la captura.');
    }
    throw error;
  } finally {clearTimeout(temporizador);}

  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status} al extraer datos`;
    try {
      const data = await respuesta.json();
      if (data?.error) mensaje = data.error;
    } catch {}
    throw new Error(mensaje);
  }
  let datos: any;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error(`Respuesta inválida del servidor (${respuesta.status}).`);
  }
  return datos as OcrExtraerRespuesta;
}export { extraerDocumento };

const ocrServicio = { extractDocument: extraerDocumento };export { ocrServicio };
