package com.his.hospital.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TriageDTO {
    private Long citaId;
    private Long enfermeraId;
    private Double temperatura;       // ej: 36.8
    private String presionArterial;   // ej: "120/80"
    private Integer frecuenciaCardiaca; // ej: 78
    private Integer frecuenciaRespiratoria; // ej: 16
    private Integer saturacionOxigeno; // ej: 98
    private Double peso;              // en kg, ej: 68.5
    private Double altura;            // en metros, ej: 1.70
    private String categoria;         // "VERDE", "AMARILLO", "ROJO"
    private String observaciones;
}