package com.linealila

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NavigationBarModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NavigationBarModule"

    @ReactMethod
    fun setColor(colorString: String, light: Boolean) {
        val activity: Activity? = reactApplicationContext.currentActivity
        activity?.runOnUiThread {
            activity.window?.apply {
                clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION)
                addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
                navigationBarColor = Color.parseColor(colorString)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val decorView = activity.window?.decorView ?: return@runOnUiThread
                var flags = decorView.systemUiVisibility
                flags = if (light) {
                    flags or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                } else {
                    flags and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
                }
                decorView.systemUiVisibility = flags
            }
        }
    }
}
