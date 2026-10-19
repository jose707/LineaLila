package com.linealila

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ActiveRideLocationModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  override fun getName(): String = "ActiveRideLocationModule"

  @ReactMethod
  fun start(rideId: String, token: String, apiBaseUrl: String, promise: Promise) {
    if (rideId.isBlank() || token.isBlank() || !apiBaseUrl.startsWith("http")) {
      promise.reject("INVALID_TRACKING", "Faltan datos para seguir el viaje")
      return
    }
    val fine = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val coarse = context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (!fine && !coarse) {
      promise.reject("LOCATION_PERMISSION", "Se requiere permiso de ubicación")
      return
    }
    try {
      val intent = Intent(context, ActiveRideLocationService::class.java).apply {
        action = ActiveRideLocationService.ACTION_START
        putExtra(ActiveRideLocationService.EXTRA_RIDE_ID, rideId)
        putExtra(ActiveRideLocationService.EXTRA_TOKEN, token)
        putExtra(ActiveRideLocationService.EXTRA_API_BASE_URL, apiBaseUrl)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("TRACKING_START_FAILED", error)
    }
  }

  @ReactMethod
  fun stop(rideId: String) {
    context.stopService(Intent(context, ActiveRideLocationService::class.java))
  }

  @ReactMethod
  fun consumeLaunchRideId(promise: Promise) {
    val intent = context.currentActivity?.intent
    val rideId = intent?.getStringExtra(ActiveRideLocationService.EXTRA_RIDE_ID)
    intent?.removeExtra(ActiveRideLocationService.EXTRA_RIDE_ID)
    promise.resolve(rideId)
  }
}
