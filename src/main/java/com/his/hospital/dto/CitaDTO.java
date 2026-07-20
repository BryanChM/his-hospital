package com.his.hospital.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CitaDTO {
    @JsonProperty("pacienteId")
    private Long pacienteId;       // ID del paciente que solicita la cita
    @JsonProperty("medicoId") // También puedes probar con "medico" o "medico_id" según tu app.js
    private Long medicoId;         // ID del médico elegido
    private LocalDateTime fechaHora; // Formato esperado: "2026-07-15T09:30:00"
    private String motivo;         // Motivo de la consulta
    private String observaciones;  // Opcional







}