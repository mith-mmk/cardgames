package com.solitairecollections.client

import android.graphics.Color
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
      navigationBarStyle = SystemBarStyle.dark(SYSTEM_BAR_SCRIM),
    )
    super.onCreate(savedInstanceState)
  }

  private companion object {
    const val SYSTEM_BAR_SCRIM = 0xff08251f.toInt()
  }
}
