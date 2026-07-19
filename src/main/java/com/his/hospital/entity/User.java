package com.his.hospital.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Regla RN-CU01-04 y RN-CU02-01: Nombre completo (10-100 caracteres)
    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    // Regla RN-CU01-05 y RN-CU02-05: Nombre de usuario único (8-9 caracteres)
    @Column(name = "username", nullable = false, unique = true, length = 9)
    private String username;

    // Regla RN-CU01-06 y RN-CU02-06: Contraseña
    @Column(name = "password", nullable = false)
    private String password;

    // Regla RN-CU01-04 y RN-CU02-04: Correo único
    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    // Regla RN-GLOBAL-001: DPI único (13 caracteres numéricos)
    @Column(name = "dpi", unique = true, length = 13)
    private String dpi;

    // Regla RN-GLOBAL-002: NIT (8-9 caracteres)
    @Column(name = "nit", length = 9)
    private String nit;

    // Regla RN-CU01-08 y RN-CU02-02: Teléfono (8 dígitos)
    @Column(name = "telefono", length = 8)
    private String telefono;

    // Relación con la tabla Roles (RN-CU01-03)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    // Regla RN-CU01-10: Estado 1 = Activo, 0 = Inactivo
    @Column(name = "estado", nullable = false)
    private Integer estado = 1;

    // Regla RN-CU00-03: Control de intentos fallidos y bloqueo por 15 minutos
    @Column(name = "intentos_fallidos")
    private Integer intentosFallidos = 0;

    @Column(name = "cuenta_bloqueada")
    private Boolean cuentaBloqueada = false;

    // Nuevos campos exclusivos para médicos (CU-12 / CU-14)
    @Column(name = "especialidad", length = 100)
    private String especialidad; // Ej: "Pediatría", "Cardiología"

    @Column(name = "precio_consulta")
    private Double precioConsulta; // Ej: 350.00
}