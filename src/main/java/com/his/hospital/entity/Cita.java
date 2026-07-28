package com.his.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "citas")
@Data
public class Cita {
    @Column(name = "observaciones", length = 500)
    private String observaciones;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación directa de ID a ID para el paciente (evita errores de símbolos y uniones complejas)
    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    // Relación directa de ID a ID para el médico asignado
    @Column(name = "medico_id", nullable = false)
    private Long medicoId;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    @Column(name = "motivo", nullable = false, length = 255)
    private String motivo;

    @Column(name = "estado", length = 50)
    private String estado = "PROGRAMADA";

    @Column(name = "hora_llegada")
    private LocalDateTime horaLlegada;

    @Column(name = "prioridad", length = 20)
    private String prioridad = "NORMAL";

    @Column(name = "especialidad", length = 100)
    private String especialidad;

    @Column(name = "sucursal", length = 100)
    private String sucursal;
}