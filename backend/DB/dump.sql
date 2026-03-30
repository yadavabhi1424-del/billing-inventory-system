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
INSERT INTO `global_users` VALUES ('nothing0123459876@gmail.com','supplier_fd8d25b8502f457a','supplier','2026-03-28 23:45:52'),('tiyeb13599@smkanba.com','stocksense_tenant_b15d6534d0a14ed6','shop','2026-03-28 23:45:52'),('yadavabhinav964104@gmail.com','inventory','shop','2026-03-29 01:48:41');
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
INSERT INTO `profiles` VALUES ('564e5269-8af9-4922-862a-d94e9a2655da','supplier_fd8d25b8502f457a','supplier','ABC Beverages','karan_s_business_2f457a','ABC Beverages is a wholesale and distribution company specializing in a wide range of non-alcoholic drinks including packaged drinking water, soft drinks, fruit juices, energy drinks, and dairy-based beverages. The supplier partners with leading national and regional brands to ensure consistent quality and timely delivery. With a strong logistics network across Lucknow and nearby districts, ABC Beverages caters to retail stores, supermarkets, restaurants, and institutional clients. The company focuses on maintaining product freshness, competitive pricing, and reliable supply chain operations.',NULL,NULL,NULL,NULL,'warehouse',1,'2026-03-29 02:44:39',NULL,'nothing0123459876@gmail.com','+918756543910',NULL,NULL),('965c0575-9c45-458e-b7ee-645549d97d12','stocksense_tenant_b15d6534d0a14ed6','shop','as shop','as_shop_a14ed6','as shop is hardware shop where you can find all types of hardware components',NULL,NULL,NULL,NULL,'hardware',1,'2026-03-28 23:20:50','2/3, local street, lucknow','tiyeb13599@smkanba.com','+9198876456789',NULL,NULL),('cb0bc51f-8cca-459f-a42a-66a418c08fbf','inventory','shop','My Shop','my_shop_entory','My Shop is a retail shop that provides a wide range of everyday essentials required for daily living. It focuses on convenience, affordability, and quick access to commonly used products, making it a go-to place for nearby residents.\n\nProducts (Examples):\n\nGroceries (rice, flour, pulses, sugar)\nPackaged foods (biscuits, snacks, instant noodles)\nBeverages (tea, coffee, soft drinks)\nHousehold items (detergents, soaps, cleaning supplies)\nPersonal care products (shampoo, toothpaste, oils)\nStationery items (notebooks, pens, pencils)',NULL,NULL,NULL,NULL,'general_store',1,'2026-03-29 02:44:39',NULL,'yadavabhi1424@gmail.com',NULL,NULL,NULL);
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
INSERT INTO `shop_supplier_map` VALUES ('a8f5a8cc-205a-4168-bf77-edd4085f6b1e','inventory','supplier_fd8d25b8502f457a','ACCEPTED','shop','2026-03-29 00:54:34');
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
INSERT INTO `suppliers` VALUES ('fd8d25b8-502f-457a-a9f1-aab04d48a721','Karan\'s Business','karan_s_business_fd8d25','Karan','nothing0123459876@gmail.com','+918756543910','supplier_fd8d25b8502f457a','TRIAL','2026-03-28 22:56:47');
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

-- Dump completed on 2026-03-30  1:15:32
