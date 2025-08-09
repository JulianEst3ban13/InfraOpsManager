#!/bin/bash

echo "🔍 Diagnóstico de configuración Apache/Telegraf"
echo "=============================================="

echo ""
echo "1. Verificando si Apache está corriendo..."
if systemctl is-active --quiet apache2; then
    echo "✅ Apache2 está activo"
else
    echo "❌ Apache2 NO está activo"
fi

echo ""
echo "2. Verificando si el módulo status está habilitado..."
if apache2ctl -M 2>/dev/null | grep -q status_module; then
    echo "✅ Módulo status habilitado"
else
    echo "❌ Módulo status NO habilitado"
fi

echo ""
echo "3. Verificando configuración del módulo status..."
if [ -f /etc/apache2/mods-enabled/status.conf ]; then
    echo "✅ Archivo de configuración status.conf encontrado"
    echo "   Contenido:"
    cat /etc/apache2/mods-enabled/status.conf | grep -E "(Location|Require|ExtendedStatus)" || echo "   No se encontraron configuraciones relevantes"
else
    echo "❌ Archivo de configuración status.conf NO encontrado"
fi

echo ""
echo "4. Verificando acceso al endpoint server-status..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost/server-status?auto | grep -q "200"; then
    echo "✅ Endpoint server-status accesible (HTTP 200)"
    echo "   Respuesta de ejemplo:"
    curl -s http://localhost/server-status?auto | head -5
else
    echo "❌ Endpoint server-status NO accesible"
    echo "   Código de respuesta: $(curl -s -o /dev/null -w "%{http_code}" http://localhost/server-status?auto)"
fi

echo ""
echo "5. Verificando configuración de Telegraf..."
if [ -f /etc/telegraf/telegraf.conf ]; then
    echo "✅ Archivo de configuración Telegraf encontrado"
    echo "   Configuración Apache encontrada:"
    grep -A 5 -B 5 "inputs.apache" /etc/telegraf/telegraf.conf || echo "   No se encontró configuración de Apache"
else
    echo "❌ Archivo de configuración Telegraf NO encontrado"
fi

echo ""
echo "6. Verificando logs de Telegraf..."
if [ -f /var/log/telegraf/telegraf.log ]; then
    echo "✅ Logs de Telegraf encontrados"
    echo "   Últimas líneas relacionadas con Apache:"
    tail -20 /var/log/telegraf/telegraf.log | grep -i apache || echo "   No se encontraron logs relacionados con Apache"
else
    echo "❌ Logs de Telegraf NO encontrados"
fi

echo ""
echo "7. Verificando si Telegraf está corriendo..."
if systemctl is-active --quiet telegraf; then
    echo "✅ Telegraf está activo"
else
    echo "❌ Telegraf NO está activo"
fi

echo ""
echo "8. Verificando puertos abiertos..."
echo "   Puerto 80 (Apache):"
netstat -tlnp | grep :80 || echo "   Puerto 80 no encontrado"
echo "   Puerto 8086 (InfluxDB):"
netstat -tlnp | grep :8086 || echo "   Puerto 8086 no encontrado"

echo ""
echo "🔍 Diagnóstico completado" 