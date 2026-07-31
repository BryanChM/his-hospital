package com.his.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "citas")
@Data
public class Cita {
    @ManyToOne
    @JoinColumn(name = "sucursal_id")
    private Sucursal sucursal;

    @Column(name = "observaciones", length = 500)
    private String observaciones;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

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
}