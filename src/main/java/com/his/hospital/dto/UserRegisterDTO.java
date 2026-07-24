package com.his.hospital.dto;

import com.his.hospital.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import com.his.hospital.entity.Sucursal;
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

    // Campos nuevos para registrar personal desde el panel de administración
    private String especialidad;
    private Double precioConsulta;
    private Long sucursalId;
    private Sucursal sucursal;

    // Variable necesaria para que UserService pueda ejecutar dto.getRole()
    private Role role;

}