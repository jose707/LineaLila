package com.linealila

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Bundle
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class ActiveRideLocationService : Service(), LocationListener {
  companion object {
    const val ACTION_START = "com.linealila.ACTIVE_RIDE_START"
    const val EXTRA_RIDE_ID = "ride_id"
    const val EXTRA_TOKEN = "token"
    const val EXTRA_API_BASE_URL = "api_base_url"
    private const val CHANNEL_ID = "active_ride_tracking"
    private const val NOTIFICATION_ID = 2041
    private const val MIN_SEND_INTERVAL_MS = 5000L
  }

  private var locationManager: LocationManager? = null
  private var rideId: String? = null
  private var token: String? = null
  private var apiBaseUrl: String? = null
  private var lastSentAt = 0L
  private var tracking = false
  private val sending = AtomicBoolean(false)
  private val sender = Executors.newSingleThreadExecutor()

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action != ACTION_START) return START_NOT_STICKY
    val requestedRide = intent.getStringExtra(EXTRA_RIDE_ID)
    val requestedToken = intent.getStringExtra(EXTRA_TOKEN)
    val requestedBaseUrl = intent.getStringExtra(EXTRA_API_BASE_URL)
    if (requestedRide.isNullOrBlank() || requestedToken.isNullOrBlank() || requestedBaseUrl.isNullOrBlank()) {
      stopSelf()
      return START_NOT_STICKY
    }

    rideId = requestedRide
    token = requestedToken
    apiBaseUrl = requestedBaseUrl.trimEnd('/')
    createChannel()
    val notification = makeNotification()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (error: Exception) {
      Log.w("ActiveRideLocation", "Could not start foreground tracking", error)
      stopSelf()
      return START_NOT_STICKY
    }
    if (!tracking) startLocationUpdates()
    return START_NOT_STICKY
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Viaje en curso",
        NotificationManager.IMPORTANCE_LOW,
      ).apply { description = "Ubicación compartida durante un viaje activo" }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  private fun makeNotification(): Notification {
    val openApp = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra(EXTRA_RIDE_ID, rideId)
    }
    val pending = PendingIntent.getActivity(
      this, 0, openApp,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
      Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
    return builder
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("Viaje en curso")
      .setContentText("Se comparte tu ubicación. Toca para volver al viaje.")
      .setContentIntent(pending)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .build()
  }

  private fun startLocationUpdates() {
    val fine = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val coarse = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (!fine && !coarse) {
      stopSelf()
      return
    }
    try {
      val manager = getSystemService(LOCATION_SERVICE) as LocationManager
      locationManager = manager
      val providers = if (fine) listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
        else listOf(LocationManager.NETWORK_PROVIDER)
      var registered = false
      providers.forEach { provider ->
        if (manager.isProviderEnabled(provider)) {
          manager.requestLocationUpdates(provider, MIN_SEND_INTERVAL_MS, 0f, this, Looper.getMainLooper())
          registered = true
        }
      }
      if (!registered) stopSelf() else tracking = true
    } catch (error: SecurityException) {
      Log.w("ActiveRideLocation", "Location permission unavailable", error)
      stopSelf()
    } catch (error: Exception) {
      Log.w("ActiveRideLocation", "Could not start location updates", error)
      stopSelf()
    }
  }

  override fun onLocationChanged(location: Location) {
    // The React Native screen already uploads location while visible.
    if (MainActivity.isVisible) return
    val currentRide = rideId ?: return
    val currentToken = token ?: return
    val baseUrl = apiBaseUrl ?: return
    val now = SystemClock.elapsedRealtime()
    if (!tracking || now - lastSentAt < MIN_SEND_INTERVAL_MS || !sending.compareAndSet(false, true)) return
    lastSentAt = now
    sender.execute {
      var connection: HttpURLConnection? = null
      try {
        connection = (URL("$baseUrl/driver-locations/ride/$currentRide").openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          connectTimeout = 8000
          readTimeout = 8000
          doOutput = true
          setRequestProperty("Authorization", "Bearer $currentToken")
          setRequestProperty("Content-Type", "application/json")
        }
        val payload = JSONObject().apply {
          put("latitude", location.latitude)
          put("longitude", location.longitude)
          if (location.hasBearing()) put("heading", location.bearing.toDouble())
          if (location.hasSpeed()) put("speed", (location.speed * 3.6).toDouble())
        }
        connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
        when (connection.responseCode) {
          401, 403, 409 -> stopSelf()
        }
      } catch (error: Exception) {
        Log.w("ActiveRideLocation", "Location upload failed", error)
      } finally {
        connection?.disconnect()
        sending.set(false)
      }
    }
  }

  override fun onProviderDisabled(provider: String) {
    val manager = locationManager ?: return
    if (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER) &&
        !manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) stopSelf()
  }

  // Android 8 still invokes these LocationListener callbacks as abstract methods.
  @Suppress("DEPRECATION")
  override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

  override fun onProviderEnabled(provider: String) {}

  override fun onDestroy() {
    tracking = false
    locationManager?.removeUpdates(this)
    sender.shutdownNow()
    super.onDestroy()
  }
}
