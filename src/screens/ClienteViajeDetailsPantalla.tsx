import { MAPA_CLARO } from '../theme/mapa';
import React, { useState as usarEstado, useEffect as usarEfecto } from "react";
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Alert,
  ScrollView as DesplazableVista,
  Linking } from
"react-native";
import { SafeAreaView as SeguraZonaVista } from "react-native-safe-area-context";
import { useNavigation as usarNavegacion, useRoute as usarRuta, RouteProp as RutaProp } from "@react-navigation/native";
import MapaVista, { Marker, Polyline } from "react-native-maps";
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono } from "../components/MapUbicacionIcons";

interface ActivoViaje {
  rideId: string;
  status: "searching" | "aceptado" | "llegado" | "en_curso" | "completado";
  driverName: string;
  driverPhone: string;
  driverRating: number;
  vehicleInfo: string;
  licensePlate: string;
  pickupLocation: string;
  destinationLocation: string;
  pickupCoords: {latitude: number;longitude: number;};
  destinationCoords: {latitude: number;longitude: number;};
  driverCoords: {latitude: number;longitude: number;};
  fare: number;
  eta: number; // en minutos
  distance: number; // en km
}

const ClienteViajeDetallesPantalla = () => {
  const navegacion = usarNavegacion();
  const ruta = usarRuta<RutaProp<RaizPilaParametroLista, "ClientRideDetails">>();
  const { rideId: viajeId } = ruta.params || { rideId: "demo" };

  const [viaje, establecerViaje] = usarEstado<ActivoViaje>({
    rideId: viajeId || "RIDE_001",
    status: "en_curso",
    driverName: "María García",
    driverPhone: "+591 71234567",
    driverRating: 4.8,
    vehicleInfo: "Toyota Yaris Rojo",
    licensePlate: "LLA-123",
    pickupLocation: "Plaza Murillo",
    destinationLocation: "Centro Comercial Alalay",
    pickupCoords: { latitude: -16.503776, longitude: -68.134498 },
    destinationCoords: { latitude: -16.518, longitude: -68.124 },
    driverCoords: { latitude: -16.509, longitude: -68.129 },
    fare: 15.5,
    eta: 8,
    distance: 2.5
  });

  const [eta, establecerEta] = usarEstado(viaje.eta);

  // Simular ETA actualizado
  usarEfecto(() => {
    const intervalo = setInterval(() => {
      establecerEta((anterior) => anterior > 0 ? anterior - 1 : 0);
    }, 60000); // Actualizar cada minuto
    return () => clearInterval(intervalo);
  }, []);

  const obtenerEstadoTexto = (estado: string) => {
    switch (estado) {
      case "searching":
        return "Buscando conductor";
      case "aceptado":
        return "Conductor aceptó";
      case "llegado":
        return "Conductor llegó";
      case "en_curso":
        return "En camino";
      case "completado":
        return "Completado";
      default:
        return estado;
    }
  };

  const obtenerEstadoColor = (estado: string) => {
    switch (estado) {
      case "searching":
        return "#F59E0B";
      case "aceptado":
        return "#3B82F6";
      case "llegado":
        return "#EC4899";
      case "en_curso":
        return "#10B981";
      case "completado":
        return "#8B5CF6";
      default:
        return "#666";
    }
  };

  const manejarLlamadaConductor = () => {
    Linking.openURL(`tel:${viaje.driverPhone}`).catch(() => {
      Alert.alert("Error", "No se puede realizar la llamada");
    });
  };

  const manejarCancelarViaje = () => {
    if (viaje.status === "en_curso") {
      Alert.alert("Cancelar viaje", "¿Estás segura de que deseas cancelar?", [
      { text: "No", onPress: () => {}, style: "cancel" },
      {
        text: "Sí, cancelar",
        onPress: () => {
          establecerViaje({ ...viaje, status: "completado" });
          Alert.alert("Viaje cancelado", "Se ha procesado la cancelación");
          setTimeout(() => navegacion.goBack(), 1500);
        },
        style: "destructive"
      }]
      );
    }
  };

  const manejarShareUbicacion = () => {
    Alert.alert(
      "Ubicación compartida",
      "Se ha compartido tu ubicación con el conductor"
    );
  };

  return (
    <SeguraZonaVista style={estilos.container}>
      {/* HEADER */}
      <Vista style={estilos.header}>
        <PulsableOpacidad onPress={() => navegacion.goBack()}>
          <Texto style={estilos.backButton}>←</Texto>
        </PulsableOpacidad>
        <Texto style={estilos.headerTitle}>Detalles del Viaje</Texto>
        <Vista style={estilos.headerSpacer} />
      </Vista>

      {/* MAPA */}
      <Vista style={estilos.mapContainer}>
        <MapaVista
          {...MAPA_CLARO}
          style={estilos.map}
          initialRegion={{
            latitude: -16.51,
            longitude: -68.127,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015
          }}>

          {/* Marker de origen */}
          <Marker coordinate={viaje.pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
            <PasajeroMapaIcono size={30} />
          </Marker>
          {/* Marker de destino */}
          <Marker coordinate={viaje.destinationCoords} anchor={{ x: 0.5, y: 0.5 }}>
            <DestinoIndicadorIcon size={30} />
          </Marker>
          {/* Marker del conductor */}
          <Marker
            coordinate={viaje.driverCoords}
            title={viaje.driverName}
            pinColor="#F59E0B" />

          {/* Ruta */}
          <Polyline
            coordinates={[
            viaje.driverCoords,
            viaje.pickupCoords,
            viaje.destinationCoords]
            }
            strokeColor="#7C3AED"
            strokeWidth={4} />

        </MapaVista>

        {/* Status Badge */}
        <Vista
          style={[
          estilos.statusOverlay,
          { backgroundColor: obtenerEstadoColor(viaje.status) }]
          }>

          <Texto style={estilos.statusText}>{obtenerEstadoTexto(viaje.status)}</Texto>
        </Vista>
      </Vista>

      {/* CONTENIDO SCROLLABLE */}
      <DesplazableVista style={estilos.content}>
        {/* ETA Y DISTANCIA */}
        <Vista style={estilos.etaContainer}>
          <Vista style={estilos.etaItem}>
            <Texto style={estilos.etaValue}>{eta} min</Texto>
            <Texto style={estilos.etaLabel}>ETA</Texto>
          </Vista>
          <Vista style={estilos.etaDivider} />
          <Vista style={estilos.etaItem}>
            <Texto style={estilos.etaValue}>{viaje.distance} km</Texto>
            <Texto style={estilos.etaLabel}>Distancia</Texto>
          </Vista>
          <Vista style={estilos.etaDivider} />
          <Vista style={estilos.etaItem}>
            <Texto style={estilos.etaValue}>Bs ${viaje.fare.toFixed(2)}</Texto>
            <Texto style={estilos.etaLabel}>Tarifa</Texto>
          </Vista>
        </Vista>

        {/* INFORMACIÓN DEL CONDUCTOR */}
        <Vista style={estilos.sectionCard}>
          <Texto style={estilos.sectionTitle}>Conductor</Texto>

          <Vista style={estilos.driverCard}>
            <Vista style={estilos.driverAvatar}>
              <Texto style={estilos.avatarText}>👩</Texto>
            </Vista>

            <Vista style={estilos.driverDetails}>
              <Texto style={estilos.driverName}>{viaje.driverName}</Texto>
              <Vista style={estilos.ratingContainer}>
                <Texto style={estilos.ratingText}>⭐ {viaje.driverRating}</Texto>
              </Vista>
            </Vista>

            <PulsableOpacidad
              style={estilos.callButton}
              onPress={manejarLlamadaConductor}>

              <Texto style={estilos.callButtonIcon}>📞</Texto>
            </PulsableOpacidad>
          </Vista>

          {/* VEHÍCULO */}
          <Vista style={estilos.vehicleInfo}>
            <Texto style={estilos.vehicleLabel}>Vehículo</Texto>
            <Texto style={estilos.vehicleValue}>{viaje.vehicleInfo}</Texto>
            <Texto style={estilos.licensePlate}>{viaje.licensePlate}</Texto>
          </Vista>
        </Vista>

        {/* UBICACIONES */}
        <Vista style={estilos.sectionCard}>
          <Texto style={estilos.sectionTitle}>Ruta</Texto>

          <Vista style={estilos.locationItem}>
            <PasajeroMapaIcono size={28} bare />
            <Vista style={estilos.locationDetails}>
              <Texto style={estilos.locationText}>{viaje.pickupLocation}</Texto>
            </Vista>
          </Vista>

          <Vista style={estilos.routeLine} />

          <Vista style={estilos.locationItem}>
            <DestinoIndicadorIcon size={28} bare />
            <Vista style={estilos.locationDetails}>
              <Texto style={estilos.locationText}>
                {viaje.destinationLocation}
              </Texto>
            </Vista>
          </Vista>
        </Vista>

        {/* ACCIONES */}
        <Vista style={estilos.actionButtons}>
          <PulsableOpacidad
            style={estilos.secondaryButton}
            onPress={manejarShareUbicacion}>

            <Texto style={estilos.buttonIcon}>📍</Texto>
            <Texto style={estilos.secondaryButtonText}>Compartir ubicación</Texto>
          </PulsableOpacidad>

          {viaje.status === "en_curso" &&
          <PulsableOpacidad
            style={estilos.dangerButton}
            onPress={manejarCancelarViaje}>

              <Texto style={estilos.dangerButtonText}>Cancelar viaje</Texto>
            </PulsableOpacidad>
          }
        </Vista>

        {/* SOPORTE */}
        <PulsableOpacidad style={estilos.supportButton}>
          <Texto style={estilos.supportIcon}>🆘</Texto>
          <Vista style={estilos.supportContent}>
            <Texto style={estilos.supportTitle}>Centro de seguridad</Texto>
            <Texto style={estilos.supportSubtitle}>
              Reportar un problema con este viaje
            </Texto>
          </Vista>
          <Texto style={estilos.supportArrow}>›</Texto>
        </PulsableOpacidad>
      </DesplazableVista>
    </SeguraZonaVista>);

};

const estilos = EstiloHoja.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    zIndex: 10
  },
  backButton: {
    fontSize: 28,
    color: "#7C3AED",
    fontWeight: "600"
  },
  headerSpacer: { width: 32 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D2D2D"
  },
  mapContainer: {
    height: 240,
    position: "relative"
  },
  map: {
    flex: 1
  },
  statusOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600"
  },
  content: {
    flex: 1,
    padding: 16
  },
  etaContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    justifyContent: "space-around",
    alignItems: "center"
  },
  etaItem: {
    alignItems: "center"
  },
  etaValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 4
  },
  etaLabel: {
    fontSize: 12,
    color: "#999"
  },
  etaDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#F0F0F0"
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 12
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0E6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  avatarText: {
    fontSize: 24
  },
  driverDetails: {
    flex: 1
  },
  driverName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 4
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  ratingText: {
    fontSize: 12,
    color: "#666"
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0E6FF",
    justifyContent: "center",
    alignItems: "center"
  },
  callButtonIcon: {
    fontSize: 20
  },
  vehicleInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0"
  },
  vehicleLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4
  },
  vehicleValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 4
  },
  licensePlate: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600"
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16
  },
  locationDetails: {
    flex: 1,
    marginLeft: 12
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D2D2D"
  },
  routeLine: {
    marginLeft: 14,
    marginBottom: 12,
    height: 24,
    borderLeftWidth: 2,
    borderLeftColor: "#E0E0E0"
  },
  actionButtons: {
    gap: 12,
    marginBottom: 16
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F0E6FF",
    gap: 8
  },
  buttonIcon: {
    fontSize: 16
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7C3AED"
  },
  dangerButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center"
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444"
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  supportIcon: {
    fontSize: 24,
    marginRight: 12
  },
  supportContent: {
    flex: 1
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D2D2D"
  },
  supportSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2
  },
  supportArrow: {
    fontSize: 20,
    color: "#C0C0C0"
  }
});

export default ClienteViajeDetallesPantalla;
