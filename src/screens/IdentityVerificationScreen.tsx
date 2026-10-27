import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, NativeModules, ScrollView, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import type { OcrCropRect } from '../services/ocr.service';
import api from '../services/api.client';
import { API_BASE_URL, FACE_LIVENESS_ENABLED } from '../config/constants';

import { DocumentCameraModal, type FrameRect } from '../components/DocumentCameraModal';
import ConfirmBottomSheet from '../components/ConfirmBottomSheet';
import Toast from '../components/Toast';
import { signOut as signOutFirebase } from '../services/firebase.service';

type Side = 'ciFront' | 'ciBack';
type MrzComparison = 'match' | 'mismatch' | 'invalid' | 'unsupported' | 'unavailable' | 'incomplete' | 'not_applicable';
const MRZ_OBSERVATIONS: Partial<Record<MrzComparison, string>> = {
  mismatch: 'Los datos de la zona MRZ no coinciden completamente con el frente del CI.',
  invalid: 'La zona MRZ tiene dígitos de control incorrectos.',
  unsupported: 'El formato de la zona MRZ no permitió compararla con el frente del CI.',
  unavailable: 'No se pudo leer la zona MRZ del reverso.',
  incomplete: 'No se pudo completar la comparación de la zona MRZ con el frente del CI.',
};
type CheckedCi = { ocrTicket: string };
type Observation = { title: string; message: string; rescan?: boolean };
type CiCapture = { front: string; back: string; crops: Record<Side, OcrCropRect | null> };
const MAX_CI_ATTEMPTS = 3;
const ciReadFailureMessage = (remaining: number) =>
  `No se pudo verificar tu cédula de identidad. Toma las fotos en un lugar con buena luz y encuadra el documento correctamente. Te quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'}.`;

export default function IdentityVerificationScreen() {
  const { user, token, updateUser, logout, showRegistrationSuccessToast } = useAuth();
  const insets = useSafeAreaInsets();
  const [side, setSide] = useState<Side | null>(null);
  const [photos, setPhotos] = useState<Record<Side, string | null>>({ ciFront: null, ciBack: null });
  const [photoCrops, setPhotoCrops] = useState<Record<Side, OcrCropRect | null>>({ ciFront: null, ciBack: null });
  const [selfieVisible, setSelfieVisible] = useState(false);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentToastVisible, setConsentToastVisible] = useState(false);
  const [limitToastVisible, setLimitToastVisible] = useState(false);
  const [hasScannedCi, setHasScannedCi] = useState(false);
  const [checkedCi, setCheckedCi] = useState<CheckedCi | null>(null);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [attemptsLoaded, setAttemptsLoaded] = useState(false);
  const attemptsRef = useRef(0);
  const rescanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitting = useRef(false);
  const switchingAccount = useRef(false);
  const verificationApprovedRef = useRef(false);
  const attemptsKey = user?.id ? `identity-ci-ocr-failures:${user.id}` : null;

  useEffect(() => {
    let active = true;
    setAttemptsLoaded(false);
    attemptsRef.current = 0;
    setAttempts(0);
    setLimitToastVisible(false);
    if (attemptsKey) {
      AsyncStorage.getItem(attemptsKey)
        .then(value => {
          if (!active) return;
          const parsed = Number(value);
          const count = Number.isInteger(parsed) ? Math.min(MAX_CI_ATTEMPTS, Math.max(0, parsed)) : 0;
          attemptsRef.current = count;
          setAttempts(count);
          setLimitToastVisible(count >= MAX_CI_ATTEMPTS);
        })
        .catch(() => {})
        .finally(() => { if (active) setAttemptsLoaded(true); });
    } else {
      setAttemptsLoaded(true);
    }
    return () => { active = false; };
  }, [attemptsKey]);

  useEffect(() => () => {
    if (rescanTimer.current) clearTimeout(rescanTimer.current);
  }, []);
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const data: any = await api.get('/auth/me', { headers: { 'Cache-Control': 'no-cache' } });
      if (data?.user?.id && data.user.identityVerificationStatus &&
          (!verificationApprovedRef.current || data.user.identityVerificationStatus === 'verified')) {
        updateUser(data.user);
      }
    } catch {
      // La captura sigue disponible; el envío mostrará el error de red si persiste.
    }
  }, [updateUser]);

  useEffect(() => {
    if (user?.identityDocumentsSubmitted && user.identityVerificationStatus !== 'verified' && token) {
      refreshStatus();
    }
  }, [user?.identityDocumentsSubmitted, user?.identityVerificationStatus, token, refreshStatus]);

  const recordOcrFailure = async (): Promise<number> => {
    const count = Math.min(MAX_CI_ATTEMPTS, attemptsRef.current + 1);
    attemptsRef.current = count;
    setAttempts(count);
    if (attemptsKey) {
      try { await AsyncStorage.setItem(attemptsKey, String(count)); } catch {}
    }
    return count;
  };

  const scan = (next: Side) => {
    if (saving || !attemptsLoaded) return;
    if (attemptsRef.current >= MAX_CI_ATTEMPTS) {
      setLimitToastVisible(true);
      return;
    }
    if (!consent) {
      setConsentToastVisible(true);
      return;
    }
    setSide(next);
  };

  const useAnotherAccount = async () => {
    if (switchingAccount.current) return;
    switchingAccount.current = true;
    try {
      try { await signOutFirebase(); } catch {}
      await logout();
    } finally {
      switchingAccount.current = false;
    }
  };

  const applyCapture = (uri: string, crop?: OcrCropRect) => {
    const current = side;
    setSide(null);
    if (!current) return;
    setCheckedCi(null);
    setObservation(null);
    const nextPhotos = { ...photos, [current]: uri };
    const nextCrops = { ...photoCrops, [current]: crop || null };
    setPhotos(nextPhotos);
    setPhotoCrops(nextCrops);
    if (nextPhotos.ciFront && nextPhotos.ciBack) {
      setHasScannedCi(true);
      verifyCi({ front: nextPhotos.ciFront, back: nextPhotos.ciBack, crops: nextCrops });
    }
  };

  const applyBothCaptures = (
    front: { uri: string; frame?: FrameRect },
    back: { uri: string; frame?: FrameRect },
  ) => {
    setSide(null);
    setCheckedCi(null);
    setObservation(null);
    const crops = {
      ciFront: (front.frame as unknown as OcrCropRect) || null,
      ciBack: (back.frame as unknown as OcrCropRect) || null,
    };
    setPhotos(prev => ({ ...prev, ciFront: front.uri, ciBack: back.uri }));
    setPhotoCrops(crops);
    setHasScannedCi(true);
    verifyCi({ front: front.uri, back: back.uri, crops });
  };

  const applySelfieCapture = (uri: string) => {
    setSelfieVisible(false);
    setSelfiePhoto(uri);
  };

  const appendCiToForm = (form: FormData, capture: CiCapture) => {
    for (const imageSide of ['ciFront', 'ciBack'] as const) {
      const crop = capture.crops[imageSide];
      if (!crop) continue;
      form.append(`${imageSide}CropX`, String(crop.x));
      form.append(`${imageSide}CropY`, String(crop.y));
      form.append(`${imageSide}CropW`, String(crop.w));
      form.append(`${imageSide}CropH`, String(crop.h));
      form.append(`${imageSide}CropScreenW`, String(crop.screenW));
      form.append(`${imageSide}CropScreenH`, String(crop.screenH));
    }
    form.append('ciFront', { uri: capture.front, type: 'image/jpeg', name: 'ci-front.jpg' } as any);
    form.append('ciBack', { uri: capture.back, type: 'image/jpeg', name: 'ci-back.jpg' } as any);
  };

  const clearCapture = () => {
    setPhotos({ ciFront: null, ciBack: null });
    setPhotoCrops({ ciFront: null, ciBack: null });
    setCheckedCi(null);
  };

  const completeVerification = async (ticket: string | null, capture: CiCapture) => {
    try {
      const form = new FormData();
      form.append('consent', 'true');
      if (FACE_LIVENESS_ENABLED) {
        form.append('ocrTicket', ticket!);
        const detector = NativeModules.FaceLivenessModule;
        if (!detector?.startFaceLivenessDetection) throw new Error('La prueba de vida nativa no está disponible en esta versión de la app.');
        const liveness: any = await api.post('/auth/face-liveness/session');
        await detector.startFaceLivenessDetection(liveness.sessionId, liveness.region, liveness.credentials);
        form.append('livenessSessionId', liveness.sessionId);
        form.append('livenessTicket', liveness.ticket);
      } else {
        form.append('selfie', { uri: selfiePhoto!, type: 'image/jpeg', name: 'identity-selfie.jpg' } as any);
      }
      appendCiToForm(form, capture);
      const response = await fetch(`${API_BASE_URL}/auth/verify-identity`, {
        method: 'POST', body: form,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data: any = await response.json();
      if (!response.ok) {
        throw Object.assign(new Error(data.error || 'No se pudo completar la verificación.'), { data, status: response.status });
      }
      // Un 200 de este endpoint se envía solo después de aprobar y guardar
      // CI, prueba de vida y comparación facial en el servidor.
      verificationApprovedRef.current = true;
      updateUser({ ...data.user, identityVerificationStatus: 'verified', identityDocumentsSubmitted: true, identityRejectionReason: null });
      showRegistrationSuccessToast();
      clearCapture();
      setObservation(null);
      setSelfiePhoto(null);
      if (attemptsKey) {
        try { await AsyncStorage.removeItem(attemptsKey); } catch {}
      }
    } catch (error: any) {
      if (error?.code === 'E_LIVENESS_CANCELLED' || /UserCancelledException|CancelledException/i.test(String(error?.message || ''))) {
        setObservation(null);
        return;
      }
      if (error?.status === 409 && String(error?.data?.error || '').includes('ya está verificada')) {
        verificationApprovedRef.current = true;
        updateUser({ identityVerificationStatus: 'verified', identityDocumentsSubmitted: true, identityRejectionReason: null });
        return;
      }
      const ticketExpired = String(error?.data?.error || error?.message || '').includes('lectura del CI expiró');
      if (ticketExpired) clearCapture();
      setObservation({
        title: error?.data?.code === 'UNDERAGE' ? 'Menor de edad' : error?.status === 422 ? 'Observación del CI' : 'No pudimos verificar tu identidad',
        message: error?.data?.error || error?.message || 'No se pudo completar la verificación.',
        rescan: ticketExpired && attemptsRef.current < MAX_CI_ATTEMPTS,
      });
    }
  };

  const verifyCi = async (capture: CiCapture) => {
    if (submitting.current || !consent || !attemptsLoaded || attemptsRef.current >= MAX_CI_ATTEMPTS) return;
    submitting.current = true;
    setSaving(true);
    setObservation(null);
    try {
      if (!FACE_LIVENESS_ENABLED) {
        if (!selfiePhoto) return;
        await completeVerification(null, capture);
        return;
      }
      const form = new FormData();
      form.append('consent', 'true');
      appendCiToForm(form, capture);
      const response = await fetch(`${API_BASE_URL}/auth/verify-identity/ocr`, {
        method: 'POST', body: form,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const checked: any = await response.json();
      if (response.status === 409 && String(checked.error || '').includes('ya está verificada')) {
        verificationApprovedRef.current = true;
        updateUser({ identityVerificationStatus: 'verified', identityDocumentsSubmitted: true, identityRejectionReason: null });
        return;
      }
      const mrzObservation = response.ok ? MRZ_OBSERVATIONS[checked.mrzComparison as MrzComparison] : null;
      if (response.status === 422 || mrzObservation) {
        const count = await recordOcrFailure();
        clearCapture();
        const remaining = MAX_CI_ATTEMPTS - count;
        const underage = checked.code === 'UNDERAGE';
        setObservation({
          title: underage ? 'Menor de edad' : 'Se produjo un error',
          message: underage ? (checked.error || 'No se permite el registro de menores de edad.') : ciReadFailureMessage(remaining),
          rescan: !underage && remaining > 0,
        });
        return;
      }
      if (!response.ok) {
        setObservation({ title: 'No pudimos verificar tu identidad', message: checked.error || 'Intenta nuevamente.' });
        return;
      }
      if (!checked.ocrTicket) throw new Error('No se recibió la confirmación de lectura del CI. Intenta nuevamente.');
      setCheckedCi({ ocrTicket: checked.ocrTicket });
      await completeVerification(checked.ocrTicket, capture);
    } catch (error: any) {
      setObservation({ title: 'No pudimos verificar tu identidad', message: error?.message || 'Revisa tu conexión e intenta nuevamente.' });
    } finally {
      setSaving(false);
      submitting.current = false;
    }
  };

  const retryVerification = async () => {
    if (submitting.current || !photos.ciFront || !photos.ciBack || !consent) return;
    const capture = { front: photos.ciFront, back: photos.ciBack, crops: photoCrops };
    if (!FACE_LIVENESS_ENABLED || !checkedCi) {
      await verifyCi(capture);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setObservation(null);
    try { await completeVerification(checkedCi.ocrTicket, capture); }
    finally { setSaving(false); submitting.current = false; }
  };

  const closeObservation = () => {
    const rescan = observation?.rescan && attemptsRef.current < MAX_CI_ATTEMPTS;
    setObservation(null);
    if (attemptsRef.current >= MAX_CI_ATTEMPTS) setLimitToastVisible(true);
    if (rescan) {
      if (rescanTimer.current) clearTimeout(rescanTimer.current);
      rescanTimer.current = setTimeout(() => { setSide('ciFront'); rescanTimer.current = null; }, 400);
    }
  };

  const ready = !!photos.ciFront && !!photos.ciBack;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={s.topBar}>
        <TouchableOpacity style={s.topAccountButton} onPress={useAnotherAccount} disabled={saving} accessibilityRole="button">
          <Text style={s.accountText}>Usar otra cuenta</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.mainScroll} contentContainerStyle={s.content}>
        <View style={s.icon}><ShieldCheck size={32} color="#7514C5" /></View>
        <Text style={s.title}>Verifica tu identidad</Text>
        <Text style={s.slogan}>Viaja con confianza desde el primer paso</Text>
        {user?.identityVerificationStatus === 'rejected' && <Text style={s.cardSub}>{user.identityRejectionReason || 'La verificación anterior fue rechazada. Captura nuevamente ambas caras del CI.'}</Text>}
        {ready && !FACE_LIVENESS_ENABLED && <View style={s.card}>
          <Camera size={24} color="#7514C5" />
          <View style={s.selfieContent}>
            <Text style={s.cardTitle}>Selfie</Text>
            <Text style={s.cardSub}>{selfiePhoto ? 'Selfie capturada' : 'Toma una foto normal de tu rostro'}</Text>
          </View>
          <TouchableOpacity style={s.selfieButton} disabled={saving} onPress={() => setSelfieVisible(true)}>
            <Text style={s.selfieButtonText}>{selfiePhoto ? 'Repetir' : 'Tomar'}</Text>
          </TouchableOpacity>
        </View>}
        {saving && <ActivityIndicator
          style={s.ocrSpinner}
          size="large"
          color="#7514C5"
          accessibilityLabel="Verificación en curso"
        />}
        {ready && !saving && FACE_LIVENESS_ENABLED && !checkedCi && <TouchableOpacity style={s.complete} onPress={() => { retryVerification(); }} disabled={!consent}><Text style={s.primaryText}>Reintentar lectura</Text></TouchableOpacity>}
        {ready && !FACE_LIVENESS_ENABLED && !!selfiePhoto && <TouchableOpacity style={s.complete} onPress={() => { retryVerification(); }} disabled={saving || !consent}><Text style={s.primaryText}>Confirmar y verificar identidad</Text></TouchableOpacity>}
      </ScrollView>
      {!ready && !checkedCi && attempts < MAX_CI_ATTEMPTS && !saving && <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        {(!hasScannedCi || !consent) && <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          style={s.consentRow}
          onPress={() => { setConsent(value => !value); setConsentToastVisible(false); setObservation(null); }}
        >
          <View style={[s.consentBox, consent && s.consentBoxChecked]}>
            {consent && <Text style={s.consentCheck}>✓</Text>}
          </View>
          <Text style={s.consentText}>Autorizo la verificación de mi identidad con las fotos de mi cédula de identidad y la verificación facial.</Text>
        </TouchableOpacity>}
        <TouchableOpacity style={[s.footerButton, !consent && s.footerButtonUnauthorised]} onPress={() => scan(photos.ciFront ? 'ciBack' : 'ciFront')} disabled={!attemptsLoaded} accessibilityRole="button">
          <Text style={[s.footerButtonText, !consent && s.footerButtonTextUnauthorised]}>Continuar</Text>
        </TouchableOpacity>
      </View>}
      {ready && checkedCi && !saving && FACE_LIVENESS_ENABLED && <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <TouchableOpacity style={s.footerButton} onPress={() => { retryVerification(); }} accessibilityRole="button">
          <Text style={s.footerButtonText}>Continuar prueba de vida</Text>
        </TouchableOpacity>
      </View>}
      <DocumentCameraModal
        visible={side !== null}
        documentType="ci"
        title={side === 'ciBack' ? 'CI — parte posterior' : 'CI — parte frontal'}
        frameLabel={
          side === 'ciBack'
            ? 'Coloca la parte trasera de tu cédula dentro del recuadro'
            : 'Coloca el frente de tu cédula dentro del recuadro'
        }
        twoSided={side === 'ciFront' && !photos.ciBack}
        initialSide={side === 'ciBack' ? 'back' : 'front'}
        onCapture={applyCapture}
        onCaptureBoth={applyBothCaptures}
        onClose={() => setSide(null)}
      />
      <DocumentCameraModal visible={selfieVisible} title="Toma una selfie" cameraPosition="front" frameLabel="Centra tu rostro y mira hacia la cámara" onCapture={applySelfieCapture} onClose={() => setSelfieVisible(false)} />
      <ConfirmBottomSheet
        visible={observation !== null}
        title={observation?.title || ''}
        message={observation?.message || ''}
        confirmLabel="Entendido"
        cancelLabel={null}
        onConfirm={closeObservation}
        onCancel={closeObservation}
      />
      <Toast
        visible={consentToastVisible}
        message="Autoriza la verificación de identidad para continuar"
        icon="!"
        onHide={() => setConsentToastVisible(false)}
      />
      <Toast
        visible={limitToastVisible && observation === null}
        message="Agotaste tus tres intentos de lectura del CI"
        icon="!"
        duration={5000}
        onHide={() => setLimitToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  mainScroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  topBar: { paddingHorizontal: 20, paddingTop: 48, alignItems: 'center' },
  topAccountButton: { minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3EAFC', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 25, fontWeight: '800', color: '#111118', textAlign: 'center' },
  slogan: { marginTop: 10, color: '#7A7A8A', fontSize: 15, textAlign: 'center' },
  card: { flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 16, padding: 18, marginBottom: 16 }, cardTitle: { fontSize: 16, fontWeight: '700', color: '#111118' }, cardSub: { fontSize: 13, color: '#7A7A8A', marginTop: 3 },
  complete: { backgroundColor: '#16A34A', height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  selfieButton: { backgroundColor: '#7514C5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }, selfieButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  selfieContent: { flex: 1 },
  accountText: { color: '#111118', fontSize: 14, fontWeight: '700' },
  ocrSpinner: { marginTop: 16, alignSelf: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#FFFFFF' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16, paddingVertical: 6 },
  consentBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#9A9AA3', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consentBoxChecked: { backgroundColor: '#111118', borderColor: '#111118' },
  consentCheck: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 17 },
  consentText: { flex: 1, color: '#666670', fontSize: 12, lineHeight: 17 },
  footerButton: { minHeight: 56, borderRadius: 12, backgroundColor: '#111118', alignItems: 'center', justifyContent: 'center' },
  footerButtonUnauthorised: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8D8DE' },
  footerButtonText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', textAlign: 'center' },
  footerButtonTextUnauthorised: { color: '#111118' },
});
