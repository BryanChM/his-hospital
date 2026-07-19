package com.his.hospital.controller;

import com.his.hospital.dto.UserRegisterDTO;
import com.his.hospital.entity.User;
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
    private UserService userService;

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

        // CORRECCIÓN: Llamamos a tu userService en lugar del repositorio
        User usuario = userService.buscarPorUsername(username);

        if (usuario != null && usuario.getPassword().equals(password)) {
            // Obtenemos el rol exacto de la base de datos para que no confunda enfermería con médico
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
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id) {
        try {
            // CORRECCIÓN: Llamamos al userService en lugar del repositorio directamente
            boolean eliminado = userService.eliminarUsuario(id);

            if (eliminado) {
                return ResponseEntity.ok().body(Map.of("mensaje", "Usuario eliminado exitosamente"));
            } else {
                return ResponseEntity.status(404).body(Map.of("error", "El usuario no existe"));
            }
        } catch (Exception e) {
            // Si PostgreSQL bloquea el borrado por una llave foránea (ej: tiene citas agendadas), capturamos el error
            return ResponseEntity.badRequest().body(Map.of("error", "No se puede eliminar el usuario porque tiene citas médicas o historiales clínicos asociados."));
        }
    }
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @RequestBody User usuarioActualizado) {
        try {
            // Llamamos al servicio para guardar los cambios en la base de datos
            User actualizado = userService.actualizarUsuario(id, usuarioActualizado);
            return ResponseEntity.ok().body(Map.of("mensaje", "Datos actualizados correctamente", "usuario", actualizado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}