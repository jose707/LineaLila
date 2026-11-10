import React, { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Brain, Camera, Car, Check, ClipboardList, FileText, MapPin, ShieldCheck, X } from 'lucide-react-native';
import { usarAjustes } from '../context/AjustesContexto';

const documentos = ['Licencia de conducir', 'Tarjeta de identificación del conductor (TIC)', 'Certificado de antecedentes', 'RUAT del vehículo', 'SOAT', 'Fotografía actual del vehículo', 'Comprobante de domicilio'];
const total = 3;

export default function ConductorGuiaPantalla() {
  const navegacion = useNavigation<any>();
  const ruta = useRoute<any>();
  const { settings } = usarAjustes();
  const oscuro = settings.darkMode;
  const carrusel = useRef<ScrollView>(null);
  const [ancho, establecerAncho] = useState(0);
  const [pagina, establecerPagina] = useState(0);
  const alDeslizar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (ancho) establecerPagina(Math.max(0, Math.min(total - 1, Math.round(evento.nativeEvent.contentOffset.x / ancho))));
  };
  const tarjeta = [s.tarjeta, oscuro && s.tarjetaOscura];
  const texto = oscuro && s.textoClaro;
  const secundario = oscuro && s.secundarioOscuro;
  return <SafeAreaView style={[s.pantalla, oscuro && s.fondoOscuro]}>
    <View style={s.cabecera}>
      <TouchableOpacity style={s.cerrar} onPress={() => navegacion.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar"><X size={24} color={oscuro ? '#FFFFFF' : '#0D0D0D'} strokeWidth={2.8} /></TouchableOpacity>
      <Text style={[s.tituloCabecera, texto]} numberOfLines={1}>Solicitud de conductor</Text><View style={s.espacio} />
    </View>
    <View style={s.contenedor} onLayout={evento => establecerAncho(evento.nativeEvent.layout.width)}>
      {ancho > 0 && <ScrollView ref={carrusel} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={alDeslizar}>
        <ScrollView style={{ width: ancho }} contentContainerStyle={s.pagina} showsVerticalScrollIndicator={false}>
          <View style={[s.ilustracion, oscuro && s.ilustracionOscura]}><View style={s.anillo}><Car size={78} color="#7514C5" strokeWidth={1.8} /><View style={[s.insignia, s.insigniaDerecha, oscuro && s.insigniaOscura]}><Check size={25} color="#7514C5" strokeWidth={2.5} /></View><View style={[s.insignia, s.insigniaIzquierda, oscuro && s.insigniaOscura]}><FileText size={23} color="#7514C5" strokeWidth={2.5} /></View></View></View>
          <Text style={[s.titulo, texto]}>Ten tus documentos listos</Text>
          <Text style={[s.descripcion, secundario]}>Prepara estos documentos y tu vehículo antes de comenzar el registro.</Text>
          <View style={tarjeta}>{documentos.map(documento => <View key={documento} style={s.fila}><Check size={20} color="#7514C5" strokeWidth={2.5} /><Text style={[s.filaTexto, texto]}>{documento}</Text></View>)}</View>
          <View style={[s.tarjeta, s.recomendacion, oscuro && s.tarjetaOscura]}><ShieldCheck size={25} color="#7514C5" strokeWidth={2.5} /><Text style={[s.pasoTexto, s.textoRecomendacion, s.flex, secundario]}>Busca un lugar bien iluminado y toma fotos legibles, sin reflejos ni bordes cortados.</Text></View>
        </ScrollView>
        <ScrollView style={{ width: ancho }} contentContainerStyle={s.pagina} showsVerticalScrollIndicator={false}>
          <View style={[s.ilustracion, oscuro && s.ilustracionOscura]}><View style={s.anillo}><ClipboardList size={78} color="#7514C5" strokeWidth={1.8} /><View style={[s.insignia, s.insigniaDerecha, oscuro && s.insigniaOscura]}><Camera size={24} color="#7514C5" strokeWidth={2.5} /></View><View style={[s.insignia, s.insigniaIzquierda, oscuro && s.insigniaOscura]}><MapPin size={24} color="#7514C5" strokeWidth={2.5} /></View></View></View>
          <Text style={[s.titulo, texto]}>Completa tu solicitud</Text>
          <Text style={[s.descripcion, secundario]}>Sigue los pasos del formulario para enviar tu información.</Text>
          <View style={tarjeta}>
            <View style={s.paso}><FileText size={24} color="#7514C5" strokeWidth={2.5} /><View style={s.flex}><Text style={[s.pasoTitulo, texto]}>1. Completa tus datos</Text><Text style={[s.pasoTexto, secundario]}>Registra la información solicitada en el formulario.</Text></View></View>
            <View style={s.paso}><Camera size={24} color="#7514C5" strokeWidth={2.5} /><View style={s.flex}><Text style={[s.pasoTitulo, texto]}>2. Toma las fotografías</Text><Text style={[s.pasoTexto, secundario]}>Fotografía los documentos y las partes delantera y trasera del vehículo.</Text></View></View>
            <View style={s.paso}><MapPin size={24} color="#7514C5" strokeWidth={2.5} /><View style={s.flex}><Text style={[s.pasoTitulo, texto]}>3. Indica tu domicilio</Text><Text style={[s.pasoTexto, secundario]}>Adjunta el comprobante y señala la ubicación en el mapa.</Text></View></View>
          </View>
        </ScrollView>
        <ScrollView style={{ width: ancho }} contentContainerStyle={s.pagina} showsVerticalScrollIndicator={false}>
          <View style={[s.ilustracion, oscuro && s.ilustracionOscura]}><View style={s.anillo}><Brain size={78} color="#7514C5" strokeWidth={1.8} /><View style={[s.insignia, s.insigniaDerecha, oscuro && s.insigniaOscura]}><ShieldCheck size={25} color="#7514C5" strokeWidth={2.5} /></View><View style={[s.insignia, s.insigniaIzquierda, oscuro && s.insigniaOscura]}><Check size={25} color="#7514C5" strokeWidth={2.5} /></View></View></View>
          <Text style={[s.titulo, texto]}>Revisión y evaluación psicológica</Text>
          <Text style={[s.descripcion, secundario]}>Después de enviar tu solicitud, nuestro equipo revisará tus documentos.</Text>
          <View style={tarjeta}><Text style={[s.pasoTitulo, texto]}>Evaluación psicológica</Text><Text style={[s.pasoTexto, secundario]}>Tras la aprobación de los documentos, deberás realizar una evaluación psicológica. Para aprobar tu registro se requiere un resultado apto y vigente.</Text></View>
          <View style={[s.tarjeta, s.recomendacion, oscuro && s.tarjetaOscura]}><ShieldCheck size={25} color="#7514C5" strokeWidth={2.5} /><Text style={[s.pasoTexto, s.textoRecomendacion, s.flex, secundario]}>El equipo revisará el resultado de la evaluación como parte de tu solicitud.</Text></View>
        </ScrollView>
      </ScrollView>}
    </View>
    <View style={[s.pie, oscuro && s.fondoOscuro]}>
      <View style={s.indicadores} accessibilityLabel={`Página ${pagina + 1} de ${total}`}>{Array.from({ length: total }, (_, indice) => <View key={indice} style={[s.punto, pagina === indice && s.puntoActivo]} />)}</View>
      {pagina === total - 1 && <TouchableOpacity style={s.boton} accessibilityRole="button" activeOpacity={0.85} onPress={() => navegacion.replace('DriverRegistration', { user: ruta.params?.user })}><Text style={s.botonTexto}>Comenzar registro</Text></TouchableOpacity>}
    </View>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' }, fondoOscuro: { backgroundColor: '#1A1A1A' }, cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }, cerrar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, espacio: { width: 42 }, tituloCabecera: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#0D0D0D' }, contenedor: { flex: 1 }, pagina: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 }, ilustracion: { width: 180, height: 180, borderRadius: 90, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', marginBottom: 6 }, ilustracionOscura: { backgroundColor: 'transparent' }, anillo: { width: 142, height: 142, borderRadius: 71, borderWidth: 1.5, borderColor: '#C89AEA', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }, insignia: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EAD5F8' }, insigniaOscura: { backgroundColor: '#2D2D2D', borderColor: '#68447F' }, insigniaDerecha: { right: -13, bottom: 5 }, insigniaIzquierda: { left: -13, top: 8 }, titulo: { fontSize: 23, fontWeight: '700', color: '#111118', textAlign: 'center' }, descripcion: { fontSize: 15, lineHeight: 22, color: '#7A7A8A', textAlign: 'center', marginBottom: 4 }, tarjeta: { padding: 16, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 14, backgroundColor: '#FFFFFF', gap: 16 }, recomendacion: { flexDirection: 'row', alignItems: 'center', gap: 12 }, textoRecomendacion: { marginTop: 0 }, tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' }, fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, filaTexto: { flex: 1, fontSize: 15, lineHeight: 21, color: '#111118' }, paso: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, flex: { flex: 1 }, pasoTitulo: { fontSize: 15, fontWeight: '700', color: '#111118' }, pasoTexto: { fontSize: 14, lineHeight: 20, color: '#7A7A8A', marginTop: 4 }, pie: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: '#FFFFFF' }, indicadores: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }, punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D9D9E0' }, puntoActivo: { width: 24, backgroundColor: '#7514C5' }, boton: { minHeight: 54, borderRadius: 12, backgroundColor: '#7514C5', alignItems: 'center', justifyContent: 'center' }, botonTexto: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' }, atras: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, atrasTexto: { fontSize: 15, fontWeight: '700', color: '#111118' }, textoClaro: { color: '#FFFFFF' }, secundarioOscuro: { color: '#BDBDC7' }
});






