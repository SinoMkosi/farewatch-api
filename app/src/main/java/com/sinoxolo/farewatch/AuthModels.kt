package com.sinoxolo.farewatch

data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class AuthResponse(
    val token: String,
    val userId: String,
    val name: String,
    val email: String
)
data class RouteRequest(
    val originAirport: String,
    val destAirport: String,
    val targetPrice: Double? = null
)

data class RouteResponse(
    val routeId: String,
    val originAirport: String,
    val destAirport: String,
    val targetPrice: Double?
)