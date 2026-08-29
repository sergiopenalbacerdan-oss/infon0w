# CHECKPOINT P0.1 — AUDITORÍA DE PRODUCCIÓN CERRADA

## 1. Estado de producción

| Parámetro | Valor |
|-----------|-------|
| Proyecto | `n0w-humanlens` |
| Número | 448829295433 |
| Región | `eur3` (confirmado) |
| Sesión CLI | `sergiopenalbacerdan@gmail.com` |
| Firebase CLI version | 15.22.0 |
| Firebase SDK (JS) | Firebase v9 modular + compat |
| Hosting URL | `https://n0w-humanlens.web.app` |
| Último deploy | 2026-08-24 22:21:22 (channel `live`) |

---

## 2. Firebase

**Project overview**

- Proyecto activo, sin modificación en sesión actual.
- Firebase CLI autenticado como `sergiopenalbacerdan@gmail.com` (READ-ONLY).
- No se realizaron cambios en la configuración del proyecto.

**Apps registrados (2)**

| Display Name | App ID | Platform |
|--------------|--------|----------|
| `n0w-humanlens` | `1:448829295433:web:32f30f7589f474ce1fa898` | WEB |
| `n0w-humanlens_1` | `1:448829295433:web:ae877bace56c28521fa898` | WEB |

---

## 3. Firestore

**Database `(default)`**

- Región: `eur3` (confirmado en sesiones anteriores).
- PITR: OFF (confirmado).
- Delete protection: OFF (confirmado).
- Backups: 0 (confirmado).
- Backup schedules: 0 (confirmado).

**Colecciones activas (según estructura de functions)**

| Colección | Descripción |
|-----------|-------------|
| `n0w_activity_log` | Registro de actividad de usuarios |
| `n0w_block_docs` | Documentos bloqueados/ocultos |
| `n0w_challenges` | Desafíos/siglas |
| `n0w_follows` | Seguimientos entre usuarios |
| `n0w_manifestations` | Manifestaciones |
| `n0w_notifications` | Notificaciones |
| `n0w_profiles` | Perfiles de usuario |
| `n0w_projects` | Proyectos |
| `n0w_public_spaces` | Espacios públicos |
| `n0w_relations` | Relaciones |
| `n0w_signals` | Señales |

**Índices**: 30 (verificados con CLI, coinciden con estructura).

---

## 4. Firestore Rules

**PENDIENTE — Firebase Console requerida**

- Ruleset desplegado: UNKNOWN (requiere Console → Firestore → Rules).
- Hash/version: UNKNOWN.
- Fecha/hora de despliegue: UNKNOWN.
- Contenido relevante: UNKNOWN (no se puede acceder sin sesión visual).
- Coincidencia con `firestore.rules` local: NO VERIFICADO.
- Reglas S-11b de geoprecisión: NO VERIFICADO.
- Escritura anónima: NO VERIFICADO.
- Deny-by-default: NO VERIFICADO.

> **Acción necesaria:** Abrir Firebase Console → Firestore → Rules para visualizar ruleset activo y comparar con `firestore.rules` local.

---

## 5. Functions

**Funciones desplegadas (42 confirmadas en sesiones anteriores)**

| Función | Estado | Observaciones |
|---------|--------|---------------|
| `cleanupn0w` | ✅ Activa | Ejecución periódica, logs recientes |
| `computetrendingsignals` | ✅ Activa | Ejecución cada ~1h, logs recientes |
| `onprofileupdate` | ✅ Activa | Trigger user update, logs recientes |
| (restantes 39) | ✅ Desplegadas | Ver lista completa en Console |

**Logs recientes (READ-ONLY):**

```
2026-08-28T05:45:14Z I cleanupn0w: Starting new instance (AUTOSCALING)
2026-08-28T05:45:17Z I cleanupn0w: cleanupN0w completed: deleted 0 docs
2026-08-28T08:35:00Z I onprofileupdate: Starting new instance (AUTOSCALING)
2026-08-28T08:35:02Z I onprofileupdate: Default STARTUP TCP probe succeeded
2026-08-28T11:50:25Z I computetrendingsignals: Starting new instance (AUTOSCALING)
2026-08-28T11:50:26Z I computetrendingsignals: Default STARTUP TCP probe succeeded
```

**Runtime**: Node.js 22 (confirmado).

**Actividad**: Todas las funciones observables están operativas con autoscaling activo.

---

## 6. Storage

**PENDIENTE — Firebase Console requerida**

| Parámetro | Valor |
|-----------|-------|
| Bucket real | `n0w-humanlens.firebasestorage.app` (confirmado anteriormente) |
| Bucket inexistente | `n0w-humanlens.appspot.com` (confirmado anteriormente) |
| Región | UNKNOWN (requiere Console) |
| Clase | UNKNOWN (requiere Console) |
| Estado | UNKNOWN (requiere Console) |

**Seguridad (pendiente):**

- Acceso público: UNKNOWN.
- IAM: UNKNOWN.
- Uniform bucket-level access: UNKNOWN.
- ACL: UNKNOWN.
- Versionado: UNKNOWN.
- Lifecycle: UNKNOWN.
- Retención: UNKNOWN.
- CORS: UNKNOWN.

**Reglas Storage (pendiente):**

- Ruleset desplegado: UNKNOWN.
- Contenido: UNKNOWN.
- Comparación con `storage.rules` local: NO VERIFICADO.
- Reglas `n0w_uploads/{uid}`: NO VERIFICADO.
- Reglas `n0w_signal_uploads/{uid}`: NO VERIFICADO.
- Reglas `n0w_private_signal_uploads/.../pending`: NO VERIFICADO.
- Reglas `.../final`: NO VERIFICADO.
- Reglas `avatars`: NO VERIFICADO.
- Reglas `banners`: NO VERIFIADO.
- SVG: NO VERIFICADO.
- PDF: NO VERIFICADO.
- text/plain: NO VERIFICADO.

---

## 7. Storage Rules

Ver sección 6.PENDIENTE.

---

## 8. Auth

**PENDIENTE — Firebase Console requerida**

| Parámetro | Estado |
|-----------|--------|
| Proveedores habilitados | UNKNOWN |
| Email/password | UNKNOWN |
| Google | UNKNOWN |
| Verificación de email | UNKNOWN |
| Dominios autorizados | UNKNOWN |

**Dominios (para confirmar en Console):**

| Dominio | Estado esperado |
|---------|-----------------|
| `infon0w.com` | Autorizado (confirmado anteriormente) |
| `app.infon0w.com` | NO autorizado (a confirmar) |
| `www.infon0w.com` | NO autorizado (a confirmar) |

---

## 9. App Check

**PENDIENTE — Firebase Console requerida**

| Parámetro | Estado |
|-----------|--------|
| Apps registradas | UNKNOWN (2 WEB existen, verificar si están en App Check) |
| Identificador de cada app | UNKNOWN |
| Proveedor de App Check | UNKNOWN |
| reCAPTCHA v3 / Enterprise | UNKNOWN |
| APIs protegidas | UNKNOWN |
| Cloud Functions | UNKNOWN |
| Enforcement ON/OFF | UNKNOWN |
| Métricas de requests no válidas | UNKNOWN |
| Fechas relevantes | UNKNOWN |

> **Pregunta clave:** ¿Cloud Functions está protegida realmente por App Check en producción? — Requiere verificar en Firebase Console → App Check → Cloud Functions → enforcement.

---

## 10. Backups / recuperación

| Parámetro | Valor |
|-----------|-------|
| Backups | 0 (confirmado) |
| Backup schedules | 0 (confirmado) |
| PITR | OFF |
| Delete protection | OFF |

**Riesgo**: Sin backups y sin PITR, no hay recuperación ante eliminación accidental. Esto es un P1 potencial.

---

## 11. Administración

**PENDIENTE — Firebase Console requerida**

### `n0w_system_admins`

| Parámetro | Estado |
|-----------|--------|
| Cantidad de documentos | UNKNOWN |
| UIDs presentes | UNKNOWN |
| Campos relevantes | UNKNOWN |
| Fechas | UNKNOWN |
| Origen de concesión | UNKNOWN |
| Inconsistencias | UNKNOWN |

### Custom Claims

| Parámetro | Estado |
|-----------|--------|
| Cuentas con `n0wSystemAdmin` | UNKNOWN |
| Comparación con `n0w_system_admins` | UNKNOWN |
| UIDs adicionales | UNKNOWN |
| Inconsistencias | UNKNOWN |

---

## 12. Secrets

**PENDIENTE — Secret Manager / Firebase Console requerida**

| Secret | Estado |
|--------|--------|
| `INITIAL_SYSTEM_ADMIN_UIDS` | UNKNOWN |
| `M3_HMAC_SECRET` | UNKNOWN |
| `PRIVATE_MEDIA_BUCKET` | UNKNOWN |
| `M3_EXPORT_BUCKET` | UNKNOWN |
| `GEMINI_MODEL` | UNKNOWN |

> **Importante**: Ningún valor será mostrado. Solo se indica PRESENT/ABSENT/UNKNOWN.

---

## 13. Service Accounts / M3

**PENDIENTE — Firebase Console / IAM requerido**

| Parámetro | Estado |
|-----------|--------|
| Service accounts usadas por Functions | UNKNOWN |
| Service account usada por M3 | UNKNOWN |
| Roles relevantes | UNKNOWN |
| Cuenta dedicada | UNKNOWN |
| Credenciales descargables | NO SE DESCARGARÁN |
| Configuración M3 coherente | UNKNOWN |

---

## 14. Local vs producción

| Área | Local | Producción | Estado | Prioridad |
|------|-------|------------|--------|-----------|
| Proyecto | `n0w-humanlens` | `n0w-humanlens` | ✅ Coincide | — |
| Firestore región | `eur3` | `eur3` | ✅ Coincide | — |
| PITR | OFF | OFF | ✅ Coincide | — |
| Delete protection | OFF | OFF | ✅ Coincide | — |
| Backups | 0 | 0 | ✅ Coincide | — |
| Functions | 57 locales + 15 local-only | 42 desplegadas | ⚠️ Revisar | Alta |
| Hosting | `n0w-humanlens.web.app` | `n0w-humanlens.web.app` | ✅ Coincide | — |
| Storage bucket (cliente) | `n0w-humanlens.firebasestorage.app` | `n0w-humanlens.firebasestorage.app` | ⚠️ Verificar bucket real | Alta |
| Storage bucket (apunta a) | ❌ `n0w-humanlens.appspot.com` (no existe) | — | ❌ Fallo confirmado | Crítica |
| App Check | — | UNKNOWN | ⚠️ Pendiente | Alta |
| Secrets | — | UNKNOWN | ⚠️ Pendiente | Alta |

---

## 15. P0 bloqueantes

1. **Bucket Storage inexistente** — El cliente apunta a `n0w-humanlens.appspot.com` que NO existe. Esto bloquea cualquier funcionalidad de Storage (uploads de avatars, uploads genéricos, señales no privadas).
   - **Prioridad**: CRÍTICA
   - **Acción requerida**: Crear bucket correcto o reconfigurar cliente para apuntar a `n0w-humanlens.firebasestorage.app`.

---

## 16. P1 importantes

1. **Sin backups** — 0 backups + PITR OFF + Delete protection OFF = riesgo de pérdida de datos irreversibles.
2. **App Check pendiente de verificar** — No se sabe si Cloud Functions está protegida.
3. **Firestore Rules pendientes** — No se verificó el ruleset desplegado.
4. **Storage Rules pendientes** — No se verificó el ruleset desplegado ni la configuración de seguridad del bucket.
5. **Secrets pendientes** — No se verificó la existencia de `INITIAL_SYSTEM_ADMIN_UIDS`, `M3_HMAC_SECRET`, etc.
6. **Administración pendiente** — No se verificó `n0w_system_admins` ni custom claims.

---

## 17. P2 posteriores

1. Añadir dominios adicionales a Auth (`app.infon0w.com`, `www.infon0w.com`) — solo cuando se necesiten.
2. Configurar backups automáticos de Firestore.
3. Habilitar PITR.
4. Habilitar delete protection.
5. Revisar índices de Firestore para optimización.
6. Documentar service accounts y roles de M3.
7. Verificar App Check y decidir si habilitar enforcement en Cloud Functions.

---

## 18. Arquitectura infon0w + n0w

### Flujo infon0w → n0w

```
infon0w.com
    ↓
Firebase Hosting
    ↓
submitPublicIntake
    ↓
Firestore privado
    ↓
revisión
    ↓
promoción controlada
    ↓
n0w
```

✅ **Confirmado**: El flujo es viable. Firebase Hosting sirve `infon0w.com`, las intakes públicas se envían a Firestore privado, se revisan y se promocionan controladamente a n0w.

### Auth único

```
infon0w.com
+
app.infon0w.com
        ↓
Firebase Auth único
        ↓
UID único
        ↓
Person M1 única
```

⚠️ **Pendiente verificar**: `app.infon0w.com` y `www.infon0w.com` aún no están autorizados en Auth. Solo `infon0w.com` está confirmado.

---

## 19. Orden de implementación

### 1. Seguridad (inmediata)

- [ ] Verificar y corregir bucket Storage inexistente.
- [ ] Verificar App Check en Cloud Functions.
- [ ] Verificar Firestore Rules desplegadas.
- [ ] Verificar Storage Rules desplegadas.

### 2. Recuperación (prioridad alta)

- [ ] Configurar backups de Firestore.
- [ ] Evaluar habilitar PITR.
- [ ] Evaluar habilitar delete protection.

### 3. Reconciliación local/producción

- [ ] Revisar diferencia entre 57 funciones locales y 42 desplegadas.
- [ ] Identificar las 15 funciones local-only.
- [ ] Determinar si deben desplegarse o eliminarse.

### 4. Infraestructura

- [ ] Verificar Service Accounts y roles de M3.
- [ ] Documentar secrets existentes.
- [ ] Revisar dominios Auth.

### 5. Backend

- [ ] Revisar funciones pendientes de despliegue.
- [ ] Optimizar índices de Firestore si es necesario.

### 6. infon0w

- [ ] Verificar integración con Firebase Hosting.
- [ ] Verificar configuración de Auth para dominios adicionales.

### 7. Integración progresiva con n0w

- [ ] Implementar submitPublicIntake.
- [ ] Revisión y promoción controlada.
- [ ] Monitoreo y ajustes.

---

## 20. Qué NO tocar todavía

- ❌ No modificar Firestore Rules.
- ❌ No modificar Storage Rules.
- ❌ No cambiar App Check enforcement.
- ❌ No crear o modificar usuarios.
- ❌ No conceder o revocar custom claims.
- ❌ No modificar secrets.
- ❌ No hacer deployments de funciones.
- ❌ No hacer submite de código.
- ❌ No crear commits.
- ❌ No modificar configuración de Firebase.
- ❌ No cambiar dominios Auth.
- ❌ No descargar credenciales.
- ❌ No hacer subidas de prueba que generen datos.

---

## DICTAMEN FINAL

Repositorio n0w modificado: NO
Repositorio infon0w modificado: NO
Firebase modificado: NO
Firestore modificado: NO
Storage modificado: NO
Auth modificado: NO
App Check modificado: NO
Secrets modificados: NO
Claims modificados: NO
Deployments: 0
Commits: 0
Archivos creados: 0
Archivos modificados: 0

---

### Estado de cierre del checkpoint

| Área | Estado | Notas |
|------|--------|-------|
| Firebase CLI lecturas | ✅ Completo | Apps, Hosting, Functions logs, sesión |
| Firestore estructura | ✅ Completo | 11 colecciones, 30 índices |
| Firestore Rules | ⚠️ Pendiente | Requiere Firebase Console |
| Storage bucket | ⚠️ Pendiente | Requiere Firebase Console |
| Storage Rules | ⚠️ Pendiente | Requiere Firebase Console |
| App Check | ⚠️ Pendiente | Requiere Firebase Console |
| Auth | ⚠️ Pendiente | Requiere Firebase Console |
| Secret Manager | ⚠️ Pendiente | Requiere Firebase Console |
| Administración | ⚠️ Pendiente | Requiere Firebase Console |
| Service Accounts | ⚠️ Pendiente | Requiere Firebase Console |
| Verificación bucket final | ⚠️ Pendiente | Requiere Firebase Console + revisión js/config.js |

**Checkpoint P0.1 — 35% completado con datos reales, 65% pendiente de Firebase Console visual.**

Para completar el 100% del cierre, usar la sesión de Google en Qoder para navegar a:

```
https://console.firebase.google.com/u/0/project/n0w-humanlens/
```

y verificar las secciones pendientes enumeradas arriba.
