package com.linealila

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlin.concurrent.thread

class ComprobantePdfModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), ActivityEventListener {

    private var seleccion: Promise? = null
    private val codigoSelector = 6512

    init { context.addActivityEventListener(this) }

    override fun getName() = "ComprobantePdf"

    @ReactMethod
    fun elegir(promise: Promise) {
        val activity = context.currentActivity
        if (activity == null || seleccion != null) {
            promise.reject("PDF_SELECTOR", "No se pudo abrir el selector de archivos.")
            return
        }
        seleccion = promise
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            type = "application/pdf"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        try {
            activity.startActivityForResult(intent, codigoSelector)
        } catch (error: Exception) {
            seleccion = null
            promise.reject("PDF_SELECTOR", "No se pudo abrir el selector de archivos.", error)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != codigoSelector) return
        val promise = seleccion ?: return
        seleccion = null
        val uri = if (resultCode == Activity.RESULT_OK) data?.data else null
        promise.resolve(uri?.toString())
    }

    override fun onNewIntent(intent: Intent) = Unit

    @ReactMethod
    fun abrir(url: String, token: String, promise: Promise) {
        val activity = context.currentActivity ?: run {
            promise.reject("PDF_VISOR", "No se pudo abrir el PDF.")
            return
        }
        thread(name = "comprobante-pdf") {
            var temporal: File? = null
            try {
                val destino = URL(url)
                require(destino.protocol == "http" || destino.protocol == "https")
                val carpeta = File(context.cacheDir, "comprobantes_pdf").apply { mkdirs() }
                carpeta.listFiles()?.filter { it.lastModified() < System.currentTimeMillis() - 24 * 60 * 60 * 1000 }?.forEach { it.delete() }
                val archivo = File(carpeta, "${UUID.randomUUID()}.pdf")
                temporal = archivo
                val conexion = destino.openConnection() as HttpURLConnection
                try {
                    conexion.instanceFollowRedirects = false
                    conexion.connectTimeout = 10000
                    conexion.readTimeout = 15000
                    conexion.setRequestProperty("Authorization", "Bearer $token")
                    check(conexion.responseCode == 200 && conexion.contentType?.startsWith("application/pdf") == true)
                    conexion.inputStream.use { entrada ->
                        archivo.outputStream().use { salida ->
                            val bloque = ByteArray(8192)
                            var total = 0
                            while (true) {
                                val leido = entrada.read(bloque)
                                if (leido < 0) break
                                total += leido
                                check(total <= 8 * 1024 * 1024)
                                salida.write(bloque, 0, leido)
                            }
                        }
                    }
                } finally { conexion.disconnect() }
                val uri = FileProvider.getUriForFile(context, "${context.packageName}.comprobantes", archivo)
                activity.runOnUiThread {
                    try {
                        activity.startActivity(Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(uri, "application/pdf")
                            clipData = ClipData.newRawUri("Comprobante", uri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        })
                        promise.resolve(null)
                    } catch (error: Exception) {
                        archivo.delete()
                        promise.reject("PDF_VISOR", "No se encontró un visor de PDF en el dispositivo.", error)
                    }
                }
            } catch (error: Exception) {
                temporal?.delete()
                promise.reject("PDF_DESCARGA", "No se pudo descargar el comprobante.", error)
            }
        }
    }
}

class ComprobantePdfProvider : FileProvider()

class ComprobantePdfPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(ComprobantePdfModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
