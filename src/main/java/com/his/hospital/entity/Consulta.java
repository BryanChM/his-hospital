package com.his.hospital.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "consultas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Consulta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación 1 a 1: Una consulta pertenece a una cita médica en específico
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cita_id", nullable = false, unique = true)
    private Cita cita;

    // Relación: ¿Qué médico atendió y emitió la receta?
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "medico_id", nullable = false)
    private User medico;

    // Diagnóstico médico principal (ej: "Migraña tensional aguda")
    @Column(name = "diagnostico", nullable = false, length = 255)
    private String diagnostico;

    // Síntomas y evolución reportados en el consultorio
    @Column(name = "sintomas_y_evolucion", length = 500)
    private String sintomasYEvolucion;

    // Receta médica (medicamentos recetados y sus dosis)
    @Column(name = "receta_medica", nullable = false, length = 1000)
    private String recetaMedica;

    // Indicaciones generales (reposo, dieta, etc.)
    @Column(name = "indicaciones_generales", length = 500)
    private String indicacionesGenerales;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;
}