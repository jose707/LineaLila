// src/context/ContextoAutenticacion.tsx
import React, {
  createContext as crearContexto,
  useState as usarEstado,
  useEffect as usarEfecto,
  ReactNode,
  useCallback as usarFuncionRetorno } from
'react';
import { Alert, Platform as Plataforma, PermissionsAndroid as PermisosAndroid, NativeModules as NativoModules } from 'react-native';
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { alFcmTokenRenovar, alPrimerPlanoNotificacion } from "../services/firebase.servicio";
import { AlmacenamientoAuxiliar } from '../services/storage';
import { Usuario, UsuarioRol } from "../types/modelos";
import { IngresarSolicitud, RegistrarseSolicitud } from '../types/api';
import { socketServicio } from "../services/socket.servicio";

export interface AutenticacionContextoTipo {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UsuarioRol | null;
  isDriverMode: boolean;
  phoneVerifiedToastVisible: boolean;
  showPhoneVerifiedToast: () => void;
  hidePhoneVerifiedToast: () => void;
  registrationSuccessToastVisible: boolean;
  showRegistrationSuccessToast: () => void;
  hideRegistrationSuccessToast: () => void;
  setIsDriverMode: (mode: boolean) => void;
  login: (credentials: IngresarSolicitud) => Promise<void>;
  loginWithToken: (token: string, user: Usuario) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: RegistrarseSolicitud) => Promise<Usuario>;
  updateUser: (user: Partial<Usuario>) => void;
  refreshAuth: () => Promise<void>;
}

const AutenticacionContexto = crearContexto<AutenticacionContextoTipo | null>(null);export { AutenticacionContexto };

const solicitudInicialPermisos = async () => {
  if (Plataforma.OS === 'android') {
    try {
      await PermisosAndroid.request(
        PermisosAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de Ubicación',
          message:
          'LineaLila necesita acceder a tu ubicación para conectarte de forma precisa.',
          buttonNeutral: 'Después',
          buttonNegative: 'No',
          buttonPositive: 'OK'
        }
      );
    } catch (error) {
      console.warn('Error pidiendo ubicación:', error);
    }
  }
  await autenticacionServicio.registrarTokenFCM().catch(() => {});
};

interface AutenticacionProviderPropiedades {
  children: ReactNode;
}

const AutenticacionProvider: React.FC<AutenticacionProviderPropiedades> = ({ children: hijos }) => {
  const [usuario, establecerUsuario] = usarEstado<Usuario | null>(null);
  const [token, establecerToken] = usarEstado<string | null>(null);
  const [telefonoVerificadoAvisoVisible, establecerTelefonoVerificadoAvisoVisible] = usarEstado(false);
  const mostrarTelefonoVerificadoAviso = usarFuncionRetorno(() => establecerTelefonoVerificadoAvisoVisible(true), []);
  const ocultarTelefonoVerificadoAviso = usarFuncionRetorno(() => establecerTelefonoVerificadoAvisoVisible(false), []);
  const [registroExitoAvisoVisible, establecerRegistroExitoAvisoVisible] = usarEstado(false);
  const mostrarRegistroExitoAviso = usarFuncionRetorno(() => establecerRegistroExitoAvisoVisible(true), []);
  const ocultarRegistroExitoAviso = usarFuncionRetorno(() => establecerRegistroExitoAvisoVisible(false), []);
  // MODO DISEÑO: Forzar SplashScreen siempre visible
  const [esCargando, establecerEsCargando] = usarEstado(true);

  // DESCOMENTAR ESTA LÍNEA PARA VOLVER AL COMPORTAMIENTO NORMAL
  // const [isLoading, setIsLoading] = useState(true);

  // Forzar isLoading a true siempre
  // Esto hace que RootNavigator muestre SplashScreen todo el tiempo
  // Puedes quitarlo cuando termines de ajustar el diseño
  // eslint-disable-next-line
  usarEfecto(() => {
    establecerEsCargando(true);
  }, []);
  const [esConductorModo, establecerEsConductorModo] = usarEstado(false);

  // Inicializar sesión al montar
  usarEfecto(() => {
    const inicializarAutenticacion = async () => {
      try {
        const guardadoToken = AlmacenamientoAuxiliar.obtenerElemento('authToken');
        console.log(
          '🔐 [INIT] Inicializando auth desde storage. hasToken:',
          !!guardadoToken
        );

        if (guardadoToken) {
          // Intentar validar el token con el backend
          establecerToken(guardadoToken);
          const recienteUsuario = await autenticacionServicio.consultarUsuarioActual();

          if (recienteUsuario) {
            console.log(
              '🔐 [INIT] Sesión válida, usuario refrescado desde /autenticacion/sesion'
            );
            establecerUsuario(recienteUsuario);
            // Sincronizar isDriverMode con modoActual de la BD
            establecerEsConductorModo(recienteUsuario.modoActual === 'conductor');
            AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(recienteUsuario));
            // 🔌 Reconectar WebSocket con sesión restaurada
            socketServicio.conectar();

            // Register FCM Token implicitly in the background
            autenticacionServicio.registrarTokenFCM().catch(() => {});
          } else {
            console.log(
              '🔐 [INIT] Token inválido o expirado. Limpiando sesión local.'
            );
            AlmacenamientoAuxiliar.quitarElemento('authToken');
            AlmacenamientoAuxiliar.quitarElemento('user');
            establecerUsuario(null);
            establecerToken(null);
            establecerEsConductorModo(false);
            Alert.alert(
              'Sesión caducada',
              'Por seguridad, vuelve a iniciar sesión.'
            );
          }
        } else {
          // No hay token guardado: asegurarse de que no quede usuario colgado
          establecerUsuario(null);
          establecerToken(null);
          establecerEsConductorModo(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        // MODO DISEÑO: Comentado para mantener SplashScreen visible
        establecerEsCargando(false);
        console.log(
          '🔐 [INIT] Inicialización completada - isLoading=true (MODO DISEÑO)'
        );
      }
    };

    inicializarAutenticacion();
  }, []);

  // Mantener token FCM sincronizado cuando Firebase lo renueva.
  usarEfecto(() => {
    if (!token) return;

    const desuscribir = alFcmTokenRenovar((nuevoToken: string) => {
      autenticacionServicio.registrarValorTokenFCM(nuevoToken).catch((error: any) => {
        console.error('[FCM] Error syncing refreshed token:', error?.message);
      });
    });

    return desuscribir;
  }, [token]);

  usarEfecto(() => {
    if (!token || Plataforma.OS !== 'android') return;
    return alPrimerPlanoNotificacion((titulo, cuerpo, datos) => {
      if (datos.action === 'resubmit_driver_documents') {
        NativoModules.ReviewNotificationModule?.show(titulo, cuerpo);
      }
    });
  }, [token]);

  const ingresar = usarFuncionRetorno(async (credenciales: IngresarSolicitud) => {
    try {
      establecerEsCargando(true);
      const respuesta = await autenticacionServicio.ingresar(credenciales);

      establecerToken(respuesta.token);
      establecerUsuario(respuesta.user);
      AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(respuesta.user));
      AlmacenamientoAuxiliar.establecerElemento('authToken', respuesta.token);
      // 🔌 Conectar WebSocket
      socketServicio.conectar();

      // Sincronizar isDriverMode con modoActual del usuario
      if (respuesta.user?.modoActual === 'conductor') {
        establecerEsConductorModo(true);
      } else {
        establecerEsConductorModo(false);
      }

      await solicitudInicialPermisos();
    } catch (error) {
      throw error;
    } finally {
      establecerEsCargando(false);
    }
  }, []);

  const ingresarConToken = usarFuncionRetorno(
    async (autenticacionToken: string, usuarioDatos: Usuario) => {
      try {
        establecerEsCargando(true);

        console.log('🔐 [LOGIN] Sesión iniciada:', {
          userId: usuarioDatos?.id,
          email: usuarioDatos?.correo
        });

        establecerToken(autenticacionToken);
        establecerUsuario(usuarioDatos);
        AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(usuarioDatos));
        AlmacenamientoAuxiliar.establecerElemento('authToken', autenticacionToken);
        // 🔌 Conectar WebSocket
        socketServicio.conectar();

        // Sincronizar isDriverMode con modoActual del usuario
        if (usuarioDatos?.modoActual === 'conductor') {
          establecerEsConductorModo(true);
        } else {
          establecerEsConductorModo(false);
        }

        await solicitudInicialPermisos();
      } finally {
        establecerEsCargando(false);
      }
    },
    []
  );

  const salir = usarFuncionRetorno(async () => {
    try {
      establecerEsCargando(true);
      await autenticacionServicio.salir();
      establecerUsuario(null);
      establecerToken(null);
      establecerEsConductorModo(false);

      // 🗑️ Limpiar estado de solicitud activa
      AlmacenamientoAuxiliar.quitarElemento('activeRideState');
      // 🔌 Desconectar WebSocket
      socketServicio.desconectar();
      if (Plataforma.OS === 'android') NativoModules.ActiveRideLocationModule?.stop('');
      console.log('🗑️ [AuthContext] Estado de solicitud limpiado en logout');
    } finally {
      establecerEsCargando(false);
    }
  }, []);

  const registrarse = usarFuncionRetorno(async (datos: RegistrarseSolicitud): Promise<Usuario> => {
    try {
      establecerEsCargando(true);
      const respuesta = await autenticacionServicio.registrarse(datos);

      establecerUsuario(respuesta.user);
      AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(respuesta.user));

      await solicitudInicialPermisos();

      return respuesta.user;
    } finally {
      establecerEsCargando(false);
    }
  }, []);

  const actualizarUsuario = usarFuncionRetorno((actualizadoDatos: Partial<Usuario>) => {
    establecerUsuario((anteriorUsuario) => {
      if (anteriorUsuario) {
        const nuevoUsuario = { ...anteriorUsuario, ...actualizadoDatos };
        AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(nuevoUsuario));

        // Sincronizar isDriverMode si modoActual cambió
        if (actualizadoDatos.modoActual) {
          establecerEsConductorModo(actualizadoDatos.modoActual === 'conductor');
        }

        return nuevoUsuario;
      }
      return anteriorUsuario;
    });
  }, []);

  const establecerEsConductorModoFuncionRetorno = usarFuncionRetorno((modo: boolean) => {
    establecerEsConductorModo(modo);
    // Actualizar el user.modoActual también
    establecerUsuario((anteriorUsuario) => {
      if (anteriorUsuario) {
        const actualizadoUsuario: Usuario = {
          ...anteriorUsuario,
          modoActual: modo ? 'conductor' : 'pasajero'
        };
        AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(actualizadoUsuario));
        return actualizadoUsuario;
      }
      return anteriorUsuario;
    });
  }, []);

  const renovarAutenticacion = usarFuncionRetorno(async () => {
    try {
      await autenticacionServicio.renovarToken();
      // El interceptor se encargará de actualizar el token
    } catch (error) {
      console.error('Error refreshing auth:', error);
      await salir();
    }
  }, [salir]);

  const valor: AutenticacionContextoTipo = {
    user: usuario,
    token,
    isLoading: esCargando,
    isAuthenticated: !!token && !!usuario,
    role: usuario?.rol || null,
    isDriverMode: esConductorModo,
    phoneVerifiedToastVisible: telefonoVerificadoAvisoVisible,
    showPhoneVerifiedToast: mostrarTelefonoVerificadoAviso,
    hidePhoneVerifiedToast: ocultarTelefonoVerificadoAviso,
    registrationSuccessToastVisible: registroExitoAvisoVisible,
    showRegistrationSuccessToast: mostrarRegistroExitoAviso,
    hideRegistrationSuccessToast: ocultarRegistroExitoAviso,
    setIsDriverMode: establecerEsConductorModoFuncionRetorno,
    login: ingresar,
    loginWithToken: ingresarConToken,
    logout: salir,
    signup: registrarse,
    updateUser: actualizarUsuario,
    refreshAuth: renovarAutenticacion
  };

  return <AutenticacionContexto.Provider value={valor}>{hijos}</AutenticacionContexto.Provider>;
};export { AutenticacionProvider };
