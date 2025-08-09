# Solución de Problemas: Métricas de Apache en Telegraf

## Problema
El servidor `srv-JULIAN` no está generando métricas de Apache a pesar de tener configurado el input en Telegraf.

## Diagnóstico

### 1. Verificar estado actual
```bash
# Ejecutar el script de diagnóstico
./diagnose-apache.sh
```

### 2. Verificar métricas en la base de datos
```bash
# Verificar si hay métricas de Apache para srv-JULIAN
curl -s "http://localhost:3001/api/aws-apm/metrics?server=srv-JULIAN&from=2025-07-20%2000:00:00&to=2025-07-20%2023:59:59" | jq '.[] | select(.metric_type == "apache")' | head -1
```

## Posibles Causas y Soluciones

### Causa 1: Apache no está corriendo
**Síntomas:** `systemctl is-active apache2` retorna `inactive`

**Solución:**
```bash
sudo systemctl start apache2
sudo systemctl enable apache2
```

### Causa 2: Módulo status no está habilitado
**Síntomas:** `apache2ctl -M` no muestra `status_module`

**Solución:**
```bash
sudo a2enmod status
sudo systemctl reload apache2
```

### Causa 3: Configuración del módulo status incorrecta
**Síntomas:** El endpoint `/server-status?auto` no responde con HTTP 200

**Solución:**
Crear o editar `/etc/apache2/mods-enabled/status.conf`:

```apache
<IfModule mod_status.c>
    ExtendedStatus On
    
    <Location /server-status>
        SetHandler server-status
        Require ip 127.0.0.1 ::1
        Require all granted
    </Location>
</IfModule>
```

### Causa 4: Configuración de Telegraf incorrecta
**Síntomas:** Telegraf no encuentra el input de Apache

**Solución:**
Verificar `/etc/telegraf/telegraf.conf`:

```toml
[[inputs.apache]]
  urls = ["http://localhost/server-status?auto"]
  response_timeout = "5s"
  # Agregar tags para identificar el servidor
  [inputs.apache.tags]
    server = "srv-JULIAN"
```

### Causa 5: Telegraf no está corriendo
**Síntomas:** `systemctl is-active telegraf` retorna `inactive`

**Solución:**
```bash
sudo systemctl start telegraf
sudo systemctl enable telegraf
```

### Causa 6: Problemas de conectividad
**Síntomas:** Telegraf no puede acceder al endpoint de Apache

**Solución:**
```bash
# Verificar conectividad
curl -v http://localhost/server-status?auto

# Verificar logs de Telegraf
sudo tail -f /var/log/telegraf/telegraf.log
```

## Configuración Completa Recomendada

### 1. Configuración de Apache
```bash
# Habilitar módulo status
sudo a2enmod status

# Crear configuración personalizada
sudo tee /etc/apache2/conf-available/status-custom.conf > /dev/null <<EOF
<IfModule mod_status.c>
    ExtendedStatus On
    
    <Location /server-status>
        SetHandler server-status
        Require ip 127.0.0.1 ::1
        Require all granted
    </Location>
</IfModule>
EOF

# Habilitar configuración
sudo a2enconf status-custom

# Recargar Apache
sudo systemctl reload apache2
```

### 2. Configuración de Telegraf
```toml
[[inputs.apache]]
  urls = ["http://localhost/server-status?auto"]
  response_timeout = "5s"
  [inputs.apache.tags]
    server = "srv-JULIAN"

[[outputs.http]]
  url = "http://localhost:3001/api/aws-apm/ingest"
  method = "POST"
  data_format = "json"
  timeout = "10s"
```

### 3. Verificar funcionamiento
```bash
# Probar endpoint de Apache
curl http://localhost/server-status?auto

# Verificar logs de Telegraf
sudo tail -f /var/log/telegraf/telegraf.log

# Verificar métricas en la base de datos
curl "http://localhost:3001/api/aws-apm/metrics?server=srv-JULIAN&from=2025-07-20%2000:00:00&to=2025-07-20%2023:59:59" | jq '.[] | select(.metric_type == "apache")' | head -1
```

## Métricas de Apache Disponibles

Cuando Apache está configurado correctamente, Telegraf recolecta las siguientes métricas:

- **TotalAccesses**: Número total de accesos
- **TotalKBytes**: Kilobytes transferidos
- **CPULoad**: Carga de CPU
- **Uptime**: Tiempo de actividad
- **ReqPerSec**: Peticiones por segundo
- **BytesPerSec**: Bytes por segundo
- **BytesPerReq**: Bytes por petición
- **BusyWorkers**: Trabajadores ocupados
- **IdleWorkers**: Trabajadores inactivos

## Comandos Útiles

```bash
# Reiniciar servicios
sudo systemctl restart apache2
sudo systemctl restart telegraf

# Ver logs en tiempo real
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/telegraf/telegraf.log

# Verificar configuración de Apache
apache2ctl -S

# Verificar configuración de Telegraf
telegraf --test --config /etc/telegraf/telegraf.conf
``` 