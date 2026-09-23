package com.sinoxolo.farewatch

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @retrofit2.http.POST("routes")
    suspend fun addRoute(
        @retrofit2.http.Header("Authorization") token: String,
        @retrofit2.http.Body request: RouteRequest
    ): retrofit2.Response<RouteResponse>
}
