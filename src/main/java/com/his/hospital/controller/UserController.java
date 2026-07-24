package com.his.hospital.controller;

import com.his.hospital.dto.UserRegisterDTO;
import com.his.hospital.entity.User;
import com.his.hospital.repository.CitaRepository;
import com.his.hospital.repository.UserRepository;
import com.his.hospital.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin("*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private CitaRepository citaRepository;

    // POST /api/users/register - Usando UserRegisterDTO
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserRegisterDTO dto) {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            User nuevo = userService.registrarUsuario(dto);
            respuesta.put("exito", true);
            respuesta.put("mensaje", "¡Expediente creado con éxito para: " + nuevo.getNombre() + "!");
            respuesta.put("usuario_id", nuevo.getId());
            respuesta.put("rol_asignado", nuevo.getRole() != null ? nuevo.getRole().getNombre() : "GENERAL");
            return new ResponseEntity<>(respuesta, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.BAD_REQUEST);
        }
    }

    // POST /api/users/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        String username = credenciales.get("username");
        String password = credenciales.get("password");

        User usuario = userService.buscarPorUsername(username);

        if (usuario != null && usuario.getPassword().equals(password)) {
            String nombreRol = (usuario.getRole() != null) ? usuario.getRole().getNombre().toUpperCase() : "GENERAL";

            return ResponseEntity.ok().body(Map.of(
                    "id", usuario.getId(),
                    "usuario", usuario.getNombre(),
                    "username", usuario.getUsername(),
                    "rol", nombreRol
            ));
        } else {
            return ResponseEntity.status(401).body(Map.of("error", "Credenciales incorrectas"));
        }
    }

    // GET /api/users
    @GetMapping
    public ResponseEntity<List<User>> listarTodos() {
        return new ResponseEntity<>(userService.listarTodos(), HttpStatus.OK);
    }

    // GET /api/users/dpi/{dpi}
    @GetMapping("/dpi/{dpi}")
    public ResponseEntity<?> verificarPorDpi(@PathVariable String dpi) {
        Optional<User> usuario = userService.buscarPorDpi(dpi);
        if (usuario.isPresent()) {
            return new ResponseEntity<>(usuario.get(), HttpStatus.OK);
        } else {
            Map<String, String> resp = new HashMap<>();
            resp.put("error", "El DPI no se encuentra registrado en el sistema.");
            return new ResponseEntity<>(resp, HttpStatus.NOT_FOUND);
        }
    }

    // DELETE /api/users/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id) {
        try {
            boolean eliminado = userService.eliminarUsuario(id);

            if (eliminado) {
                return ResponseEntity.ok().body(Map.of("mensaje", "Usuario eliminado exitosamente"));
            } else {
                return ResponseEntity.status(404).body(Map.of("error", "El usuario no existe"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se puede eliminar el usuario porque tiene citas médicas o historiales clínicos asociados."));
        }
    }

    // PUT /api/users/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @RequestBody User datosEditados) {
        return userRepository.findById(id).map(usuario -> {
            usuario.setNombre(datosEditados.getNombre());
            usuario.setTelefono(datosEditados.getTelefono());
            usuario.setEmail(datosEditados.getEmail());
            usuario.setEspecialidad(datosEditados.getEspecialidad());
            usuario.setPrecioConsulta(datosEditados.getPrecioConsulta());
            userRepository.save(usuario);
            return ResponseEntity.ok(usuario);
        }).orElse(ResponseEntity.notFound().build());
    }

    // GET /api/users/sucursal/{id}/especialidades
    @GetMapping("/sucursal/{id}/especialidades")
    public ResponseEntity<List<String>> listarEspecialidadesPorSucursal(@PathVariable Long id) {
        return ResponseEntity.ok(userRepository.findEspecialidadesBySucursal(id));
    }

    // GET /api/users/sucursal/{id}/especialidad/{esp}
    @GetMapping("/sucursal/{id}/especialidad/{esp}")
    public ResponseEntity<List<User>> listarMedicosPorFiltro(@PathVariable Long id, @PathVariable String esp) {
        String especialidadLimpia = (esp != null) ? esp.trim() : "";
        return ResponseEntity.ok(userRepository.findMedicosBySucursalAndEspecialidad(id, especialidadLimpia));
    }

    // GET /api/users/asignacion-automatica
    @GetMapping("/asignacion-automatica")
    public ResponseEntity<?> asignarMedicoAutomatico(
            @RequestParam Long sucursalId,
            @RequestParam String especialidad,
            @RequestParam String fechaHora) {

        // 1. Limpieza obligatoria del texto para evitar fallos por espacios en blanco
        String especialidadLimpia = (especialidad != null) ? especialidad.trim() : "";

        // 2. Buscamos los médicos en PostgreSQL
        List<User> medicos = userRepository.findMedicosBySucursalAndEspecialidad(sucursalId, especialidadLimpia);

        // 3. Validación segura por si la base de datos devuelve nulo o una lista vacía
        if (medicos == null || medicos.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "error", "No hay médicos de esta especialidad (" + especialidadLimpia + ") asignados a esta sucursal."
            ));
        }

        // 4. Algoritmo de balanceo de carga: Asigna el turno al primer médico libre en el horario solicitado
        for (User medico : medicos) {
            boolean ocupado = citaRepository.existsByMedicoIdAndFechaHora(medico.getId(), fechaHora);
            if (!ocupado) {
                return ResponseEntity.ok(medico);
            }
        }

        // 5. Si todos los especialistas coinciden en estar ocupados a esa misma hora
        return ResponseEntity.status(409).body(Map.of(
                "error", "Todos los médicos de esta especialidad están ocupados en este horario. Por favor escoja otra fecha u hora."
        ));
    }
}