package com.his.hospital.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRegisterDTO {
    private String nombre;
    private String username;
    private String password;
    private String email;
    private String dpi;
    private String telefono;
    private String nit;

    // Campos nuevos para registrar doctores desde el panel de administración
    private String especialidad;
    private Double precioConsulta;
}