package com.his.hospital.repository;

import com.his.hospital.entity.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CitaRepository extends JpaRepository<Cita, Long> {

    // Método para validar que un doctor no tenga choque de horarios (Línea 37)
    boolean existsByMedicoIdAndFechaHoraAndEstadoNot(Long medicoId, LocalDateTime fechaHora, String estado);

    // Método para listar citas de un paciente ordenadas desde la más reciente (Línea 57)
    List<Cita> findByPacienteIdOrderByFechaHoraDesc(Long pacienteId);

    // Método opcional para listar todas las citas del hospital ordenadas
    List<Cita> findAllByOrderByFechaHoraDesc();


}