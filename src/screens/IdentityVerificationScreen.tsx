import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Alert, NativeModules, ScrollView, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, CreditCard, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import type { OcrCropRect } from '../services/ocr.service';
import api from '../services/api.client';
import { API_BASE_URL, FACE_LIVENESS_ENABLED } from '../config/constants';

import { DocumentCameraModal } from '../components/DocumentCameraModal';
import { signOut as signOutFirebase } from '../services/firebase.service';

type Side = 'ciFront' | 'ciBack';

export default function IdentityVerificationScreen() {
  const { user, token, updateUser, logout } = useAuth();
  const [side, setSide] = useState<Side | null>(null);
  const [photos, setPhotos] = useState<Record<Side, string | null>>({ ciFront: null, ciBack: null });
  const [photoCrops, setPhotoCrops] = useState<Record<Side, OcrCropRect | null>>({ ciFront: null, ciBack: null });
  const [selfieVisible, setSelfieVisible] = useState(false);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const submitting = useRef(false);
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const data: any = await api.get('/auth/me', { headers: { 'Cache-Control': 'no-cache' } });
      if (data?.user?.id && data.user.identityVerificationStatus) updateUser(data.user);
    } catch {
      // La captura sigue disponible; el envío mostrará el error de red si persiste.
    }
  }, [updateUser]);

  useEffect(() => {
    if (user?.identityDocumentsSubmitted && user.identityVerificationStatus !== 'verified' && token) {
      void refreshStatus();
    }
  }, [user?.identityDocumentsSubmitted, user?.identityVerificationStatus, token, refreshStatus]);

  const scan = (next: Side) => {
    if (saving) return;
    if (!consent) {
      Alert.alert(
        'Autoriza la verificación',
        'Antes de escanear, marca la casilla para autorizar el envío de las imágenes a Google Vision y su almacenamiento cifrado si la identidad se verifica.',
      );
      return;
    }
    setSide(next);
  };

  const useAnotherAccount = () => {
    Alert.alert(
      'Usar otra cuenta',
      'Se cerrará esta sesión y podrás ingresar con otra cuenta registrada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try { await signOutFirebase(); } catch {}
            await logout();
          },
        },
      ],
    );
  };

  const applyCapture = (uri: string, crop?: OcrCropRect) => {
    const current = side;
    setSide(null);
    if (!current) return;
    setPhotos(prev => ({ ...prev, [current]: uri }));
    setPhotoCrops(prev => ({ ...prev, [current]: crop || null }));
  };

  const applySelfieCapture = (uri: string) => {
    setSelfieVisible(false);
    setSelfiePhoto(uri);
  };

  const submit = async () => {
    if (!ready || (!FACE_LIVENESS_ENABLED && !selfiePhoto) || submitting.current || !consent) return;
    submitting.current = true;
    setSaving(true);
    try {
      const form = new FormData();
      form.append('consent', 'true');
      if (FACE_LIVENESS_ENABLED) {
        const detector = NativeModules.FaceLivenessModule;
        if (!detector?.startFaceLivenessDetection) throw new Error('La prueba de vida nativa no está disponible en esta versión de la app.');
        const liveness: any = await api.post('/auth/face-liveness/session');
        await detector.startFaceLivenessDetection(liveness.sessionId, liveness.region, liveness.credentials);
        form.append('livenessSessionId', liveness.sessionId);
        form.append('livenessTicket', liveness.ticket);
      } else {
        form.append('selfie', { uri: selfiePhoto!, type: 'image/jpeg', name: 'identity-selfie.jpg' } as any);
      }
      for (const imageSide of ['ciFront', 'ciBack'] as const) {
        const crop = photoCrops[imageSide];
        if (!crop) continue;
        form.append(`${imageSide}CropX`, String(crop.x));
        form.append(`${imageSide}CropY`, String(crop.y));
        form.append(`${imageSide}CropW`, String(crop.w));
        form.append(`${imageSide}CropH`, String(crop.h));
        form.append(`${imageSide}CropScreenW`, String(crop.screenW));
        form.append(`${imageSide}CropScreenH`, String(crop.screenH));
      }
      form.append('ciFront', { uri: photos.ciFront!, type: 'image/jpeg', name: 'ci-front.jpg' } as any);
      form.append('ciBack', { uri: photos.ciBack!, type: 'image/jpeg', name: 'ci-back.jpg' } as any);
      const response = await fetch(`${API_BASE_URL}/auth/verify-identity`, {
        method: 'POST', body: form,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data: any = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.error || 'No se pudo completar la verificación.'), { data });
      // Un 200 de este endpoint se envía solo después de aprobar y guardar
      // CI, prueba de vida y comparación facial en el servidor.
      updateUser({ ...data.user, identityVerificationStatus: 'verified', identityDocumentsSubmitted: true, identityRejectionReason: null });
      setPhotos({ ciFront: null, ciBack: null });
      setPhotoCrops({ ciFront: null, ciBack: null });
      setSelfiePhoto(null);
      Alert.alert('Identidad verificada', data.message);
    } catch (error: any) {
      if (error?.status === 409 && String(error?.data?.error || '').includes('ya está verificada')) {
        updateUser({ identityVerificationStatus: 'verified', identityDocumentsSubmitted: true, identityRejectionReason: null });
        return;
      }
      Alert.alert('Error', error?.data?.error || error?.message || 'No se pudo completar la verificación.');
    } finally { setSaving(false); submitting.current = false; }
  };

  const ready = !!photos.ciFront && !!photos.ciBack;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.icon}><ShieldCheck size={32} color="#7514C5" /></View>
        <Text style={s.title}>Verifica tu identidad</Text>
        <Text style={s.subtitle}>{FACE_LIVENESS_ENABLED ? 'Captura ambas caras del CI. Al confirmar harás la prueba de vida; la imagen de tu rostro se comparará con el CI y, si se aprueba, será tu foto de perfil.' : 'Captura ambas caras del CI y una selfie. Al confirmar, el backend leerá el CI una sola vez y comparará la selfie con el rostro del documento.'}</Text>
        {user?.identityVerificationStatus === 'rejected' && <Text style={s.cardSub}>{user.identityRejectionReason || 'La verificación anterior fue rechazada. Captura nuevamente ambas caras del CI.'}</Text>}
        <View style={s.card}>
          <CreditCard size={24} color="#7514C5" />
          <View style={{ flex: 1 }}><Text style={s.cardTitle}>Cédula de identidad</Text><Text style={s.cardSub}>{photos.ciFront && photos.ciBack ? 'Ambos lados capturados' : photos.ciFront ? 'Frente capturado · falta reverso' : 'Captura frente y reverso'}</Text></View>
        </View>
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={s.accountButton} disabled={saving} onPress={() => setConsent(value => !value)}>
          <Text style={s.cardSub}>{consent ? '☑' : '☐'} {FACE_LIVENESS_ENABLED ? 'Autorizo el envío de las fotos del CI, la prueba de vida y la comparación facial. Si se aprueba mi identidad, se guardarán cifradas las fotos del CI y la imagen de referencia de mi rostro se usará como foto de perfil.' : 'Autorizo el envío de las fotos del CI para leerlas y validarlas, y de una selfie para compararla con el rostro del documento. Si se aprueba, se guardarán cifradas las fotos del CI; la selfie se usará solo para la comparación.'}</Text>
        </TouchableOpacity>
        {!photos.ciFront && <TouchableOpacity style={[s.primary, !consent && s.primaryNeedsConsent]} onPress={() => scan('ciFront')} disabled={saving} accessibilityRole="button"><Text style={s.primaryText}>{consent ? 'Capturar frente' : 'Autoriza para capturar el CI'}</Text></TouchableOpacity>}
        {!!photos.ciFront && !photos.ciBack && <TouchableOpacity style={s.primary} onPress={() => scan('ciBack')} disabled={saving} accessibilityRole="button"><Text style={s.primaryText}>Capturar reverso</Text></TouchableOpacity>}
        {!!photos.ciFront && <TouchableOpacity style={s.accountButton} disabled={saving} onPress={() => scan('ciFront')}><Text style={s.accountText}>Repetir frente</Text></TouchableOpacity>}
        {!!photos.ciBack && <TouchableOpacity style={s.accountButton} disabled={saving} onPress={() => scan('ciBack')}><Text style={s.accountText}>Repetir reverso</Text></TouchableOpacity>}
        {ready && !FACE_LIVENESS_ENABLED && <View style={s.card}>
          <Camera size={24} color="#7514C5" />
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Selfie</Text>
            <Text style={s.cardSub}>{selfiePhoto ? 'Selfie capturada' : 'Toma una foto normal de tu rostro'}</Text>
          </View>
          <TouchableOpacity style={s.selfieButton} disabled={saving} onPress={() => setSelfieVisible(true)}>
            <Text style={s.selfieButtonText}>{selfiePhoto ? 'Repetir' : 'Tomar'}</Text>
          </TouchableOpacity>
        </View>}
        {ready && (FACE_LIVENESS_ENABLED || !!selfiePhoto) && <TouchableOpacity style={s.complete} onPress={submit} disabled={saving || !consent}><Text style={s.primaryText}>{saving ? 'Validando identidad…' : 'Confirmar y verificar identidad'}</Text></TouchableOpacity>}
        <TouchableOpacity style={s.accountButton} onPress={useAnotherAccount} disabled={saving}>
          <Text style={s.accountText}>Usar otra cuenta</Text>
        </TouchableOpacity>
      </ScrollView>
      <DocumentCameraModal visible={side !== null} title={side === 'ciFront' ? 'CI — parte frontal' : 'CI — parte posterior'} frameLabel={side === 'ciFront' ? 'Coloca el frente de tu cédula dentro del recuadro' : 'Coloca la parte trasera de tu cédula dentro del recuadro'} onCapture={applyCapture} onClose={() => setSide(null)} />
      <DocumentCameraModal visible={selfieVisible} title="Toma una selfie" cameraPosition="front" frameLabel="Centra tu rostro y mira hacia la cámara" onCapture={applySelfieCapture} onClose={() => setSelfieVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' }, content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3EAFC', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 25, fontWeight: '800', color: '#111118', textAlign: 'center' }, subtitle: { fontSize: 15, lineHeight: 22, color: '#7A7A8A', textAlign: 'center', marginTop: 10, marginBottom: 30 },
  card: { flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 16, padding: 18, marginBottom: 16 }, cardTitle: { fontSize: 16, fontWeight: '700', color: '#111118' }, cardSub: { fontSize: 13, color: '#7A7A8A', marginTop: 3 },
  primary: { backgroundColor: '#7514C5', height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, primaryNeedsConsent: { backgroundColor: '#9360B7' }, complete: { backgroundColor: '#16A34A', height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  selfieButton: { backgroundColor: '#7514C5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }, selfieButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  accountButton: { alignSelf: 'center', paddingVertical: 18, paddingHorizontal: 12 }, accountText: { color: '#7514C5', fontSize: 14, fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', gap: 14 }, loading: { color: '#FFFFFF', fontWeight: '700' },
});
