package com.sinoxolo.farewatch

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class RoutesActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_routes)

        val editOrigin = findViewById<EditText>(R.id.editOrigin)
        val editDest = findViewById<EditText>(R.id.editDest)
        val editTargetPrice = findViewById<EditText>(R.id.editTargetPrice)
        val btnAddRoute = findViewById<Button>(R.id.btnAddRoute)
        val txtResult = findViewById<TextView>(R.id.txtResult)

        val token = intent.getStringExtra("TOKEN") ?: ""

        btnAddRoute.setOnClickListener {
            val origin = editOrigin.text.toString().trim()
            val dest = editDest.text.toString().trim()
            val priceText = editTargetPrice.text.toString().trim()
            val price = priceText.toDoubleOrNull()

            if (origin.isEmpty() || dest.isEmpty()) {
                txtResult.text = "Please enter origin and destination"
                return@setOnClickListener
            }

            lifecycleScope.launch {
                try {
                    val response = RetrofitClient.api.addRoute(
                        "Bearer $token",
                        RouteRequest(origin, dest, price)
                    )
                    if (response.isSuccessful) {
                        val body = response.body()
                        txtResult.text = "Route added: ${body?.originAirport} -> ${body?.destAirport}"
                    } else {
                        txtResult.text = "Failed: ${response.code()}"
                    }
                } catch (e: Exception) {
                    txtResult.text = "Error: ${e.message}"
                }
            }
        }
    }
}