package com.his.hospital.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "citas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cita {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación: ¿Quién es el paciente que solicita la consulta?
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "paciente_id", nullable = false)
    private User paciente;

    // Relación: ¿Quién es el médico que lo va a atender?
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "medico_id", nullable = false)
    private User medico;

    // Fecha y Hora exacta de la cita (formato: AAAA-MM-DD THH:MM:SS)
    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    // Motivo de la consulta o síntomas principales (ej: "Dolor de cabeza severo")
    @Column(name = "motivo", nullable = false, length = 255)
    private String motivo;

    // Estado de la cita: "PROGRAMADA", "ATENDIDA", "CANCELADA"
    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "PROGRAMADA";

    // Observaciones adicionales (opcional)
    @Column(name = "observaciones", length = 500)
    private String observaciones;
}