// src/screens/AdminAnaliticaPantalla.tsx
import React, { useState as usarEstado, useCallback as usarFuncionRetorno, useEffect as usarEfecto } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  StatusBar as EstadoBar,
  ActivityIndicator as ActividadIndicador,
  RefreshControl as RenovarControl,
  Share
} from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import Svg, { Rect, Line as Linea, Text as SvgTexto } from 'react-native-svg';
import {
  ArrowLeft, ChevronDown, CircleCheck, CircleX, Clock,
  DollarSign, Download, MapPin, Star, TrendingUp, TrendingDown, Users
} from 'lucide-react-native';
import { NativeStackNavigationProp as NativoPilaNavegacionProp } from '@react-navigation/native-stack';
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import api from "../services/api.cliente";

const C = {
  primary: '#7514C5', white: '#FFFFFF',
  border: '#E5E5EA', text: '#111118', textSub: '#55555F',
  success: '#167245', error: '#B91C1C'
};

type NavPropiedad = NativoPilaNavegacionProp<RaizPilaParametroLista, 'AdminAnalytics'>;
type Intervalo = 'week' | 'month' | 'year';
type Resumen = {
  solicitudes: number; aceptados: number; completados: number; cancelados: number;
  sin_asignar: number; ingresos: number; espera: number | null;
};
type Reporte = {
  inicio: string;
  fin: string;
  actual: Resumen | null;
  anterior: Resumen | null;
  tendencia: {day: string; count: number; revenue: number}[];
  zonas: {nombre: string; solicitudes: number; sin_asignar: number}[];
  horas: {hora: number; solicitudes: number}[];
  conductoras: number;
  comisiones: {generada: number; pendiente: number; registrados: number};
  calidad: {promedio: number | null; cantidad: number};
  cancelaciones: {actor: string; etapa: string; cantidad: number}[];
  motivos: {motivo: string; cantidad: number}[];
};

const PERIODOS = { week: 'Semana', month: 'Mes', year: 'Año' } as const;
const ACTORES: Record<string, string> = {
  pasajero: 'Pasajero', conductor: 'Conductor', sistema: 'Sistema', sin_registro: 'Sin responsable registrado'
};
const VACIO: Resumen = {
  solicitudes: 0, aceptados: 0, completados: 0, cancelados: 0, sin_asignar: 0, ingresos: 0, espera: null
};
const numero = (valor: number) => valor.toLocaleString('es-BO', { maximumFractionDigits: 1 });
const dinero = (valor: number) => `Bs ${valor.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const minutos = (valor: number | null) => valor === null ? 'Sin datos' : `${numero(valor)} min`;
const tasa = (cantidad: number, total: number) => total > 0 ? cantidad / total * 100 : null;
const porcentaje = (valor: number | null) => valor === null ? '—' : `${numero(valor)}%`;
const cambio = (actual: number, anterior?: number) =>
  anterior && anterior > 0 ? (actual - anterior) / anterior * 100 : undefined;
const fechaCorta = (fecha: string) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
const horaTexto = (hora: number) => `${String(hora).padStart(2, '0')}:00`;

function Grafico({ puntos, etiqueta, formato = numero }: {
  puntos: {valor: number; etiqueta: string}[];
  etiqueta: string;
  formato?: (valor: number) => string;
}) {
  const [ancho, establecerAncho] = usarEstado(0);
  const maximo = Math.max(0, ...puntos.map(punto => punto.valor));
  const alto = 112;
  const paso = ancho / Math.max(puntos.length, 1);
  const salto = Math.ceil(puntos.length / 5);
  return (
    <Vista onLayout={evento => establecerAncho(evento.nativeEvent.layout.width)} accessible accessibilityLabel={etiqueta}>
      {maximo > 0 ? (
        <>
        <Texto style={s.nota}>Máximo: {formato(maximo)}</Texto>
        {ancho > 0 && <Svg width={ancho} height={alto + 24}>
          {puntos.map((punto, i) => {
            const altura = punto.valor / maximo * (alto - 4);
            const centro = (i + 0.5) * paso;
            return (
              <React.Fragment key={punto.etiqueta}>
                <Rect x={centro - paso * 0.34} y={alto - altura} width={paso * 0.68} height={altura} rx={2} fill={C.primary} />
                {i % salto === 0 && (
                  <SvgTexto x={Math.min(ancho - 16, Math.max(16, centro))} y={alto + 16} fontSize={10} fill={C.textSub} textAnchor="middle">{punto.etiqueta}</SvgTexto>
                )}
              </React.Fragment>
            );
          })}
          <Linea x1={0} y1={alto} x2={ancho} y2={alto} stroke={C.border} />
        </Svg>}
        </>
      ) : <Texto style={s.empty}>Sin actividad en el período</Texto>}
    </Vista>
  );
}

function Grupo({ titulo, children }: React.PropsWithChildren<{titulo: string}>) {
  return <><SEtiqueta text={titulo} /><Vista style={s.kpiGrid}>{children}</Vista></>;
}

function Fila({ nombre, detalle, valor }: {nombre: string; detalle?: string; valor: string | number}) {
  return (
    <Vista style={s.kpiRow}>
      <Vista style={s.kpiDescription}>
        <Texto style={s.kpiLabel}>{nombre}</Texto>
        {detalle && <Texto style={s.kpiDetail}>{detalle}</Texto>}
      </Vista>
      <Texto style={[s.kpiValue, s.kpiResult]}>{valor}</Texto>
    </Vista>
  );
}

const AdministradorAnaliticaPantalla: React.FC<{navigation: NavPropiedad}> = ({ navigation }) => {
  const [mostrarDetalle, establecerMostrarDetalle] = usarEstado(false);
  const [intervalo, establecerIntervalo] = usarEstado<Intervalo>('month');
  const [metrica, establecerMetrica] = usarEstado<'count' | 'revenue'>('count');
  const [reporte, establecerReporte] = usarEstado<Reporte | null>(null);
  const [cargando, establecerCargando] = usarEstado(true);
  const [renovando, establecerRenovando] = usarEstado(false);
  const [error, establecerError] = usarEstado(false);

  const consultar = usarFuncionRetorno(async (esRenovar = false) => {
    if (esRenovar) establecerRenovando(true);
    else establecerCargando(true);
    establecerError(false);
    try {
      const datos = await api.obtener<Reporte>('/administracion/analitica/transporte', { params: { range: intervalo } });
      establecerReporte(datos);
    } catch {
      establecerError(true);
    } finally {
      establecerCargando(false);
      establecerRenovando(false);
    }
  }, [intervalo]);

  usarEfecto(() => { void consultar(); }, [consultar]);

  const actual = reporte?.actual ?? VACIO;
  const anterior = reporte?.anterior;
  const completado = tasa(actual.completados, actual.solicitudes);
  const cancelado = tasa(actual.cancelados, actual.solicitudes);
  const completadoAnterior = anterior ? tasa(anterior.completados, anterior.solicitudes) : null;

  const manejarExport = async () => {
    if (!reporte) return;
    const filas = [
      ['Sección', 'Indicador', 'Valor'],
      ['Período', 'Desde', reporte.inicio], ['Período', 'Hasta', reporte.fin],
      ['Resumen', 'Solicitudes', actual.solicitudes],
      ['Resumen', 'Ingresos brutos (Bs)', actual.ingresos],
      ['Resumen', 'Tasa de completados', porcentaje(completado)],
      ['Resumen', 'Espera mediana (min)', actual.espera],
      ['Resultados', 'Aceptados', actual.aceptados],
      ['Resultados', 'Completados', actual.completados],
      ['Resultados', 'Cancelados', actual.cancelados],
      ['Resultados', 'Tasa de cancelación', porcentaje(cancelado)],
      ['Resultados', 'Vencidos sin asignar', actual.sin_asignar],
      ['Cobertura', 'Conductores con viajes completados', reporte.conductoras],
      ['Comisiones', 'Generada (Bs)', reporte.comisiones.registrados ? reporte.comisiones.generada : null],
      ['Comisiones', 'Pendiente (Bs)', reporte.comisiones.registrados ? reporte.comisiones.pendiente : null],
      ['Calidad', 'Calificación promedio', reporte.calidad.promedio],
      ['Calidad', 'Valoraciones', reporte.calidad.cantidad],
      ...reporte.tendencia.flatMap(p => [['Solicitudes', p.day, p.count], ['Ingresos brutos (Bs)', p.day, p.revenue]]),
      ...reporte.horas.map(h => ['Solicitudes por hora', horaTexto(h.hora), h.solicitudes]),
      ...reporte.zonas.flatMap(z => [['Solicitudes por zona', z.nombre, z.solicitudes], ['Vencidos sin asignar por zona', z.nombre, z.sin_asignar]]),
      ...reporte.cancelaciones.map(c => ['Cancelaciones', `${ACTORES[c.actor] ?? c.actor} / ${c.etapa}`, c.cantidad]),
      ...reporte.motivos.map(m => ['Motivos de cancelación', m.motivo, m.cantidad]),
    ];
    const csv = filas.map(fila => fila.map(celda => {
      const texto = String(celda ?? '');
      const seguro = typeof celda === 'string' && /^[\s]*[=+\-@]/.test(texto) ? "'" + texto : texto;
      return '"' + seguro.replace(/"/g, '""') + '"';
    }).join(',')).join('\n');
    await Share.share({ message: csv, title: `Reporte Línea Lila - ${PERIODOS[intervalo]}` }).catch(() => undefined);
  };

  return (
    <SeguraZonaVista style={s.container}>
      <EstadoBar barStyle="dark-content" backgroundColor={C.white} />
      <HBar navigation={navigation} exportar={reporte && !error && !cargando ? manejarExport : undefined} />
      <Vista style={s.tabRow}>
        {(Object.keys(PERIODOS) as Intervalo[]).map(r => (
          <PulsableOpacidad
            key={r}
            style={[s.tab, intervalo === r && s.tabActive]}
            onPress={() => { if (r !== intervalo) { establecerCargando(true); establecerIntervalo(r); } }}
            disabled={cargando || renovando}
            accessibilityRole="button"
            accessibilityState={{ selected: intervalo === r, disabled: cargando || renovando }}>
            <Texto style={[s.tabTxt, intervalo === r && s.tabTxtActive]}>{PERIODOS[r]}</Texto>
          </PulsableOpacidad>
        ))}
      </Vista>

      {cargando ? (
        <Vista style={s.centered}><ActividadIndicador size="large" color={C.primary} /><Texto style={s.loadTxt}>Cargando reporte…</Texto></Vista>
      ) : error || !reporte ? (
        <Vista style={s.centered}>
          <Texto style={s.loadTxt}>No se pudo cargar el reporte.</Texto>
          <PulsableOpacidad style={s.detailButton} onPress={() => consultar()} accessibilityRole="button">
            <Texto style={s.detailLabel}>Reintentar</Texto>
          </PulsableOpacidad>
        </Vista>
      ) : (
        <DesplazableVista
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RenovarControl refreshing={renovando} onRefresh={() => consultar(true)} colors={[C.primary]} />}>
          <Texto style={s.periodo}>{fechaCorta(reporte.inicio)} – {fechaCorta(reporte.fin)}/{reporte.fin.slice(0, 4)} · hora de Bolivia</Texto>
          <Grupo titulo="Resumen">
            <KPI icon={MapPin} label="Viajes solicitados" value={actual.solicitudes} delta={cambio(actual.solicitudes, anterior?.solicitudes)} />
            <KPI icon={CircleCheck} label="Tasa de viajes completados" value={porcentaje(completado)}
              delta={completado !== null && completadoAnterior !== null ? completado - completadoAnterior : undefined} unidadDelta=" pp" />
            <KPI icon={Clock} label="Espera mediana hasta la recogida" value={minutos(actual.espera)}
              delta={actual.espera !== null ? cambio(actual.espera, anterior?.espera ?? undefined) : undefined} menorEsMejor />
            <KPI icon={DollarSign} label="Ingresos brutos de viajes" value={dinero(actual.ingresos)} delta={cambio(actual.ingresos, anterior?.ingresos)} last />
          </Grupo>
          {anterior && <Texto style={s.nota}>Comparación con el tramo equivalente del período anterior. pp = puntos porcentuales.</Texto>}

          <SEtiqueta text="Tendencia" />
          <Vista style={s.chartCard}>
            <Vista style={s.tabRowInterior}>
              {(['count', 'revenue'] as const).map(opcion => (
                <PulsableOpacidad key={opcion} onPress={() => establecerMetrica(opcion)}
                  style={[s.tab, metrica === opcion && s.tabActive]} accessibilityRole="button"
                  accessibilityState={{ selected: metrica === opcion }}>
                  <Texto style={[s.tabTxt, metrica === opcion && s.tabTxtActive]}>{opcion === 'count' ? 'Viajes' : 'Ingresos'}</Texto>
                </PulsableOpacidad>
              ))}
            </Vista>
            <Texto style={s.nota}>{metrica === 'count' ? 'Solicitudes' : 'Importe bruto en Bs'} por {intervalo === 'year' ? 'mes' : 'día'} de solicitud</Texto>
            <Grafico puntos={reporte.tendencia.map(p => ({ valor: p[metrica], etiqueta: intervalo === 'year' ? p.day.slice(5, 7) : fechaCorta(p.day) }))}
              formato={metrica === 'revenue' ? dinero : numero}
              etiqueta={reporte.tendencia.map(p => `${p.day}: ${metrica === 'count' ? p.count : dinero(p.revenue)}`).join(', ')} />
          </Vista>

          <Grupo titulo="Resultado de los viajes">
            <KPI icon={Users} label="Aceptados" value={actual.aceptados} />
            <KPI icon={CircleCheck} label="Completados" value={actual.completados} detail={completado === null ? undefined : porcentaje(completado) + ' de las solicitudes'} />
            <KPI icon={CircleX} label="Cancelados" value={actual.cancelados} detail={cancelado === null ? undefined : porcentaje(cancelado) + ' de las solicitudes'} />
            <KPI icon={Clock} label="Vencidos sin asignar" value={actual.sin_asignar} last />
          </Grupo>
          <Texto style={s.nota}>Un viaje aceptado también puede aparecer como completado o cancelado.</Texto>

          <PulsableOpacidad style={s.detailButton} onPress={() => establecerMostrarDetalle(valor => !valor)}
            accessibilityRole="button" accessibilityState={{ expanded: mostrarDetalle }}>
            <Texto style={s.detailLabel}>{mostrarDetalle ? 'Ocultar detalles' : 'Ver detalles del reporte'}</Texto>
            <ChevronDown size={25} color={C.primary} style={{ transform: [{ rotate: mostrarDetalle ? '180deg' : '0deg' }] }} />
          </PulsableOpacidad>

          {mostrarDetalle && <>
            <Grupo titulo="Demanda y cobertura">
              <KPI icon={Users} label="Conductores con viajes completados" value={reporte.conductoras} last />
              <SEtiqueta text="Solicitudes por hora" />
              <Grafico puntos={reporte.horas.map(h => ({ valor: h.solicitudes, etiqueta: horaTexto(h.hora) }))}
                etiqueta={reporte.horas.map(h => `${horaTexto(h.hora)}: ${h.solicitudes} solicitudes`).join(', ')} />
              <SEtiqueta text="Zonas con más viajes sin asignar" />
              {reporte.zonas.length ? reporte.zonas.map(z => (
                <Fila key={z.nombre} nombre={z.nombre} detalle={`${z.solicitudes} solicitudes`} valor={`${z.sin_asignar} sin asignar`} />
              )) : <Texto style={s.empty}>Sin solicitudes en el período</Texto>}
            </Grupo>
            <Grupo titulo="Ingresos y comisiones">
              <KPI icon={DollarSign} label="Ingresos brutos de viajes" value={dinero(actual.ingresos)} />
              <Fila nombre="Comisión generada" valor={reporte.comisiones.registrados ? dinero(reporte.comisiones.generada) : 'Sin datos'} />
              <Fila nombre="Comisión pendiente de cobro" detalle="Saldo actual de los viajes del período" valor={reporte.comisiones.registrados ? dinero(reporte.comisiones.pendiente) : 'Sin datos'} />
            </Grupo>
            <Grupo titulo="Calidad del servicio">
              <KPI icon={Star} label="Calificación de pasajeros" detail={`${reporte.calidad.cantidad} valoraciones`}
                value={reporte.calidad.promedio === null ? 'Sin datos' : `${numero(reporte.calidad.promedio)} / 5`} />
              <KPI icon={Clock} label="Espera mediana hasta la recogida" value={minutos(actual.espera)} last />
              <SEtiqueta text="Motivos de cancelación más frecuentes" />
              {reporte.motivos.length ? reporte.motivos.map(m => <Fila key={m.motivo} nombre={m.motivo} valor={m.cantidad} />)
                : <Texto style={s.empty}>Sin motivos registrados</Texto>}
              <SEtiqueta text="Cancelaciones por responsable y etapa" />
              {reporte.cancelaciones.length ? reporte.cancelaciones.map(c => (
                <Fila key={`${c.actor}-${c.etapa}`} nombre={ACTORES[c.actor] ?? c.actor} detalle={c.etapa} valor={c.cantidad} />
              )) : <Texto style={s.empty}>Sin cancelaciones en el período</Texto>}
            </Grupo>
          </>}
        </DesplazableVista>
      )}
    </SeguraZonaVista>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const HBar = ({ navigation: navegacion, exportar }: {navigation: NavPropiedad; exportar?: () => void;}) =>
<Vista style={s.header}>
    <PulsableOpacidad onPress={() => navegacion.goBack()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver"><ArrowLeft size={25} color={C.primary} /></PulsableOpacidad>
    <Texto style={s.headerTitle}>Análisis y reportes</Texto>
    {exportar ? (
      <PulsableOpacidad style={s.exportBtn} onPress={exportar} accessibilityRole="button" accessibilityLabel="Exportar reporte CSV">
        <Download size={25} color={C.primary} />
      </PulsableOpacidad>
    ) : <Vista style={s.backBtn} />}
  </Vista>;


const SEtiqueta = ({ text: texto }: {text: string;}) => <Texto style={s.sLabel}>{texto}</Texto>;

const KPI = ({ icon: Icono, label: etiqueta, value: valor, delta, detail, last, unidadDelta = "%", menorEsMejor = false }: {
  icon: typeof MapPin;
  label: string;
  value: string | number;
  delta?: number;
  detail?: string;
  last?: boolean;
  unidadDelta?: string;
  menorEsMejor?: boolean;
}) => {
  const colorDelta = !delta ? C.textSub : (delta > 0) === menorEsMejor ? C.error : C.success;
  return <Vista style={[s.kpiRow, !last && s.kpiDivider]}>
    <Icono size={25} color={C.primary} />
    <Vista style={s.kpiDescription}>
      <Texto style={s.kpiLabel}>{etiqueta}</Texto>
      {detail && <Texto style={s.kpiDetail}>{detail}</Texto>}
    </Vista>
    <Vista style={s.kpiResult}>
      <Texto style={s.kpiValue}>{typeof valor === 'number' ? valor.toLocaleString() : valor}</Texto>
      {delta !== undefined && (
        <Vista style={s.deltaBadge}>
          {delta > 0 ? <TrendingUp size={12} color={colorDelta} /> : delta < 0 ? <TrendingDown size={12} color={colorDelta} /> : null}
          <Texto style={[s.deltaTxt, { color: colorDelta }]}>{delta > 0 ? '+' : ''}{numero(delta)}{unidadDelta}</Texto>
        </Vista>
      )}
    </Vista>
  </Vista>;


};

const s = EstiloHoja.create({
  container: { flex: 1, backgroundColor: C.white },
  header: { backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center', letterSpacing: 0.1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadTxt: { fontSize: 14, color: C.textSub },

  tabRow: { flexDirection: 'row', marginHorizontal: 16, padding: 4, gap: 4, backgroundColor: '#F5F5F7', borderRadius: 24 },
  tab: { flex: 1, minHeight: 40, justifyContent: 'center', borderRadius: 20, alignItems: 'center' },
  tabActive: { backgroundColor: C.text },
  tabTxt: { fontSize: 13, fontWeight: '600', color: C.textSub },
  tabTxtActive: { color: C.white },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 },

  periodo: { fontSize: 13, color: C.textSub, marginHorizontal: 4 },
  nota: { fontSize: 12, color: C.textSub, marginTop: 8, lineHeight: 17 },
  empty: { fontSize: 13, color: C.textSub, textAlign: 'center', paddingVertical: 14 },
  tabRowInterior: { flexDirection: 'row', padding: 4, gap: 4, backgroundColor: '#F5F5F7', borderRadius: 24 },
  sLabel: { fontSize: 13, fontWeight: '600', color: '#7A7A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 18, marginBottom: 12, marginLeft: 4 },

  kpiGrid: { backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  kpiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 54 },
  kpiDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  kpiDescription: { flex: 1 },
  kpiResult: { alignItems: 'flex-end', maxWidth: '45%' },
  kpiValue: { fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'right' },
  kpiLabel: { fontSize: 15, color: C.text, fontWeight: '500' },
  kpiDetail: { fontSize: 13, color: C.textSub, marginTop: 2 },
  deltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  deltaTxt: { fontSize: 12, fontWeight: '600' },

  chartCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },

  exportBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  detailButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderRadius: 24, backgroundColor: '#F5F5F7', paddingHorizontal: 16, marginTop: 20 },
  detailLabel: { fontSize: 15, fontWeight: '500', color: C.text }
});

export default AdministradorAnaliticaPantalla;
