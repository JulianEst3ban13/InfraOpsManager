CREATE TABLE IF NOT EXISTS openvpn_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  os_type ENUM('linux', 'windows') NOT NULL,
  ip_address VARCHAR(15) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_connection TIMESTAMP NULL,
  status ENUM('active', 'inactive') DEFAULT 'active'
); 