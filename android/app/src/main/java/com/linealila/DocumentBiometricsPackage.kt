package com.linealila

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class DocumentBiometricsPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
        listOf(DocumentBiometricsModule(context))

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

private class DocumentBiometricsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private var prompt: BiometricPrompt? = null

    override fun getName() = "DocumentBiometrics"

    @ReactMethod
    fun authenticate(promise: Promise) {
        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("UNAVAILABLE", "La verificación biométrica no está disponible.")
            return
        }
        activity.runOnUiThread {
            if (prompt != null) {
                promise.reject("BUSY", "Ya hay una verificación en curso.")
                return@runOnUiThread
            }
            val allowed = BiometricManager.Authenticators.BIOMETRIC_STRONG
            when (BiometricManager.from(activity).canAuthenticate(allowed)) {
                BiometricManager.BIOMETRIC_SUCCESS -> Unit
                BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                    promise.reject("NOT_ENROLLED", "Registra tu huella en los ajustes de Android para ver los documentos.")
                    return@runOnUiThread
                }
                else -> {
                    promise.reject("UNAVAILABLE", "El dispositivo no tiene biometría disponible en este momento.")
                    return@runOnUiThread
                }
            }
            try {
                val biometricPrompt = BiometricPrompt(activity, ContextCompat.getMainExecutor(activity),
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                            prompt = null
                            promise.resolve(true)
                        }

                        override fun onAuthenticationError(code: Int, message: CharSequence) {
                            prompt = null
                            when (code) {
                                BiometricPrompt.ERROR_CANCELED, BiometricPrompt.ERROR_USER_CANCELED,
                                BiometricPrompt.ERROR_NEGATIVE_BUTTON -> promise.resolve(false)
                                else -> promise.reject("BIOMETRIC_ERROR", message.toString())
                            }
                        }
                    })
                prompt = biometricPrompt
                biometricPrompt.authenticate(BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Ver documentos")
                    .setSubtitle("Confirma tu identidad para continuar")
                    .setAllowedAuthenticators(allowed)
                    .setNegativeButtonText("Cancelar")
                    .build())
            } catch (error: Exception) {
                prompt = null
                promise.reject("UNAVAILABLE", "No se pudo abrir la verificación biométrica.", error)
            }
        }
    }

    @ReactMethod
    fun cancel() {
        reactApplicationContext.runOnUiQueueThread { prompt?.cancelAuthentication() }
    }
}
