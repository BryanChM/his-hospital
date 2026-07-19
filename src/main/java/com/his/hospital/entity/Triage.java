package com.his.hospital.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "triage")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Triage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación 1 a 1: Cada cita médica tiene un único registro de triage
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cita_id", nullable = false, unique = true)
    private Cita cita;

    // Relación: ¿Qué enfermera o enfermero registró los signos vitales?
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "enfermera_id", nullable = false)
    private User enfermera;

    // Signos Vitales Principales
    @Column(name = "temperatura", nullable = false)
    private Double temperatura; // En grados Celsius (ej: 36.5)

    @Column(name = "presion_arterial", nullable = false, length = 20)
    private String presionArterial; // Ej: "120/80"

    @Column(name = "frecuencia_cardiaca", nullable = false)
    private Integer frecuenciaCardiaca; // Latidos por minuto (ej: 75)

    @Column(name = "frecuencia_respiratoria")
    private Integer frecuenciaRespiratoria; // Respiraciones por minuto (ej: 16)

    @Column(name = "saturacion_oxigeno")
    private Integer saturacionOxigeno; // SpO2 en porcentaje (ej: 98)

    // Datos antropométricos para el cálculo automático
    @Column(name = "peso", nullable = false)
    private Double peso; // En kilogramos (ej: 70.5)

    @Column(name = "altura", nullable = false)
    private Double altura; // En metros (ej: 1.75)

    // ¡Campo calculado por nuestro servidor!
    @Column(name = "imc", nullable = false)
    private Double imc;

    // Nivel de urgencia según código de colores internacional: VERDE, AMARILLO, ROJO
    @Column(name = "categoria", nullable = false, length = 50)
    private String categoria;

    @Column(name = "observaciones", length = 500)
    private String observaciones;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;
}