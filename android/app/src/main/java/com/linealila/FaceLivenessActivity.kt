package com.linealila

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
  private var checkStarted by mutableStateOf(false)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    WindowCompat.setDecorFitsSystemWindows(window, false)
    WindowInsetsControllerCompat(window, window.decorView).apply {
      isAppearanceLightStatusBars = true
      isAppearanceLightNavigationBars = true
    }
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
      MaterialTheme(
        colorScheme = LivenessColorScheme.default().copy(
          primary = Color(0xFF7514C5),
          onPrimary = Color.White,
          background = Color.White,
          onBackground = Color(0xFF111118),
          surface = Color.White,
          onSurface = Color(0xFF111118),
        ),
      ) {
        Box(Modifier.fillMaxSize().background(Color.White).safeDrawingPadding()) {
          if (checkStarted) {
            FaceLivenessDetector(
              sessionId = sessionId,
              region = region,
              credentialsProvider = TemporaryCredentialsProvider(credentials),
              disableStartView = true,
              onComplete = {
                setResult(RESULT_OK)
                finish()
              },
              onError = { error: FaceLivenessDetectionException ->
                if (error is FaceLivenessDetectionException.UserCancelledException) {
                  finishWithError("E_LIVENESS_CANCELLED", "La prueba de vida se canceló.")
                } else {
                  finishWithError("E_LIVENESS_FAILED", error.toString())
                }
              },
            )
          } else {
            LivenessIntroduction(
              onStart = { checkStarted = true },
            )
          }
        }
      }
    }
  }

  @androidx.compose.runtime.Composable
  private fun LivenessIntroduction(onStart: () -> Unit) {
    Column(
      modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 16.dp),
    ) {
      Column(
        modifier = Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        Box(
          modifier = Modifier.size(64.dp).background(Color(0xFFF3EAFC), RoundedCornerShape(32.dp)),
          contentAlignment = Alignment.Center,
        ) {
          Text("✓", color = Color(0xFF7514C5), fontSize = 32.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(20.dp))
        Text(
          "Prueba de vida",
          color = Color(0xFF111118), fontSize = 25.sp, fontWeight = FontWeight.ExtraBold,
          textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(10.dp))
        Text(
          "Coloca tu rostro frente a la cámara y sigue las instrucciones",
          color = Color(0xFF7A7A8A), fontSize = 15.sp, lineHeight = 22.sp,
          textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        Column(
          modifier = Modifier.fillMaxWidth()
            .background(Color(0xFFF3EAFC), RoundedCornerShape(16.dp))
            .padding(18.dp),
        ) {
          Text(
            "Aviso de fotosensibilidad",
            color = Color(0xFF111118), fontSize = 16.sp, fontWeight = FontWeight.Bold,
          )
          Spacer(Modifier.height(8.dp))
          Text(
            "Esta prueba usa luces de distintos colores. Si eres sensible a la luz o tienes antecedentes de epilepsia, ten precaución.",
            color = Color(0xFF666670), fontSize = 14.sp, lineHeight = 21.sp,
          )
        }
        Spacer(Modifier.height(14.dp))
        Column(
          modifier = Modifier.fillMaxWidth()
            .background(Color(0xFFF7F7F9), RoundedCornerShape(16.dp))
            .padding(18.dp),
        ) {
          Text(
            "Antes de empezar",
            color = Color(0xFF111118), fontSize = 16.sp, fontWeight = FontWeight.Bold,
          )
          Spacer(Modifier.height(8.dp))
          Text(
            "• Busca un lugar bien iluminado.\n• Quítate los lentes y la gorra.\n• Si completas la verificación, la imagen de tu rostro se usará como foto de perfil.",
            color = Color(0xFF666670), fontSize = 14.sp, lineHeight = 21.sp,
          )
        }
        Spacer(Modifier.height(16.dp))
      }
      Button(
        onClick = onStart,
        modifier = Modifier.fillMaxWidth().height(56.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF111118), contentColor = Color.White),
      ) {
        Text("Iniciar", fontSize = 19.sp, fontWeight = FontWeight.Bold)
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
