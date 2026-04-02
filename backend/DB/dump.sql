-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: stocksense_master
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `b2b_order_items`
--

DROP TABLE IF EXISTS `b2b_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b2b_order_items` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `qty` int DEFAULT '1',
  `total` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `b2b_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `b2b_orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `b2b_order_items`
--

LOCK TABLES `b2b_order_items` WRITE;
/*!40000 ALTER TABLE `b2b_order_items` DISABLE KEYS */;
INSERT INTO `b2b_order_items` VALUES ('373092dd-bfdd-4db6-868d-f6fa38557735','d5ad577a-1463-4afc-8a30-412c0dadba34','a436f504-05ee-4d79-9ae9-715467abb767','Notebook','SKU-001',100.00,1,100.00),('3ad2751f-00bb-44a1-9004-0244f36961a5','baeaf1e3-074f-4a50-a3b1-d429d1dae575','a22615b4-0109-4e53-98c8-98e32f6d2541','Sketch Pen','SKU-002',50.00,10,500.00),('973305a8-80c0-4e34-8bba-a83b9a20353f','baeaf1e3-074f-4a50-a3b1-d429d1dae575','a436f504-05ee-4d79-9ae9-715467abb767','Notebook','SKU-001',100.00,9,900.00);
/*!40000 ALTER TABLE `b2b_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `b2b_orders`
--

DROP TABLE IF EXISTS `b2b_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b2b_orders` (
  `order_id` varchar(36) NOT NULL,
  `order_number` int NOT NULL AUTO_INCREMENT,
  `shop_id` varchar(36) NOT NULL,
  `supplier_id` varchar(36) NOT NULL,
  `status` enum('PENDING','ACCEPTED','BILLED','CLOSED','REJECTED') DEFAULT 'PENDING',
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_number` (`order_number`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `b2b_orders`
--

LOCK TABLES `b2b_orders` WRITE;
/*!40000 ALTER TABLE `b2b_orders` DISABLE KEYS */;
INSERT INTO `b2b_orders` VALUES ('baeaf1e3-074f-4a50-a3b1-d429d1dae575',2,'inventory','9ed4e45d-6be8-4d39-b578-4bbd37b6e122','CLOSED',1400.00,NULL,'2026-04-01 02:21:54','2026-04-01 02:25:33'),('d5ad577a-1463-4afc-8a30-412c0dadba34',1,'inventory','9ed4e45d-6be8-4d39-b578-4bbd37b6e122','CLOSED',100.00,NULL,'2026-04-01 01:30:28','2026-04-01 02:22:49');
/*!40000 ALTER TABLE `b2b_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `global_users`
--

DROP TABLE IF EXISTS `global_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `global_users` (
  `email` varchar(100) NOT NULL,
  `db_name` varchar(80) NOT NULL,
  `user_type` enum('shop','supplier') NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `global_users`
--

LOCK TABLES `global_users` WRITE;
/*!40000 ALTER TABLE `global_users` DISABLE KEYS */;
INSERT INTO `global_users` VALUES ('karansyfb7575@gmail.com','supplier_9ed4e45d6be84d39','supplier','2026-03-31 13:14:15'),('nothing0123459876@gmail.com','supplier_fd8d25b8502f457a','supplier','2026-03-28 23:45:52'),('tiyeb13599@smkanba.com','stocksense_tenant_b15d6534d0a14ed6','shop','2026-03-28 23:45:52'),('yadavabhinav964104@gmail.com','inventory','shop','2026-03-29 01:48:41');
/*!40000 ALTER TABLE `global_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `plan_name` varchar(20) NOT NULL,
  `display_name` varchar(50) NOT NULL,
  `price_monthly` decimal(10,2) DEFAULT '0.00',
  `max_users` int DEFAULT NULL,
  `max_products` int DEFAULT NULL,
  `ai_enabled` tinyint(1) DEFAULT '0',
  `reports_enabled` tinyint(1) DEFAULT '0',
  `description` text,
  PRIMARY KEY (`plan_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES ('BASIC','Basic',149.00,5,500,0,1,'For small businesses'),('ENTERPRISE','Enterprise',NULL,NULL,NULL,1,1,'Custom pricing'),('FREE','Free',0.00,2,200,0,0,'Perfect for trying out'),('PRO','Pro',499.00,10,NULL,1,1,'For growing businesses');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profiles` (
  `profile_id` varchar(36) NOT NULL,
  `entity_id` varchar(36) NOT NULL,
  `entity_type` enum('shop','supplier') NOT NULL,
  `business_name` varchar(100) NOT NULL,
  `owner_name` varchar(100) DEFAULT NULL,
  `slug` varchar(120) NOT NULL,
  `description` text,
  `logo` varchar(255) DEFAULT NULL,
  `city` varchar(60) DEFAULT NULL,
  `state` varchar(60) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `business_type` varchar(50) DEFAULT 'general',
  `is_public` tinyint(1) DEFAULT '1',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `address` text,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `uq_entity` (`entity_id`,`entity_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profiles`
--

LOCK TABLES `profiles` WRITE;
/*!40000 ALTER TABLE `profiles` DISABLE KEYS */;
INSERT INTO `profiles` VALUES ('5512a360-2ce9-11f1-842e-d4939063d02e','9ed4e45d-6be8-4d39-b578-4bbd37b6e122','supplier','KSY\'s Business',NULL,'ksy_s_business_9ed4e4',NULL,NULL,NULL,NULL,NULL,'general',1,'2026-03-31 15:36:49',NULL,NULL,NULL,NULL,NULL),('7a1ed6a2-57f8-4ce3-9ede-8809cb18c34e','supplier_9ed4e45d6be84d39','shop','KSY Stationary Supplier',NULL,'ksy_stationary_supplier_e84d39','KSY Stationery Suppliers is a reliable distributor of high-quality stationery products catering to schools, offices, and retail stores. The company offers a wide range of items including notebooks, pens, pencils, files, registers, printing paper, art supplies, and office essentials. Known for consistent product quality and timely delivery, ABC Stationery Suppliers focuses on maintaining strong client relationships through competitive pricing and dependable service. Whether for bulk institutional needs or everyday office use, the supplier ensures availability of trusted brands along with cost-effective alternatives.',NULL,NULL,NULL,NULL,'stationery',1,'2026-03-31 13:22:48','Shop No. 12, First Floor, Shree Plaza Near Alambagh Bus Stand Alambagh Lucknow, Uttar Pradesh – 226005 India',NULL,NULL,NULL,NULL),('965c0575-9c45-458e-b7ee-645549d97d12','stocksense_tenant_b15d6534d0a14ed6','shop','as shop',NULL,'as_shop_a14ed6','as shop is hardware shop where you can find all types of hardware components',NULL,NULL,NULL,NULL,'hardware',1,'2026-03-28 23:20:50','2/3, local street, lucknow','tiyeb13599@smkanba.com','+9198876456789',NULL,NULL),('cb0bc51f-8cca-459f-a42a-66a418c08fbf','inventory','shop','My Shop',NULL,'my_shop_entory','My Shop is a retail shop that provides a wide range of everyday essentials required for daily living. It focuses on convenience, affordability, and quick access to commonly used products, making it a go-to place for nearby residents.\n\nProducts (Examples):\n\nGroceries (rice, flour, pulses, sugar)\nPackaged foods (biscuits, snacks, instant noodles)\nBeverages (tea, coffee, soft drinks)\nHousehold items (detergents, soaps, cleaning supplies)\nPersonal care products (shampoo, toothpaste, oils)\nStationery items (notebooks, pens, pencils)',NULL,NULL,NULL,NULL,'general_store',1,'2026-03-29 02:44:39',NULL,'yadavabhi1424@gmail.com',NULL,NULL,NULL);
/*!40000 ALTER TABLE `profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_supplier_map`
--

DROP TABLE IF EXISTS `shop_supplier_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_supplier_map` (
  `map_id` varchar(36) NOT NULL,
  `shop_id` varchar(36) NOT NULL,
  `supplier_id` varchar(36) NOT NULL,
  `status` enum('PENDING','ACCEPTED','REJECTED') DEFAULT 'PENDING',
  `initiated_by` enum('shop','supplier') NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`map_id`),
  UNIQUE KEY `uq_shop_sup` (`shop_id`,`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_supplier_map`
--

LOCK TABLES `shop_supplier_map` WRITE;
/*!40000 ALTER TABLE `shop_supplier_map` DISABLE KEYS */;
INSERT INTO `shop_supplier_map` VALUES ('80c36348-c5dc-4cd0-b43f-b1b1a7e714fb','inventory','supplier_9ed4e45d6be84d39','ACCEPTED','supplier','2026-03-31 16:34:19'),('a8f5a8cc-205a-4168-bf77-edd4085f6b1e','inventory','supplier_fd8d25b8502f457a','ACCEPTED','shop','2026-03-29 00:54:34'),('c9d77523-ef80-486f-9ba6-7e73ae081242','inventory','9ed4e45d-6be8-4d39-b578-4bbd37b6e122','ACCEPTED','shop','2026-04-01 01:30:28');
/*!40000 ALTER TABLE `shop_supplier_map` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `sub_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `plan` enum('FREE','BASIC','PRO','ENTERPRISE') DEFAULT 'FREE',
  `status` enum('ACTIVE','EXPIRED','CANCELLED') DEFAULT 'ACTIVE',
  `max_users` int DEFAULT '2',
  `max_products` int DEFAULT '100',
  `ai_enabled` tinyint(1) DEFAULT '0',
  `reports_enabled` tinyint(1) DEFAULT '0',
  `started_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `razorpay_sub_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`sub_id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES ('8ab872e4-dba7-4c55-a501-13cace87c3fb','b15d6534-d0a1-4ed6-b83c-b88ac893cc89','FREE','ACTIVE',2,200,0,0,'2026-03-27 15:09:45','2026-04-26 15:09:45',NULL),('b9aa14de-2442-11f1-a34e-d4939063d02e','b0dce2d6-2442-11f1-a34e-d4939063d02e','PRO','ACTIVE',10,NULL,1,1,'2026-03-20 15:24:02','2027-03-20 15:24:02',NULL);
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `super_admins`
--

DROP TABLE IF EXISTS `super_admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `super_admins` (
  `admin_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `super_admins`
--

LOCK TABLES `super_admins` WRITE;
/*!40000 ALTER TABLE `super_admins` DISABLE KEYS */;
/*!40000 ALTER TABLE `super_admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_products`
--

DROP TABLE IF EXISTS `supplier_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_products` (
  `id` varchar(36) NOT NULL,
  `supplier_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `description` text,
  `unit` varchar(20) DEFAULT 'pcs',
  `price` decimal(10,2) DEFAULT '0.00',
  `image` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sup_prod` (`supplier_id`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_products`
--

LOCK TABLES `supplier_products` WRITE;
/*!40000 ALTER TABLE `supplier_products` DISABLE KEYS */;
INSERT INTO `supplier_products` VALUES ('a59c3d41-405d-4e41-8447-9236b98b6fb2','9ed4e45d-6be8-4d39-b578-4bbd37b6e122','a22615b4-0109-4e53-98c8-98e32f6d2541','Sketch Pen','SKU-002',NULL,'pack',50.00,NULL,1,'2026-04-01 02:21:02'),('e6095bdd-7d1d-426e-98f2-14254e46a06a','9ed4e45d-6be8-4d39-b578-4bbd37b6e122','a436f504-05ee-4d79-9ae9-715467abb767','Notebook','SKU-001',NULL,'pcs',100.00,NULL,1,'2026-03-31 22:28:03');
/*!40000 ALTER TABLE `supplier_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `supplier_id` varchar(36) NOT NULL,
  `business_name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `owner_name` varchar(100) NOT NULL,
  `owner_email` varchar(100) NOT NULL,
  `owner_phone` varchar(20) DEFAULT NULL,
  `db_name` varchar(80) NOT NULL,
  `status` enum('TRIAL','ACTIVE','SUSPENDED') DEFAULT 'TRIAL',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `owner_email` (`owner_email`),
  UNIQUE KEY `db_name` (`db_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES ('9ed4e45d-6be8-4d39-b578-4bbd37b6e122','KSY\'s Business','ksy_s_business_9ed4e4','KSY','karansyfb7575@gmail.com','+918756543910','supplier_9ed4e45d6be84d39','TRIAL','2026-03-31 13:14:14');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `tenant_id` varchar(36) NOT NULL,
  `shop_name` varchar(100) NOT NULL,
  `shop_slug` varchar(50) NOT NULL,
  `owner_name` varchar(100) NOT NULL,
  `owner_email` varchar(100) NOT NULL,
  `owner_phone` varchar(20) DEFAULT NULL,
  `db_name` varchar(100) NOT NULL,
  `status` enum('ACTIVE','SUSPENDED','TRIAL') DEFAULT 'TRIAL',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`),
  UNIQUE KEY `shop_slug` (`shop_slug`),
  UNIQUE KEY `owner_email` (`owner_email`),
  UNIQUE KEY `db_name` (`db_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES ('b0dce2d6-2442-11f1-a34e-d4939063d02e','My Shop','my_shop','Super Admin','yadavabhi1424@gmail.com',NULL,'inventory','ACTIVE','2026-03-20 15:23:56','2026-03-20 15:26:32'),('b15d6534-d0a1-4ed6-b83c-b88ac893cc89','as\'s Shop','as_s_shop_b15d65','as','tiyeb13599@smkanba.com','+9198876456789','stocksense_tenant_b15d6534d0a14ed6','TRIAL','2026-03-27 15:09:45','2026-03-27 15:09:45');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-01 16:40:59
