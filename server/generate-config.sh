#!/bin/bash

# Parámetros
USERNAME=$1
IP_ADDRESS=$2
CONFIG_DIR=$3

# Verificar parámetros
if [ -z "$USERNAME" ] || [ -z "$IP_ADDRESS" ] || [ -z "$CONFIG_DIR" ]; then
    echo "Error: Faltan parámetros"
    echo "Uso: $0 <username> <ip_address> <config_dir>"
    exit 1
fi

# Crear directorio si no existe
mkdir -p $CONFIG_DIR

# Generar archivo de configuración del cliente
cat > $CONFIG_DIR/client-$USERNAME.ovpn << EOF
client
dev tun
proto udp
remote YOUR_SERVER_IP 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca ca.crt
cert $USERNAME.crt
key $USERNAME.key
remote-cert-tls server
cipher AES-256-CBC
auth SHA256
verb 3
comp-lzo
EOF

# Generar certificado y clave para el cliente
cd /etc/openvpn/easy-rsa
source ./vars
./build-key --batch $USERNAME

# Copiar archivos necesarios
cp /etc/openvpn/easy-rsa/keys/$USERNAME.crt $CONFIG_DIR/
cp /etc/openvpn/easy-rsa/keys/$USERNAME.key $CONFIG_DIR/
cp /etc/openvpn/ca.crt $CONFIG_DIR/

# Configurar IP estática para el cliente
echo "ifconfig-push $IP_ADDRESS 255.255.255.0" > /etc/openvpn/ccd/$USERNAME

# Establecer permisos
chmod 644 $CONFIG_DIR/client-$USERNAME.ovpn
chown root:root $CONFIG_DIR/client-$USERNAME.ovpn

echo "Configuración generada exitosamente para $USERNAME"
exit 0 