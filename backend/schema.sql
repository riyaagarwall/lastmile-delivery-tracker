-- Last-Mile Delivery Tracker — MySQL 8.0 schema

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(160)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('customer','agent','admin') NOT NULL DEFAULT 'customer',
  phone         VARCHAR(20),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zones (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE
);

-- Maps a pincode / locality string to a zone, so an address can be resolved to a zone
CREATE TABLE areas (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  zone_id               INT NOT NULL,
  pincode_or_locality    VARCHAR(120) NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  UNIQUE KEY uq_area (pincode_or_locality)
);

-- Admin-configured rate cards. from_zone_id = to_zone_id represents an intra-zone rate.
CREATE TABLE rate_cards (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  from_zone_id   INT NOT NULL,
  to_zone_id     INT NOT NULL,
  order_type     ENUM('B2B','B2C') NOT NULL,
  base_rate      DECIMAL(10,2) NOT NULL,       -- flat charge for the first slab / kg
  per_kg_rate    DECIMAL(10,2) NOT NULL,       -- charge per kg beyond base
  cod_surcharge  DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (from_zone_id) REFERENCES zones(id),
  FOREIGN KEY (to_zone_id)   REFERENCES zones(id),
  UNIQUE KEY uq_rate (from_zone_id, to_zone_id, order_type)
);

CREATE TABLE agent_profiles (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  user_id               INT NOT NULL UNIQUE,
  current_zone_id       INT,
  availability_status   ENUM('available','busy','offline') NOT NULL DEFAULT 'offline',
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (current_zone_id) REFERENCES zones(id)
);

CREATE TABLE orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  customer_id       INT NOT NULL,
  created_by_id     INT NOT NULL,              -- who actually created it (customer or admin on their behalf)
  pickup_address    VARCHAR(255) NOT NULL,
  drop_address      VARCHAR(255) NOT NULL,
  pickup_zone_id    INT NOT NULL,
  drop_zone_id      INT NOT NULL,
  agent_id          INT,                       -- nullable until assigned
  order_type        ENUM('B2B','B2C') NOT NULL,
  payment_type      ENUM('Prepaid','COD') NOT NULL,
  length_cm         DECIMAL(8,2) NOT NULL,
  breadth_cm        DECIMAL(8,2) NOT NULL,
  height_cm         DECIMAL(8,2) NOT NULL,
  actual_weight_kg  DECIMAL(8,2) NOT NULL,
  volumetric_weight_kg DECIMAL(8,2) NOT NULL,
  billed_weight_kg  DECIMAL(8,2) NOT NULL,
  charge_amount     DECIMAL(10,2) NOT NULL,
  current_status    ENUM('Created','Picked Up','In Transit','Out for Delivery','Delivered','Failed')
                    NOT NULL DEFAULT 'Created',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id)    REFERENCES users(id),
  FOREIGN KEY (created_by_id)  REFERENCES users(id),
  FOREIGN KEY (pickup_zone_id) REFERENCES zones(id),
  FOREIGN KEY (drop_zone_id)   REFERENCES zones(id),
  FOREIGN KEY (agent_id)       REFERENCES agent_profiles(id)
);

-- Immutable append-only log — never UPDATE a row here, only INSERT
CREATE TABLE status_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  status      ENUM('Created','Picked Up','In Transit','Out for Delivery','Delivered','Failed') NOT NULL,
  actor_role  ENUM('customer','agent','admin','system') NOT NULL,
  actor_id    INT,
  changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE reschedules (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  order_id              INT NOT NULL,
  new_delivery_date     DATE NOT NULL,
  reassigned_agent_id   INT,
  requested_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (reassigned_agent_id) REFERENCES agent_profiles(id)
);

-- Helpful indexes for the queries you'll run most
CREATE INDEX idx_orders_status ON orders(current_status);
CREATE INDEX idx_orders_zone ON orders(pickup_zone_id, drop_zone_id);
CREATE INDEX idx_orders_agent ON orders(agent_id);
CREATE INDEX idx_status_history_order ON status_history(order_id);
