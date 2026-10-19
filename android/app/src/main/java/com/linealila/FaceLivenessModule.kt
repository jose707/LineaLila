package com.linealila

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class FaceLivenessModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), ActivityEventListener {

  private var pendingPromise: Promise? = null

  init { context.addActivityEventListener(this) }

  override fun getName() = "FaceLivenessModule"

  @ReactMethod
  fun startFaceLivenessDetection(sessionId: String, region: String, credentials: ReadableMap, promise: Promise) {
    if (pendingPromise != null) {
      promise.reject("E_LIVENESS_BUSY", "Ya hay una prueba de vida en curso.")
      return
    }
    val activity = context.currentActivity
    if (activity == null) {
      promise.reject("E_LIVENESS_ACTIVITY", "No se pudo abrir la cámara.")
      return
    }
    val accessKey = credentials.getString("accessKeyId")
    val secretKey = credentials.getString("secretAccessKey")
    val token = credentials.getString("sessionToken")
    val expiration = credentials.getString("expiration")
    if (sessionId.isBlank() || region.isBlank() || accessKey.isNullOrBlank() || secretKey.isNullOrBlank() || token.isNullOrBlank() || expiration.isNullOrBlank()) {
      promise.reject("E_LIVENESS_CONFIG", "Faltan datos temporales para iniciar la prueba de vida.")
      return
    }
    pendingPromise = promise
    val intent = Intent(activity, FaceLivenessActivity::class.java).apply {
      putExtra(FaceLivenessActivity.EXTRA_SESSION_ID, sessionId)
      putExtra(FaceLivenessActivity.EXTRA_REGION, region)
      putExtra(FaceLivenessActivity.EXTRA_ACCESS_KEY, accessKey)
      putExtra(FaceLivenessActivity.EXTRA_SECRET_KEY, secretKey)
      putExtra(FaceLivenessActivity.EXTRA_SESSION_TOKEN, token)
      putExtra(FaceLivenessActivity.EXTRA_EXPIRATION, expiration)
    }
    try {
      activity.startActivityForResult(intent, REQUEST_CODE)
    } catch (error: Exception) {
      pendingPromise = null
      promise.reject("E_LIVENESS_START", "No se pudo abrir el detector de prueba de vida.", error)
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE) return
    val promise = pendingPromise ?: return
    pendingPromise = null
    if (resultCode == Activity.RESULT_OK) {
      promise.resolve(true)
    } else {
      promise.reject(
        data?.getStringExtra(FaceLivenessActivity.EXTRA_ERROR_CODE) ?: "E_LIVENESS_CANCELLED",
        data?.getStringExtra(FaceLivenessActivity.EXTRA_ERROR_MESSAGE) ?: "La prueba de vida se canceló.",
      )
    }
  }

  override fun onNewIntent(intent: Intent) = Unit

  companion object { private const val REQUEST_CODE = 9137 }
}
