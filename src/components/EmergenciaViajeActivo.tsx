import React, { useState as usarEstado, useEffect as usarEfecto, useRef as usarReferencia, type RefObject } from 'react';
import { ActivityIndicator as ActividadIndicador, Modal, Pressable, Share, StyleSheet as EstiloHoja, Text as Texto, View as Vista } from 'react-native';
import { ChevronRight as ChevronDerecha, Mail, Share2, ShieldAlert, X } from 'lucide-react-native';
import Geolocation from '@react-native-community/geolocation';
import { API_HOST } from '../config/constantes';
import { viajesServicio } from '../services/viajes.servicio';
import AyudaEmergenciaModal from './AyudaEmergenciaModal';

const T = { white: '#FFFFFF', ink: '#111118', accent: '#7514C5', danger: '#DC2626' };

export function usarEmergenciaViajeActivo(
  viajeId: string, usuarioId: string | undefined, esEnfocado: boolean,
  puedeRegistrarEmergencia: boolean, esMontadoReferencia: RefObject<boolean>,
) {
  const [mostrarEmergencyConfirmarModal, establecerMostrarEmergencyConfirmarModal] = usarEstado(false);
  const [mostrarOpcionesEmergencia, establecerMostrarOpcionesEmergencia] = usarEstado(false);
  const [compartiendoUbicacion, establecerCompartiendoUbicacion] = usarEstado(false);
  const [errorCompartirUbicacion, establecerErrorCompartirUbicacion] = usarEstado('');
  const compartiendoReferencia = usarReferencia(false);
  const versionOpcionesEmergencia = usarReferencia(0);
  const [registrandoEmergencia, establecerRegistrandoEmergencia] = usarEstado(false);
  const [errorEmergencia, establecerErrorEmergencia] = usarEstado('');
  const [resultadoEmergencia, establecerResultadoEmergencia] = usarEstado<{ ambito: string; titulo: string; mensaje: string } | null>(null);
  const emergenciaEnCurso = usarReferencia(false);
  const [alertaRegistrada, establecerAlertaRegistrada] = usarEstado<{ ambito: string; id: string } | null>(null);
  const ambitoAlerta = usuarioId ? `${usuarioId}:${viajeId}` : null;
  const tieneAlertaRegistrada = !!ambitoAlerta && alertaRegistrada?.ambito === ambitoAlerta;
  const versionAlerta = usarReferencia(0);
  const estadoAlertaRegistrada = {
    titulo: 'Mantente a la espera',
    mensaje: 'La central de Línea Lila registró tu alerta de emergencia. Manten la app abierta para compartir la ubicacion en tiempo real'
  };

  usarEfecto(() => {
    if (!ambitoAlerta || !esEnfocado || !puedeRegistrarEmergencia) return;
    let vigente = true;
    let pendiente = false;
    const consultar = async () => {
      if (pendiente || emergenciaEnCurso.current) return;
      pendiente = true;
      const version = versionAlerta.current;
      try {
        const { idAlerta } = await viajesServicio.obtenerMiEmergencia(viajeId);
        if (vigente && version === versionAlerta.current) {
          establecerAlertaRegistrada(idAlerta ? { ambito: ambitoAlerta, id: idAlerta } : null);
        }
      } catch {
        // Conservar el último estado confirmado ante una falla de conexión.
      } finally {
        pendiente = false;
      }
    };
    void consultar();
    const intervalo = setInterval(consultar, 15000);
    return () => { vigente = false; clearInterval(intervalo); };
  }, [ambitoAlerta, esEnfocado, puedeRegistrarEmergencia, viajeId]);
  const registrarEmergencia = async () => {
    if (!viajeId || !ambitoAlerta || !puedeRegistrarEmergencia || emergenciaEnCurso.current) return;
    emergenciaEnCurso.current = true;
    versionAlerta.current++;
    establecerRegistrandoEmergencia(true);
    establecerErrorEmergencia('');
    try {
      const ubicacion = await new Promise<{latitud: number; longitud: number} | undefined>(resolver => {
        Geolocation.getCurrentPosition(({ coords }) => resolver({
          latitud: coords.latitude, longitud: coords.longitude
        }), () => resolver(undefined), { timeout: 3000, maximumAge: 10000 });
      });
      const { idAlerta, registradaEnCentral } = await viajesServicio.registrarEmergencia(viajeId, ubicacion);
      establecerMostrarEmergencyConfirmarModal(false);
      if (!registradaEnCentral) {
        establecerResultadoEmergencia({ ambito: ambitoAlerta, titulo: 'Alerta guardada', mensaje: 'Aún no hay confirmación del registro en la central.' });
        return;
      }
      if (idAlerta) establecerAlertaRegistrada({ ambito: ambitoAlerta, id: idAlerta });
      establecerResultadoEmergencia({ ...estadoAlertaRegistrada, ambito: ambitoAlerta });
    } catch (error: any) {
      establecerErrorEmergencia(error?.data?.error || 'No se pudo registrar la alerta. Intenta nuevamente.');
    } finally {
      emergenciaEnCurso.current = false;
      establecerRegistrandoEmergencia(false);
    }
  };

  const cerrarOpcionesEmergencia = () => {
    versionOpcionesEmergencia.current++;
    establecerMostrarOpcionesEmergencia(false);
  };

  const compartirUbicacion = async () => {
    if (!viajeId || !puedeRegistrarEmergencia || compartiendoReferencia.current) return;
    compartiendoReferencia.current = true;
    establecerCompartiendoUbicacion(true);
    establecerErrorCompartirUbicacion('');
    const version = versionOpcionesEmergencia.current;
    try {
      const { ruta: rutaCompartida } = await viajesServicio.compartirUbicacion(viajeId);
      if (!esMontadoReferencia.current || version !== versionOpcionesEmergencia.current) return;
      if (!/^\/viaje-compartido\/#[-\w.]+$/.test(rutaCompartida)) throw new Error('Enlace inválido');
      await Share.share({ message: `Sigue mi viaje en tiempo real con Línea Lila: ${API_HOST}${rutaCompartida}` });
      if (version === versionOpcionesEmergencia.current) cerrarOpcionesEmergencia();
    } catch (error: any) {
      if (version === versionOpcionesEmergencia.current) {
        establecerErrorCompartirUbicacion(error?.data?.error || 'No se pudo compartir la ubicación. Intenta de nuevo.');
      }
    } finally {
      compartiendoReferencia.current = false;
      establecerCompartiendoUbicacion(false);
    }
  };

  const abrirOpciones = () => {
    establecerErrorEmergencia('');
    establecerErrorCompartirUbicacion('');
    establecerMostrarOpcionesEmergencia(true);
  };
  const abrirEstadoAlerta = () => {
    if (ambitoAlerta) establecerResultadoEmergencia({ ...estadoAlertaRegistrada, ambito: ambitoAlerta });
  };

  return {
    abrirOpciones, abrirEstadoAlerta, tieneAlertaRegistrada,
    opciones: {
      mostrar: mostrarOpcionesEmergencia && puedeRegistrarEmergencia,
      confirmar: mostrarEmergencyConfirmarModal && (puedeRegistrarEmergencia || registrandoEmergencia),
      resultado: resultadoEmergencia?.ambito === ambitoAlerta ? resultadoEmergencia : null,
      registrandoEmergencia, errorEmergencia, compartiendoUbicacion, errorCompartirUbicacion,
      cerrarOpcionesEmergencia, compartirUbicacion, registrarEmergencia,
      onAyuda: () => {
        cerrarOpcionesEmergencia();
        if (tieneAlertaRegistrada) abrirEstadoAlerta();
        else establecerMostrarEmergencyConfirmarModal(true);
      },
      onCancelar: () => {
        establecerMostrarEmergencyConfirmarModal(false);
        if (puedeRegistrarEmergencia) establecerMostrarOpcionesEmergencia(true);
      },
      onCerrarResultado: () => establecerResultadoEmergencia(null)
    }
  };
}

type Props = ReturnType<typeof usarEmergenciaViajeActivo>['opciones'] & {
  oscuro: boolean;
  margenInferior: number;
  onSoporte: () => void;
};

export function OpcionesEmergenciaViajeActivo({
  oscuro, margenInferior, mostrar, confirmar, resultado,
  registrandoEmergencia, errorEmergencia, compartiendoUbicacion, errorCompartirUbicacion,
  cerrarOpcionesEmergencia, compartirUbicacion, registrarEmergencia,
  onAyuda, onCancelar, onCerrarResultado, onSoporte
}: Props) {
  const acentoPanel = oscuro ? '#D5A6FF' : T.accent;
  const tintaPanel = { color: oscuro ? '#FFFFFF' : T.ink };
  const textoSecundarioPanel = { color: oscuro ? '#BDBDC7' : '#666675' };
  return (
    <>
      <Modal visible={mostrar} transparent animationType="slide"
        statusBarTranslucent onRequestClose={cerrarOpcionesEmergencia}>
        <Vista style={s.modalOverlay}>
          <Pressable style={EstiloHoja.absoluteFillObject} onPress={cerrarOpcionesEmergencia}
            accessibilityLabel="Cerrar opciones de emergencia" />
          <Vista style={[s.sheet, oscuro && s.panelOscuro, { paddingBottom: margenInferior + 16 }]} accessibilityViewIsModal>
            <Vista style={s.emergenciaCabecera}>
              <Pressable style={s.emergenciaControl} onPress={cerrarOpcionesEmergencia}
                accessibilityRole="button" accessibilityLabel="Cerrar">
                <X size={24} color={tintaPanel.color} strokeWidth={2.6} />
              </Pressable>
              <Texto style={[s.emergenciaTitulo, tintaPanel]} accessibilityRole="header">Emergencia</Texto>
              <Vista style={s.emergenciaControl} />
            </Vista>
            {[
              { texto: 'Ayuda de emergencia', Icono: ShieldAlert, color: oscuro ? '#FCA5A5' : T.danger, pulsar: onAyuda },
              { texto: 'Enviar mensaje a soporte', Icono: Mail, color: acentoPanel, pulsar: () => {
                cerrarOpcionesEmergencia();
                onSoporte();
              } },
              { texto: 'Compartir ubicación', detalle: 'Seguir el viaje en tiempo real', Icono: Share2, color: acentoPanel,
                pulsar: compartirUbicacion, cargando: compartiendoUbicacion }
            ].map(({ texto, detalle, Icono, color, pulsar, cargando }, indice) => (
              <Pressable key={texto} style={[s.emergenciaOpcion, indice > 0 && s.routeDivider, oscuro && s.bordePanelOscuro]}
                onPress={pulsar} disabled={!!cargando} accessibilityRole="button"
                accessibilityState={{ disabled: !!cargando, busy: !!cargando }}>
                <Icono size={24} color={color} strokeWidth={2.4} />
                <Vista style={s.emergenciaDatos}>
                  <Texto style={[s.emergenciaTexto, tintaPanel, indice === 0 && { color }]}>{texto}</Texto>
                  {!!detalle && <Texto style={[s.emergenciaDetalle, textoSecundarioPanel]}>{detalle}</Texto>}
                </Vista>
                {cargando ? <ActividadIndicador color={acentoPanel} /> :
                  <ChevronDerecha size={18} color={textoSecundarioPanel.color} strokeWidth={2.4} />}
              </Pressable>
            ))}
            {!!errorCompartirUbicacion && <Texto style={[s.emergenciaDetalle, tintaPanel]} accessibilityRole="alert">{errorCompartirUbicacion}</Texto>}
          </Vista>
        </Vista>
      </Modal>
      <AyudaEmergenciaModal
        confirmar={confirmar}
        resultado={resultado}
        oscuro={oscuro}
        colorEmergencia={T.danger}
        enviando={registrandoEmergencia}
        error={errorEmergencia}
        onConfirmar={registrarEmergencia}
        onCancelar={onCancelar} onCerrarResultado={onCerrarResultado} />
    </>
  );
}

const s = EstiloHoja.create({
  panelOscuro: { backgroundColor: '#1A1A1A' },
  routeDivider: { borderTopWidth: EstiloHoja.hairlineWidth, borderTopColor: '#EAEAF0' },
  bordePanelOscuro: { borderColor: '#414141' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end'
  },
  emergenciaCabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  emergenciaControl: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emergenciaTitulo: { flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '700' },
  emergenciaOpcion: { minHeight: 58, paddingVertical: 10, flexDirection: 'row', gap: 12, alignItems: 'center' },
  emergenciaDatos: { flex: 1, gap: 3 },
  emergenciaTexto: { fontSize: 16, fontWeight: '700' },
  emergenciaDetalle: { fontSize: 14, marginBottom: 2 },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 44
  },
});
