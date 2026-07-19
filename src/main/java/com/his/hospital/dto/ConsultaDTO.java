package com.his.hospital.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConsultaDTO {
    private Long citaId;
    private Long medicoId;
    private String diagnostico;
    private String sintomasYEvolucion;
    private String recetaMedica;
    private String indicacionesGenerales;
}