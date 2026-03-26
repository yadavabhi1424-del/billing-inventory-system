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
INSERT INTO `subscriptions` VALUES ('2c32ff63-b523-4095-9f89-979db8a27287','be1dff97-3666-4f7d-9a60-0397113b492b','FREE','ACTIVE',2,200,0,0,'2026-03-24 10:42:52','2026-04-23 10:42:52',NULL),('b9aa14de-2442-11f1-a34e-d4939063d02e','b0dce2d6-2442-11f1-a34e-d4939063d02e','PRO','ACTIVE',10,NULL,1,1,'2026-03-20 15:24:02','2027-03-20 15:24:02',NULL);
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
INSERT INTO `tenants` VALUES ('b0dce2d6-2442-11f1-a34e-d4939063d02e','My Shop','my_shop','Super Admin','yadavabhi1424@gmail.com',NULL,'inventory','ACTIVE','2026-03-20 15:23:56','2026-03-20 15:26:32'),('be1dff97-3666-4f7d-9a60-0397113b492b','Karan\'s Shop','karan_s_shop_be1dff','Karan','karansy4321@gmail.com','+917310043738','stocksense_tenant_be1dff9736664f7d','TRIAL','2026-03-24 10:42:52','2026-03-24 10:42:52');
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

-- Dump completed on 2026-03-26 13:13:00
