package com.his.hospital.dto;

import com.his.hospital.entity.Sucursal;
import com.his.hospital.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CitaDTO {
    // Variables planas (para cuando JS envía medicoId: 1)
    private Long id;
    private Long medicoId;
    private Long pacienteId;
    private Long sucursalId;

    // Objetos anidados como respaldo (para cuando JS envía medico: { id: 1 })
    private User medico;
    private User paciente;
    private Sucursal sucursal;

    // Datos generales de la cita
    private String especialidad;
    private LocalDateTime fechaHora;
    private String motivo;
    private String observaciones;
    private String estado;
}