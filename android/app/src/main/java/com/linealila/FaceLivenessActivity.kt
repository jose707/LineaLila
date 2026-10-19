package com.linealila

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.compose.material3.MaterialTheme
import com.amplifyframework.auth.AWSCredentials
import com.amplifyframework.auth.AWSCredentialsProvider
import com.amplifyframework.auth.AWSTemporaryCredentials
import com.amplifyframework.auth.AuthException
import com.amplifyframework.core.Consumer
import com.amplifyframework.ui.liveness.model.FaceLivenessDetectionException
import com.amplifyframework.ui.liveness.ui.FaceLivenessDetector
import com.amplifyframework.ui.liveness.ui.LivenessColorScheme
import aws.smithy.kotlin.runtime.time.Instant as AwsInstant
import java.time.Instant as JavaInstant

class FaceLivenessActivity : ComponentActivity() {
  private lateinit var sessionId: String
  private lateinit var region: String
  private lateinit var credentials: AWSTemporaryCredentials

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    sessionId = intent.getStringExtra(EXTRA_SESSION_ID).orEmpty()
    region = intent.getStringExtra(EXTRA_REGION).orEmpty()
    try {
      credentials = AWSTemporaryCredentials(
        intent.getStringExtra(EXTRA_ACCESS_KEY).orEmpty(),
        intent.getStringExtra(EXTRA_SECRET_KEY).orEmpty(),
        intent.getStringExtra(EXTRA_SESSION_TOKEN).orEmpty(),
        AwsInstant(JavaInstant.parse(intent.getStringExtra(EXTRA_EXPIRATION))),
      )
    } catch (error: Exception) {
      finishWithError("E_LIVENESS_CONFIG", "Las credenciales temporales no son válidas.")
      return
    }
    if (sessionId.isBlank() || region.isBlank()) {
      finishWithError("E_LIVENESS_CONFIG", "La sesión biométrica no es válida.")
      return
    }
    ensureCameraPermission()
  }

  private fun ensureCameraPermission() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
      renderDetector()
    } else {
      ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), CAMERA_REQUEST)
    }
  }

  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode != CAMERA_REQUEST) return
    if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) renderDetector()
    else finishWithError("E_LIVENESS_CAMERA", "Se necesita acceso a la cámara para comprobar la prueba de vida.")
  }

  private fun renderDetector() {
    setContent {
      MaterialTheme(colorScheme = LivenessColorScheme.default()) {
        FaceLivenessDetector(
          sessionId = sessionId,
          region = region,
          credentialsProvider = TemporaryCredentialsProvider(credentials),
          onComplete = {
            setResult(RESULT_OK)
            finish()
          },
          onError = { error: FaceLivenessDetectionException ->
            finishWithError("E_LIVENESS_FAILED", error.toString())
          },
        )
      }
    }
  }

  private fun finishWithError(code: String, message: String) {
    setResult(RESULT_CANCELED, intent.putExtra(EXTRA_ERROR_CODE, code).putExtra(EXTRA_ERROR_MESSAGE, message))
    finish()
  }

  private class TemporaryCredentialsProvider(private val credentials: AWSTemporaryCredentials) : AWSCredentialsProvider<AWSCredentials> {
    override fun fetchAWSCredentials(onSuccess: Consumer<AWSCredentials>, onError: Consumer<AuthException>) {
      onSuccess.accept(credentials)
    }
  }

  companion object {
    const val EXTRA_SESSION_ID = "sessionId"
    const val EXTRA_REGION = "region"
    const val EXTRA_ACCESS_KEY = "accessKeyId"
    const val EXTRA_SECRET_KEY = "secretAccessKey"
    const val EXTRA_SESSION_TOKEN = "sessionToken"
    const val EXTRA_EXPIRATION = "expiration"
    const val EXTRA_ERROR_CODE = "errorCode"
    const val EXTRA_ERROR_MESSAGE = "errorMessage"
    private const val CAMERA_REQUEST = 9138
  }
}
