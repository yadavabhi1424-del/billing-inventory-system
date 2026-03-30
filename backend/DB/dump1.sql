-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: inventory
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
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(100) NOT NULL,
  `description` text,
  `color` varchar(20) DEFAULT '#6366f1',
  `icon` varchar(50) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('387081c1-c322-4d3c-902d-f9265dc35990','Stationary',NULL,'#6366f1',NULL,1,'2026-03-27 16:45:51','2026-03-27 16:45:51'),('7ba577bb-5409-4203-a315-0b680fece1b4','Fruits',NULL,'#6366f1',NULL,1,'2026-03-27 16:45:31','2026-03-27 16:45:31'),('c8c374f9-20a1-11f1-a157-d4939063d02e','General',NULL,'#6366f1',NULL,1,'2026-03-16 00:34:25','2026-03-16 00:34:25'),('dd12c53f-dfee-4fc1-951d-96a66f89588b','Beverages',NULL,'#6366f1',NULL,1,'2026-03-26 17:25:13','2026-03-26 17:25:13');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `loyaltyPoints` int DEFAULT '0',
  `totalSpent` decimal(12,2) DEFAULT '0.00',
  `isActive` tinyint(1) DEFAULT '1',
  `notes` text,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_otps`
--

DROP TABLE IF EXISTS `email_otps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_otps` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `code` char(6) NOT NULL,
  `expiry` datetime NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `email_otps_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_otps`
--

LOCK TABLES `email_otps` WRITE;
/*!40000 ALTER TABLE `email_otps` DISABLE KEYS */;
INSERT INTO `email_otps` VALUES ('7d3ecc15-77d1-4924-a773-b1e4abbaefd8','9a538e0f-7aba-4a53-b6f4-5fe33edc234c','503250','2026-03-29 01:03:28','2026-03-29 00:58:28');
/*!40000 ALTER TABLE `email_otps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invitations`
--

DROP TABLE IF EXISTS `invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invitations` (
  `invite_id` varchar(36) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` enum('ADMIN','MANAGER','CASHIER','STAFF') DEFAULT 'CASHIER',
  `token` varchar(100) NOT NULL,
  `invited_by` varchar(36) DEFAULT NULL,
  `status` enum('PENDING','ACCEPTED','EXPIRED') DEFAULT 'PENDING',
  `expires_at` datetime NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`invite_id`),
  UNIQUE KEY `token` (`token`),
  KEY `invited_by` (`invited_by`),
  CONSTRAINT `invitations_ibfk_1` FOREIGN KEY (`invited_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invitations`
--

LOCK TABLES `invitations` WRITE;
/*!40000 ALTER TABLE `invitations` DISABLE KEYS */;
INSERT INTO `invitations` VALUES ('2354d964-e82a-412f-87ec-a1af49142201','yadavabhinav964104@gmail.com','CASHIER','992e0d0bdb858ffdceeaf03739bac8062d718bf880d08ec08963ce6acffcab5e','039b651e-2056-11f1-a157-d4939063d02e','PENDING','2026-04-03 23:11:28','2026-03-27 23:11:28'),('eb65b17d-3049-411d-9ad3-df88f5f7dcc0','nothing0123459876@gmail.com','ADMIN','7dad956944ed9bcca0d81c1929a6ece0cff4af7cc217f03c2ef3698d4a8ab95f','039b651e-2056-11f1-a157-d4939063d02e','PENDING','2026-04-05 00:15:44','2026-03-29 00:15:44');
/*!40000 ALTER TABLE `invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `transaction_id` varchar(36) NOT NULL,
  `method` enum('CASH','CARD','UPI','NETBANKING','CHEQUE','CREDIT') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES ('0ba5335f-0061-483e-b756-9c97e72db48d','f6562985-4be8-45e2-93c3-70d76f6e3dbc','CASH',150.15,NULL,'2026-03-28 00:24:01'),('0c8300d8-b76e-449c-8fec-e7869513949d','6d7d0aea-8c7c-4f41-bbfe-212879f41797','CASH',245.45,NULL,'2026-03-23 14:33:05'),('112bda45-bc4d-4e60-9680-29f072de970a','d9ccea09-489b-4b8f-9de6-fa272ac4994e','CASH',120.00,NULL,'2026-03-28 00:40:42'),('158d41ab-f35d-45e0-b00a-725a80337f29','85cd81e6-898b-4325-ba7a-f1ffa6bcee61','CASH',400.00,NULL,'2026-03-24 10:35:43'),('1bfe5b88-6e0b-4c7b-8784-1cbd447a0830','9e21af4c-bb03-4499-80f4-d983b7183419','CASH',265.15,NULL,'2026-03-16 10:15:37'),('2174bed5-db5b-4c8f-b560-3cd6a77d566c','41a3822f-cb55-4f61-84a3-9b2301ff8f93','CASH',310.00,NULL,'2026-03-27 23:58:56'),('3c904065-33f5-4ed1-8a32-52c15b54323d','c26bebe7-2947-483d-870e-0ee083014f50','CASH',277.50,NULL,'2026-03-28 00:32:56'),('3e0aadbd-e29c-4bd9-af29-f92a8bc8106c','9a3053ae-bc99-408c-977f-5607ee4963c2','CASH',220.00,NULL,'2026-03-28 00:36:00'),('41bd4276-3ded-4971-a595-2dfd0f690d5f','3cae666f-ecc8-46d7-b378-9692a181ca0b','CASH',90.30,NULL,'2026-03-23 14:34:43'),('71676849-8479-4e17-b833-be2ffaffd745','f61574f9-13f9-49ae-b779-d7474ecaf129','CASH',535.50,NULL,'2026-03-24 10:37:58'),('8818135e-715a-4e80-8bc9-e6b4b258bb38','bde76cb7-4ce0-45db-8353-c2192cb46888','CASH',89.78,NULL,'2026-03-16 08:29:35'),('979acd17-96d3-472d-a26c-470f545f05c5','ee13ab65-00da-42dd-a039-c3a17b6c7fda','CASH',70.00,NULL,'2026-03-28 00:24:59'),('b6afb519-6d6d-40dd-9f95-583b3a7e8a91','105db15f-830c-4d02-833e-fec98c5dc8d2','CASH',299.25,NULL,'2026-03-28 00:21:41'),('d41771fa-2fc1-4f52-b861-967d72769446','6118f5a5-cf5a-492c-b177-5eb5027c2bc7','CASH',761.80,NULL,'2026-03-24 10:19:10'),('d633d94e-69b8-4e06-a03a-d0a52811c11a','2232b884-96da-4798-b358-a327b685af0e','CASH',157.50,NULL,'2026-03-28 10:32:27'),('e42db64d-ba47-46fb-b939-bada5345ba3f','770213b1-866d-4753-bbb8-aa993620f3fd','CASH',220.00,NULL,'2026-03-17 13:07:55');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `product_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(150) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `description` text,
  `category_id` varchar(36) NOT NULL,
  `supplier_id` varchar(36) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'pcs',
  `costPrice` decimal(10,2) DEFAULT '0.00',
  `sellingPrice` decimal(10,2) NOT NULL,
  `mrp` decimal(10,2) DEFAULT NULL,
  `taxRate` decimal(5,2) DEFAULT '0.00',
  `taxType` varchar(10) DEFAULT 'GST',
  `stock` int DEFAULT '0',
  `minStockLevel` int DEFAULT '10',
  `maxStockLevel` int DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `expiryDate` date DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `inventory_type` enum('FINISHED','RAW','WIP','COMPONENT') DEFAULT 'FINISHED',
  `lead_time_days` int DEFAULT '1',
  `min_order_qty` int DEFAULT '1',
  `industry_tags` json DEFAULT NULL,
  `product_seq` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `sku` (`sku`),
  UNIQUE KEY `product_seq` (`product_seq`),
  UNIQUE KEY `barcode` (`barcode`),
  KEY `category_id` (`category_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES ('0678a268-23fe-46f1-8fe1-44acd0396764','Rice','GR-005',NULL,NULL,'c8c374f9-20a1-11f1-a157-d4939063d02e',NULL,'kg',100.00,110.00,NULL,0.00,'GST',11,2,NULL,NULL,NULL,1,NULL,'2026-03-16 10:13:27','2026-03-28 00:36:00','FINISHED',1,1,NULL,1),('3d319cd9-bfb2-4913-8518-7e69e229aed7','Notebook','ST-001',NULL,NULL,'387081c1-c322-4d3c-902d-f9265dc35990',NULL,'pcs',100.00,150.00,NULL,5.00,'GST',41,20,NULL,NULL,NULL,1,NULL,'2026-03-24 10:26:25','2026-03-28 10:32:27','FINISHED',1,1,NULL,2),('80e79ced-9c73-4bd7-850e-b3856029ed0f','Coffee','SKU-007',NULL,NULL,'dd12c53f-dfee-4fc1-951d-96a66f89588b','ae75892c-e6e4-4cdf-a4e7-05ee6a2f0199','box',100.00,120.00,NULL,0.00,'GST',36,10,NULL,NULL,NULL,1,NULL,'2026-03-26 17:26:26','2026-03-28 01:51:25','FINISHED',1,1,NULL,7),('82961c35-a0e0-41f4-9eba-d3b19a57773d','Tea','SKU-008',NULL,NULL,'dd12c53f-dfee-4fc1-951d-96a66f89588b','ae75892c-e6e4-4cdf-a4e7-05ee6a2f0199','pack',50.00,70.00,NULL,0.00,'GST',48,10,NULL,NULL,NULL,1,NULL,'2026-03-26 17:27:59','2026-03-28 01:50:59','FINISHED',1,1,NULL,8),('94e647ee-7f3e-4536-8065-ba9464d985a1','Sugar','GR-002',NULL,NULL,'c8c374f9-20a1-11f1-a157-d4939063d02e',NULL,'kg',40.00,43.00,NULL,5.00,'GST',8,10,NULL,NULL,NULL,1,NULL,'2026-03-16 00:44:39','2026-03-24 10:19:10','FINISHED',1,1,NULL,3),('ad9dcbb6-5dcc-4483-b02c-c9dc1cad273b','Banana','GR-007',NULL,NULL,'7ba577bb-5409-4203-a315-0b680fece1b4',NULL,'dozen',50.00,80.00,NULL,0.00,'GST',45,20,NULL,NULL,NULL,1,NULL,'2026-03-24 10:34:09','2026-03-27 17:26:28','FINISHED',1,1,NULL,4),('e47db9ca-3c78-4dd2-98bf-01bde1be65ac','rice','GR-001',NULL,NULL,'c8c374f9-20a1-11f1-a157-d4939063d02e',NULL,'kg',100.00,120.00,NULL,5.00,'GST',20,2,NULL,NULL,NULL,0,NULL,'2026-03-16 00:43:14','2026-03-16 00:45:27','FINISHED',1,1,NULL,5),('e78ccbe8-f162-447f-a9c3-5df685b39f10','wheat','UHUJ',NULL,NULL,'c8c374f9-20a1-11f1-a157-d4939063d02e',NULL,'pcs',600.00,420.00,NULL,0.00,'GST',5,1,NULL,NULL,NULL,0,'9632-12-31','2026-03-25 10:39:02','2026-03-26 00:02:24','FINISHED',1,1,NULL,6);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `po_item_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `po_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `productName` varchar(150) NOT NULL,
  `quantity` int NOT NULL,
  `receivedQty` int DEFAULT '0',
  `costPrice` decimal(10,2) NOT NULL,
  `taxRate` decimal(5,2) DEFAULT '0.00',
  `taxAmount` decimal(10,2) DEFAULT '0.00',
  `totalAmount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`po_item_id`),
  KEY `po_id` (`po_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `po_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `poNumber` varchar(30) NOT NULL,
  `supplier_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `status` enum('PENDING','ORDERED','PARTIAL','RECEIVED','CANCELLED') DEFAULT 'PENDING',
  `orderDate` datetime DEFAULT CURRENT_TIMESTAMP,
  `expectedDate` date DEFAULT NULL,
  `receivedDate` date DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `taxAmount` decimal(10,2) DEFAULT '0.00',
  `totalAmount` decimal(12,2) NOT NULL,
  `amountPaid` decimal(12,2) DEFAULT '0.00',
  `paymentStatus` enum('PAID','PARTIAL','UNPAID') DEFAULT 'UNPAID',
  `notes` text,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`po_id`),
  UNIQUE KEY `poNumber` (`poNumber`),
  KEY `supplier_id` (`supplier_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_profile`
--

DROP TABLE IF EXISTS `shop_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_profile` (
  `profile_id` varchar(36) NOT NULL,
  `shop_name` varchar(100) NOT NULL,
  `shop_type` varchar(50) NOT NULL,
  `shop_description` text,
  `inventory_types` json NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `timezone` varchar(50) DEFAULT 'Asia/Kolkata',
  `logo` varchar(255) DEFAULT NULL,
  `address` text,
  `gstin` varchar(20) DEFAULT NULL,
  `is_setup_done` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_profile`
--

LOCK TABLES `shop_profile` WRITE;
/*!40000 ALTER TABLE `shop_profile` DISABLE KEYS */;
INSERT INTO `shop_profile` VALUES ('c1f7d462-2444-11f1-a34e-d4939063d02e','My Shop','general_store','My Shop is a retail shop that provides a wide range of everyday essentials required for daily living. It focuses on convenience, affordability, and quick access to commonly used products, making it a go-to place for nearby residents.\n\nProducts (Examples):\n\nGroceries (rice, flour, pulses, sugar)\nPackaged foods (biscuits, snacks, instant noodles)\nBeverages (tea, coffee, soft drinks)\nHousehold items (detergents, soaps, cleaning supplies)\nPersonal care products (shampoo, toothpaste, oils)\nStationery items (notebooks, pens, pencils)','[\"FINISHED\"]','INR','Asia/Kolkata',NULL,'Shop No. 12, Civil Lines, Prayagraj, Uttar Pradesh – 211001, India',NULL,1,'2026-03-20 15:38:35','2026-03-23 02:31:27');
/*!40000 ALTER TABLE `shop_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_types`
--

DROP TABLE IF EXISTS `shop_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_types` (
  `type_key` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `icon` varchar(10) DEFAULT NULL,
  `inventory_types` json DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`type_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_types`
--

LOCK TABLES `shop_types` WRITE;
/*!40000 ALTER TABLE `shop_types` DISABLE KEYS */;
INSERT INTO `shop_types` VALUES ('auto_parts','Auto Parts','🚗','[\"FINISHED\", \"COMPONENT\"]','Vehicle parts, accessories'),('electronics','Electronics Shop','📱','[\"FINISHED\", \"COMPONENT\"]','Phones, appliances, gadgets'),('general_store','General Store','🛒','[\"FINISHED\"]','Grocery, FMCG, daily needs'),('hardware','Hardware Store','🔧','[\"FINISHED\", \"COMPONENT\"]','Tools, materials, parts'),('jewellery','Jewellery','💍','[\"FINISHED\", \"RAW\"]','Gold, silver, gems'),('manufacturing','Manufacturing','🏭','[\"RAW\", \"WIP\", \"COMPONENT\", \"FINISHED\"]','Full production cycle'),('other','Other','🏪','[\"FINISHED\"]','Custom business type'),('pharmacy','Pharmacy','💊','[\"FINISHED\"]','Medicines, healthcare'),('restaurant','Restaurant / Cafe','🍽️','[\"RAW\", \"FINISHED\"]','Food ingredients, beverages'),('stationery','Stationery / Books','📚','[\"FINISHED\"]','Office supplies, books'),('textile','Textile / Clothing','👕','[\"FINISHED\", \"RAW\"]','Fabric, garments, fashion');
/*!40000 ALTER TABLE `shop_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `movement_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `product_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `type` enum('PURCHASE','SALE','RETURN_IN','RETURN_OUT','ADJUSTMENT','DAMAGE','TRANSFER') NOT NULL,
  `quantity` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `reference` varchar(50) DEFAULT NULL,
  `balanceBefore` int NOT NULL,
  `balanceAfter` int NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`movement_id`),
  KEY `product_id` (`product_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES ('035f3a1f-9974-4d6f-99b8-08162712cb59','80e79ced-9c73-4bd7-850e-b3856029ed0f','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',40,'Initial stock',NULL,0,40,'2026-03-26 17:26:26'),('047edd65-8fce-4381-8bf0-81165aa1833c','82961c35-a0e0-41f4-9eba-d3b19a57773d','039b651e-2056-11f1-a157-d4939063d02e','SALE',-1,'POS Sale','INV-20260328-0003',49,48,'2026-03-28 00:24:59'),('0bbbcd2b-8290-44f1-88a8-991e98ce6263','ad9dcbb6-5dcc-4483-b02c-c9dc1cad273b','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',50,'Initial stock',NULL,0,50,'2026-03-24 10:34:09'),('0f7616eb-eb74-4741-b49c-8018945a256c','82961c35-a0e0-41f4-9eba-d3b19a57773d','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',50,'Initial stock',NULL,0,50,'2026-03-26 17:27:59'),('1b68783f-5050-4a76-8fe3-74f966288d03','94e647ee-7f3e-4536-8065-ba9464d985a1','039b651e-2056-11f1-a157-d4939063d02e','SALE',-12,'POS Sale','INV-20260324-0001',20,8,'2026-03-24 10:19:10'),('1cac38f7-03f6-4600-86eb-1a6fd2061a35','0678a268-23fe-46f1-8fe1-44acd0396764','039b651e-2056-11f1-a157-d4939063d02e','SALE',-2,'POS Sale','INV-20260324-0001',15,13,'2026-03-24 10:19:10'),('24238410-b531-4c33-84c2-232b4497965c','94e647ee-7f3e-4536-8065-ba9464d985a1','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',25,'Initial stock',NULL,0,25,'2026-03-16 00:44:39'),('36a8cf42-8d52-4024-b57f-36fc1dbb9d31','80e79ced-9c73-4bd7-850e-b3856029ed0f','039b651e-2056-11f1-a157-d4939063d02e','SALE',-1,'POS Sale','INV-20260328-0004',38,37,'2026-03-28 00:32:56'),('53b4443e-802d-4ab3-ba77-4bf508da7868','3d319cd9-bfb2-4913-8518-7e69e229aed7','039b651e-2056-11f1-a157-d4939063d02e','SALE',-2,'POS Sale','INV-20260328-0001',46,44,'2026-03-28 00:21:41'),('590c1cb2-afb8-4218-8cd9-c8c61ddc9d70','3d319cd9-bfb2-4913-8518-7e69e229aed7','039b651e-2056-11f1-a157-d4939063d02e','SALE',-1,'POS Sale','INV-20260328-0007',42,41,'2026-03-28 10:32:27'),('5bfbae2a-2c80-4225-bcc9-ded10e5e7b90','0678a268-23fe-46f1-8fe1-44acd0396764','039b651e-2056-11f1-a157-d4939063d02e','SALE',-2,'POS Sale','INV-20260328-0005',13,11,'2026-03-28 00:36:00'),('654c19de-0c8a-4e23-9301-18cf721451e4','e47db9ca-3c78-4dd2-98bf-01bde1be65ac','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',20,'Initial stock',NULL,0,20,'2026-03-16 00:43:15'),('688acf70-9226-4e84-a9c5-e94b336cf3ad','0678a268-23fe-46f1-8fe1-44acd0396764','039b651e-2056-11f1-a157-d4939063d02e','SALE',-1,'POS Sale','INV-20260323-0001',16,15,'2026-03-23 14:33:05'),('6dc75d16-2c69-4c7e-9e53-7a6f142ca01c','ad9dcbb6-5dcc-4483-b02c-c9dc1cad273b','039b651e-2056-11f1-a157-d4939063d02e','SALE',-5,'POS Sale','INV-20260324-0002',50,45,'2026-03-24 10:35:43'),('771b003c-1ba4-4bf1-b089-2a596470ecee','0678a268-23fe-46f1-8fe1-44acd0396764','039b651e-2056-11f1-a157-d4939063d02e','SALE',-2,'POS Sale','INV-20260316-0002',20,18,'2026-03-16 10:15:37'),('7841d862-9dc1-4c92-8c13-97b6cfb1e33d','94e647ee-7f3e-4536-8065-ba9464d985a1','039b651e-2056-11f1-a157-d4939063d02e','SALE',-2,'POS Sale','INV-20260316-0001',25,23,'2026-03-16 08:29:35'),('89f4ff0b-261f-4b08-9973-c5b122b76a86','80e79ced-9c73-4bd7-850e-b3856029ed0f','039b651e-2056-11f1-a157-d4939063d02e','SALE',-1,'POS Sale','INV-20260328-0006',37,36,'2026-03-28 00:40:42'),('a9443dff-0066-416a-ace3-3afffeb7d243','0678a268-23fe-46f1-8fe1-44acd0396764','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',20,'Initial stock',NULL,0,20,'2026-03-16 10:13:27'),('b788119c-77b1-4c6b-ab3d-4bd4e4d25cc2','80e79ced-9c73-4bd7-850e-b3856029ed0f','cd06f27f-ac50-4050-8ff6-0f110f32a4cc','SALE',-2,'POS Sale','INV-20260327-0001',40,38,'2026-03-27 23:58:56'),('c1a37e9b-3b07-48f4-894c-e8cecc623d3c','3d319cd9-bfb2-4913-8518-7e69e229aed7','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',48,'Initial stock',NULL,0,48,'2026-03-24 10:26:25'),('c3d9755f-3835-40a5-9bb9-ed752f165dfd','82961c35-a0e0-41f4-9eba-d3b19a57773d','cd06f27f-ac50-4050-8ff6-0f110f32a4cc','SALE',-1,'POS Sale','INV-20260327-0001',50,49,'2026-03-27 23:58:56'),('c59d335f-02cd-4d26-a936-b44892d18b17','94e647ee-7f3e-4536-8065-ba9464d985a1','039b651e-2056-11f1-a157-d4939063d02e','SALE',-1,'POS Sale','INV-20260316-0002',23,22,'2026-03-16 10:15:37'),('c8fad544-2a06-4c78-9ab0-623d0dff63d2','3d319cd9-bfb2-4913-8518-7e69e229aed7','039b651e-2056-11f1-a157-d4939063d02e','SALE',-1,'POS Sale','INV-20260328-0002',44,43,'2026-03-28 00:24:01'),('d51d57c5-a36f-4a8a-8348-595181dc56d5','94e647ee-7f3e-4536-8065-ba9464d985a1','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',3,'Manual stock update via edit',NULL,22,25,'2026-03-23 14:28:23'),('dbf60c3d-4403-4583-88b4-d0fc2bbce083','3d319cd9-bfb2-4913-8518-7e69e229aed7','039b651e-2056-11f1-a157-d4939063d02e','SALE',-1,'POS Sale','INV-20260328-0004',43,42,'2026-03-28 00:32:56'),('ece98bd8-fdd3-4515-9ba3-89e43c23811c','e78ccbe8-f162-447f-a9c3-5df685b39f10','039b651e-2056-11f1-a157-d4939063d02e','ADJUSTMENT',5,'Initial stock',NULL,0,5,'2026-03-25 10:39:02'),('ee265c27-4537-4c86-af19-aa1833506528','94e647ee-7f3e-4536-8065-ba9464d985a1','039b651e-2056-11f1-a157-d4939063d02e','SALE',-3,'POS Sale','INV-20260323-0001',25,22,'2026-03-23 14:33:05'),('fc1a5c1c-1721-4d17-87fa-97590d49303e','3d319cd9-bfb2-4913-8518-7e69e229aed7','039b651e-2056-11f1-a157-d4939063d02e','SALE',-2,'POS Sale','INV-20260324-0003',48,46,'2026-03-24 10:37:58'),('fe9ff80f-9859-4eec-994f-8275f6a7a60e','94e647ee-7f3e-4536-8065-ba9464d985a1','039b651e-2056-11f1-a157-d4939063d02e','SALE',-2,'POS Sale','INV-20260323-0002',22,20,'2026-03-23 14:34:43'),('ffce80b2-b5a5-48b3-a6dc-60346616adec','0678a268-23fe-46f1-8fe1-44acd0396764','039b651e-2056-11f1-a157-d4939063d02e','SALE',-2,'POS Sale','INV-20260317-0001',18,16,'2026-03-17 13:07:55');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `supplier_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(150) NOT NULL,
  `contactPerson` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(15) NOT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `bankName` varchar(100) DEFAULT NULL,
  `bankAccount` varchar(30) DEFAULT NULL,
  `ifscCode` varchar(20) DEFAULT NULL,
  `paymentTerms` varchar(50) DEFAULT '30 days',
  `rating` float DEFAULT '0',
  `isActive` tinyint(1) DEFAULT '1',
  `notes` text,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES ('ae75892c-e6e4-4cdf-a4e7-05ee6a2f0199','ABC Beverages','James',NULL,'9876543210',NULL,'Dispur','Assam',NULL,NULL,NULL,NULL,NULL,'30 days',0,0,NULL,'2026-03-28 01:49:46','2026-03-28 22:53:40');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_items`
--

DROP TABLE IF EXISTS `transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_items` (
  `item_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `transaction_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `productName` varchar(150) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `quantity` int NOT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `costPrice` decimal(10,2) NOT NULL,
  `sellingPrice` decimal(10,2) NOT NULL,
  `taxRate` decimal(5,2) DEFAULT '0.00',
  `taxAmount` decimal(10,2) DEFAULT '0.00',
  `discountAmount` decimal(10,2) DEFAULT '0.00',
  `totalAmount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `transaction_items_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`) ON DELETE CASCADE,
  CONSTRAINT `transaction_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_items`
--

LOCK TABLES `transaction_items` WRITE;
/*!40000 ALTER TABLE `transaction_items` DISABLE KEYS */;
INSERT INTO `transaction_items` VALUES ('2b4558d3-7b74-478c-9e89-4d63505f2cd6','ee13ab65-00da-42dd-a039-c3a17b6c7fda','82961c35-a0e0-41f4-9eba-d3b19a57773d','Tea','SKU-008',1,'pack',50.00,70.00,0.00,0.00,0.00,70.00),('2bf811e0-d6eb-4573-abb8-a8ebf5f41693','41a3822f-cb55-4f61-84a3-9b2301ff8f93','82961c35-a0e0-41f4-9eba-d3b19a57773d','Tea','SKU-008',1,'pack',50.00,70.00,0.00,0.00,0.00,70.00),('312abd91-26b6-480d-933d-290b6d49b39c','9a3053ae-bc99-408c-977f-5607ee4963c2','0678a268-23fe-46f1-8fe1-44acd0396764','Rice','GR-005',2,'kg',100.00,110.00,0.00,0.00,0.00,220.00),('3eafa97d-e51c-4beb-8eff-0b2d8d9bf4cc','41a3822f-cb55-4f61-84a3-9b2301ff8f93','80e79ced-9c73-4bd7-850e-b3856029ed0f','Coffee','SKU-007',2,'box',100.00,120.00,0.00,0.00,0.00,240.00),('400ea2ff-2a63-4093-916e-09c5eb9281a0','3cae666f-ecc8-46d7-b378-9692a181ca0b','94e647ee-7f3e-4536-8065-ba9464d985a1','Sugar','GR-002',2,'kg',40.00,43.00,5.00,4.30,0.00,90.30),('419b91bc-e2f5-4eb7-b842-526dea5e751b','c26bebe7-2947-483d-870e-0ee083014f50','3d319cd9-bfb2-4913-8518-7e69e229aed7','Notebook','ST-001',1,'pcs',100.00,150.00,5.00,7.50,0.00,157.50),('71a3a91b-b22b-465e-ad0c-1125d52f738e','6118f5a5-cf5a-492c-b177-5eb5027c2bc7','0678a268-23fe-46f1-8fe1-44acd0396764','Rice','GR-005',2,'kg',100.00,110.00,0.00,0.00,0.00,220.00),('723891b4-43bb-416a-af12-853c43730041','6118f5a5-cf5a-492c-b177-5eb5027c2bc7','94e647ee-7f3e-4536-8065-ba9464d985a1','Sugar','GR-002',12,'kg',40.00,43.00,5.00,25.80,0.00,541.80),('7caca576-acc5-4715-8bd0-b934483dece0','770213b1-866d-4753-bbb8-aa993620f3fd','0678a268-23fe-46f1-8fe1-44acd0396764','Rice','GR-005',2,'kg',100.00,110.00,0.00,0.00,0.00,220.00),('8203ebd1-c8dc-41fd-a0a9-8e5abab18943','2232b884-96da-4798-b358-a327b685af0e','3d319cd9-bfb2-4913-8518-7e69e229aed7','Notebook','ST-001',1,'pcs',100.00,150.00,5.00,7.50,0.00,157.50),('8b1a7c23-2dc5-4e83-98e8-5833adf1d386','105db15f-830c-4d02-833e-fec98c5dc8d2','3d319cd9-bfb2-4913-8518-7e69e229aed7','Notebook','ST-001',2,'pcs',100.00,150.00,5.00,15.00,0.00,315.00),('8badee13-cc29-4d12-8290-58a099215937','f6562985-4be8-45e2-93c3-70d76f6e3dbc','3d319cd9-bfb2-4913-8518-7e69e229aed7','Notebook','ST-001',1,'pcs',100.00,150.00,5.00,7.50,0.00,157.50),('a0df740d-931c-4753-9c61-ef3bd3daf4e7','9e21af4c-bb03-4499-80f4-d983b7183419','94e647ee-7f3e-4536-8065-ba9464d985a1','sugar','GR-002',1,'kg',40.00,43.00,5.00,2.15,0.00,45.15),('a4baa2ad-81c8-4f2c-918f-d3b0d14bb16e','85cd81e6-898b-4325-ba7a-f1ffa6bcee61','ad9dcbb6-5dcc-4483-b02c-c9dc1cad273b','Banana','GR-007',5,'dozen',50.00,80.00,0.00,0.00,0.00,400.00),('aa7242e6-debf-49e9-b7f9-8dbe4acd2c53','6d7d0aea-8c7c-4f41-bbfe-212879f41797','94e647ee-7f3e-4536-8065-ba9464d985a1','Sugar','GR-002',3,'kg',40.00,43.00,5.00,6.45,0.00,135.45),('b1463e21-7fac-46d1-8530-13f74449edd5','9e21af4c-bb03-4499-80f4-d983b7183419','0678a268-23fe-46f1-8fe1-44acd0396764','Rice','GR-005',2,'kg',100.00,110.00,0.00,0.00,0.00,220.00),('b65235fd-4c63-4005-99b1-f163c43a4d29','6d7d0aea-8c7c-4f41-bbfe-212879f41797','0678a268-23fe-46f1-8fe1-44acd0396764','Rice','GR-005',1,'kg',100.00,110.00,0.00,0.00,0.00,110.00),('c0d19708-18b6-4afd-8b61-086ebfe64b1e','bde76cb7-4ce0-45db-8353-c2192cb46888','94e647ee-7f3e-4536-8065-ba9464d985a1','sugar','GR-002',2,'kg',40.00,45.00,5.00,4.50,0.00,94.50),('e9935052-88cb-4549-b541-143b51a2f956','f61574f9-13f9-49ae-b779-d7474ecaf129','3d319cd9-bfb2-4913-8518-7e69e229aed7','copy','ST-001',2,'pcs',250.00,300.00,5.00,30.00,0.00,630.00),('f26da157-7842-4c40-9588-4dadf0bbd8c2','c26bebe7-2947-483d-870e-0ee083014f50','80e79ced-9c73-4bd7-850e-b3856029ed0f','Coffee','SKU-007',1,'box',100.00,120.00,0.00,0.00,0.00,120.00),('f7580b02-1280-4e81-9fe6-944de450c433','d9ccea09-489b-4b8f-9de6-fa272ac4994e','80e79ced-9c73-4bd7-850e-b3856029ed0f','Coffee','SKU-007',1,'box',100.00,120.00,0.00,0.00,0.00,120.00);
/*!40000 ALTER TABLE `transaction_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `transaction_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `invoiceNumber` varchar(30) NOT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `user_id` varchar(36) NOT NULL,
  `status` enum('COMPLETED','RETURNED','CANCELLED','HOLD') DEFAULT 'COMPLETED',
  `paymentMethod` enum('CASH','CARD','UPI','NETBANKING','CHEQUE','CREDIT','MIXED') DEFAULT 'CASH',
  `paymentStatus` enum('PAID','PARTIAL','UNPAID','REFUNDED') DEFAULT 'PAID',
  `subtotal` decimal(12,2) NOT NULL,
  `discountType` varchar(10) DEFAULT NULL,
  `discountValue` decimal(10,2) DEFAULT '0.00',
  `discountAmount` decimal(10,2) DEFAULT '0.00',
  `taxAmount` decimal(10,2) DEFAULT '0.00',
  `roundOff` decimal(5,2) DEFAULT '0.00',
  `totalAmount` decimal(12,2) NOT NULL,
  `amountPaid` decimal(12,2) DEFAULT '0.00',
  `changeGiven` decimal(10,2) DEFAULT '0.00',
  `notes` text,
  `returnReason` text,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  UNIQUE KEY `invoiceNumber` (`invoiceNumber`),
  KEY `customer_id` (`customer_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES ('105db15f-830c-4d02-833e-fec98c5dc8d2','INV-20260328-0001',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PARTIAL',300.00,'PERCENT',5.00,15.00,15.00,0.00,300.00,299.25,0.00,'Customer: Karan',NULL,'2026-03-28 00:21:41','2026-03-28 00:21:41'),('2232b884-96da-4798-b358-a327b685af0e','INV-20260328-0007',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PARTIAL',150.00,'PERCENT',0.00,0.00,7.50,0.50,158.00,157.50,0.00,'Customer: Shivalaya',NULL,'2026-03-28 10:32:27','2026-03-28 10:32:27'),('3cae666f-ecc8-46d7-b378-9692a181ca0b','INV-20260323-0002',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PAID',86.00,'PERCENT',0.00,0.00,4.30,-0.30,90.00,90.30,0.30,'Customer: Avesh | Ph: 7345678910',NULL,'2026-03-23 14:34:43','2026-03-23 14:34:43'),('41a3822f-cb55-4f61-84a3-9b2301ff8f93','INV-20260327-0001',NULL,'cd06f27f-ac50-4050-8ff6-0f110f32a4cc','COMPLETED','CASH','PAID',310.00,'PERCENT',0.00,0.00,0.00,0.00,310.00,310.00,0.00,'Customer: Ved',NULL,'2026-03-27 23:58:56','2026-03-27 23:58:56'),('6118f5a5-cf5a-492c-b177-5eb5027c2bc7','INV-20260324-0001',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PARTIAL',736.00,'PERCENT',0.00,0.00,25.80,0.20,762.00,761.80,0.00,'Customer: walk-in',NULL,'2026-03-24 10:19:10','2026-03-24 10:19:10'),('6d7d0aea-8c7c-4f41-bbfe-212879f41797','INV-20260323-0001',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PAID',239.00,'PERCENT',0.00,0.00,6.45,-0.45,245.00,245.45,0.45,'Customer: Rahul | Ph: 9876546520',NULL,'2026-03-23 14:33:05','2026-03-23 14:33:05'),('770213b1-866d-4753-bbb8-aa993620f3fd','INV-20260317-0001',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PAID',220.00,'PERCENT',0.00,0.00,0.00,0.00,220.00,220.00,0.00,'Customer: Abhay',NULL,'2026-03-17 13:07:55','2026-03-17 13:07:55'),('85cd81e6-898b-4325-ba7a-f1ffa6bcee61','INV-20260324-0002',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PAID',400.00,'PERCENT',0.00,0.00,0.00,0.00,400.00,400.00,0.00,'Customer: vagisha',NULL,'2026-03-24 10:35:43','2026-03-24 10:35:43'),('9a3053ae-bc99-408c-977f-5607ee4963c2','INV-20260328-0005',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PAID',220.00,'FIXED',0.00,0.00,0.00,0.00,220.00,220.00,0.00,'Customer: Walk-in',NULL,'2026-03-28 00:36:00','2026-03-28 00:36:00'),('9e21af4c-bb03-4499-80f4-d983b7183419','INV-20260316-0002',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PAID',263.00,'PERCENT',0.00,0.00,2.15,-0.15,265.00,265.15,0.15,'Customer: zxcv',NULL,'2026-03-16 10:15:37','2026-03-16 10:15:37'),('bde76cb7-4ce0-45db-8353-c2192cb46888','INV-20260316-0001',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PARTIAL',90.00,'PERCENT',5.00,4.50,4.50,0.00,90.00,89.78,0.00,'Customer: abc',NULL,'2026-03-16 08:29:35','2026-03-16 08:29:35'),('c26bebe7-2947-483d-870e-0ee083014f50','INV-20260328-0004',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PARTIAL',270.00,'FIXED',0.00,0.00,7.50,0.50,278.00,277.50,0.00,'Customer: Akshat',NULL,'2026-03-28 00:32:56','2026-03-28 00:32:56'),('d9ccea09-489b-4b8f-9de6-fa272ac4994e','INV-20260328-0006',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PAID',120.00,'PERCENT',0.00,0.00,0.00,0.00,120.00,120.00,0.00,'Customer: Akshat',NULL,'2026-03-28 00:40:42','2026-03-28 00:40:42'),('ee13ab65-00da-42dd-a039-c3a17b6c7fda','INV-20260328-0003',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PAID',70.00,'FIXED',0.00,0.00,0.00,0.00,70.00,70.00,0.00,'Customer: Walk-in',NULL,'2026-03-28 00:24:59','2026-03-28 00:24:59'),('f61574f9-13f9-49ae-b779-d7474ecaf129','INV-20260324-0003',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PARTIAL',600.00,'PERCENT',15.00,90.00,30.00,0.00,540.00,535.50,0.00,'Customer: Karan',NULL,'2026-03-24 10:37:58','2026-03-24 10:37:58'),('f6562985-4be8-45e2-93c3-70d76f6e3dbc','INV-20260328-0002',NULL,'039b651e-2056-11f1-a157-d4939063d02e','COMPLETED','CASH','PARTIAL',150.00,'FIXED',7.00,7.00,7.50,0.50,151.00,150.15,0.00,'Customer: Ved',NULL,'2026-03-28 00:24:01','2026-03-28 00:24:01');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` varchar(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('OWNER','ADMIN','MANAGER','CASHIER','STAFF') DEFAULT 'CASHIER',
  `phone` varchar(15) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `status` enum('PENDING','APPROVED','REJECTED','DELETED') DEFAULT 'PENDING',
  `approvedBy` varchar(36) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `refreshToken` text,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `emailVerified` tinyint(1) DEFAULT '0',
  `verifyToken` varchar(255) DEFAULT NULL,
  `verifyTokenExpiry` datetime DEFAULT NULL,
  `provider` enum('local','google') DEFAULT 'local',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('039b651e-2056-11f1-a157-d4939063d02e','Abhi','yadavabhi1424@gmail.com','$2a$12$yscCQwBOnQic7EhmraPCbuLf4M8lDAHyb7npyqCT9/DO7zOFaO.Ui','OWNER','9087654321','https://lh3.googleusercontent.com/a/ACg8ocKqThg7khh-cb9tsJXpBYPmh_XkAmojIAERs_9eC8edB0MznA=s96-c',1,'APPROVED',NULL,NULL,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAzOWI2NTFlLTIwNTYtMTFmMS1hMTU3LWQ0OTM5MDYzZDAyZSIsImVtYWlsIjoieWFkYXZhYmhpMTQyNEBnbWFpbC5jb20iLCJyb2xlIjoib3duZXIiLCJuYW1lIjoiQWJoaSIsImRiTmFtZSI6ImludmVudG9yeSIsInVzZXJUeXBlIjoic2hvcCIsImlhdCI6MTc3NDcyNzE4NSwiZXhwIjoxNzc1MzMxOTg1fQ.02zgnk9B50BP8FzGz4-ZsFR7iTimiGOc5AD8Sy9fri0','2026-03-15 15:32:02','2026-03-29 01:16:25',1,NULL,NULL,'local'),('1a739b6b-2ae3-11f1-842e-d4939063d02e','Restorer','readdtest@test.com','dummy','CASHIER',NULL,NULL,0,'DELETED',NULL,NULL,NULL,'2026-03-29 01:47:11','2026-03-29 01:47:11',1,NULL,NULL,'local'),('9a538e0f-7aba-4a53-b6f4-5fe33edc234c','Test User','testuser_new@example.com','$2a$12$99jcmKx7/zKyKGX9lTQwKeKgUYE4HAGo2BnTHeDQOFYg8VX2UI5jO','OWNER','+919876543210',NULL,0,'PENDING',NULL,NULL,NULL,'2026-03-29 00:58:28','2026-03-29 00:58:28',0,'{\"shopType\":\"other\",\"userType\":\"shop\"}',NULL,'local'),('cd06f27f-ac50-4050-8ff6-0f110f32a4cc','AS','yadavabhinav964104@gmail.com','$2a$12$iUClPKOZIZdVf65wAB6Gy.RoPaYCcY3qp0xNb8tg9uf7QgELXpIgq','CASHIER',NULL,NULL,1,'APPROVED',NULL,NULL,NULL,'2026-03-27 23:14:20','2026-03-29 01:48:41',1,NULL,'2026-03-28 23:14:20','local');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-30  1:16:21
