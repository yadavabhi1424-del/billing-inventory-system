-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: supplier_9ed4e45d6be84d39
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
  `category_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `color` varchar(20) DEFAULT '#6366f1',
  `icon` varchar(50) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('ab95fc27-43b0-416a-acce-7f75e6b674b5','Stationary',NULL,'#6366f1',NULL,1,'2026-03-31 13:37:54');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `shop_tenant_id` varchar(36) DEFAULT NULL,
  `notes` text,
  `totalSpent` decimal(12,2) DEFAULT '0.00',
  `isActive` tinyint(1) DEFAULT '1',
  `is_network` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES ('inventory','My Shop','my_shop_entory','yadavabhi1424@gmail.com','0000000000',NULL,NULL,NULL,'inventory',NULL,0.00,1,0,'2026-03-31 16:36:48');
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
  `role` enum('ADMIN','MANAGER','STAFF') DEFAULT 'STAFF',
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
/*!40000 ALTER TABLE `invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` varchar(36) NOT NULL,
  `transaction_id` varchar(36) NOT NULL,
  `method` varchar(20) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES ('3b4ddbf2-bba7-4a3e-a05a-12cfb66caadf','d3b994f1-6de9-413f-9325-103c6c563772','CASH',300.00,NULL,'2026-04-02 22:12:44'),('5d2a781f-a4d9-4d79-a509-2f5b56993f28','e2e72884-65d9-43a3-81c3-53e804234bb4','CASH',350.00,NULL,'2026-04-02 14:20:45'),('ae176c15-8baf-4a3f-a66e-b4be942484f2','c812b745-304b-40af-b774-962fef13da65','CASH',1400.00,NULL,'2026-04-01 02:24:28'),('e7719866-7941-46b2-beae-206746603243','e7c32dd5-740d-436d-a12a-1fa5903720b8','CASH',100.00,NULL,'2026-04-01 02:15:33');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `product_id` varchar(36) NOT NULL,
  `product_seq` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `description` text,
  `category_id` varchar(36) DEFAULT NULL,
  `supplier_id` varchar(36) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'pcs',
  `costPrice` decimal(10,2) DEFAULT '0.00',
  `sellingPrice` decimal(10,2) DEFAULT '0.00',
  `mrp` decimal(10,2) DEFAULT NULL,
  `taxRate` decimal(5,2) DEFAULT '0.00',
  `taxType` varchar(20) DEFAULT 'GST',
  `stock` int DEFAULT '0',
  `minStockLevel` int DEFAULT '10',
  `maxStockLevel` int DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `inventory_type` enum('FINISHED','RAW','WIP','COMPONENT') DEFAULT 'FINISHED',
  `is_public` tinyint(1) DEFAULT '0',
  `isActive` tinyint(1) DEFAULT '1',
  `synced_at` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `product_seq` (`product_seq`),
  UNIQUE KEY `sku` (`sku`),
  KEY `fk_category` (`category_id`),
  KEY `fk_supplier` (`supplier_id`),
  CONSTRAINT `fk_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `fk_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES ('a22615b4-0109-4e53-98c8-98e32f6d2541',2,'Sketch Pen','SKU-002',NULL,NULL,'ab95fc27-43b0-416a-acce-7f75e6b674b5',NULL,'pack',40.00,50.00,NULL,0.00,'GST',85,20,NULL,NULL,NULL,NULL,'FINISHED',0,1,NULL,'2026-04-01 02:21:02'),('a436f504-05ee-4d79-9ae9-715467abb767',1,'Notebook','SKU-001',NULL,NULL,'ab95fc27-43b0-416a-acce-7f75e6b674b5',NULL,'pcs',90.00,100.00,NULL,5.00,'GST',86,20,NULL,NULL,NULL,NULL,'FINISHED',1,1,NULL,'2026-03-31 14:47:31');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `po_item_id` varchar(36) NOT NULL,
  `po_id` varchar(36) NOT NULL,
  `product_id` varchar(36) DEFAULT NULL,
  `productName` varchar(200) NOT NULL,
  `quantity` int NOT NULL,
  `receivedQty` int DEFAULT '0',
  `costPrice` decimal(10,2) NOT NULL,
  `taxRate` decimal(5,2) DEFAULT '0.00',
  `taxAmount` decimal(10,2) DEFAULT '0.00',
  `totalAmount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`po_item_id`),
  KEY `po_id` (`po_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`)
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
  `po_id` varchar(36) NOT NULL,
  `poNumber` varchar(50) NOT NULL,
  `supplier_id` varchar(36) DEFAULT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `status` enum('PENDING','ORDERED','PARTIAL','RECEIVED','CANCELLED') DEFAULT 'PENDING',
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `taxAmount` decimal(10,2) DEFAULT '0.00',
  `totalAmount` decimal(12,2) DEFAULT '0.00',
  `expectedDate` date DEFAULT NULL,
  `receivedDate` date DEFAULT NULL,
  `notes` text,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`po_id`),
  UNIQUE KEY `poNumber` (`poNumber`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`)
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
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `is_setup_done` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_profile`
--

LOCK TABLES `shop_profile` WRITE;
/*!40000 ALTER TABLE `shop_profile` DISABLE KEYS */;
INSERT INTO `shop_profile` VALUES ('7a1ed6a2-57f8-4ce3-9ede-8809cb18c34e','KSY Stationary Supplier','stationery','KSY Stationery Suppliers is a reliable distributor of high-quality stationery products catering to schools, offices, and retail stores. The company offers a wide range of items including notebooks, pens, pencils, files, registers, printing paper, art supplies, and office essentials. Known for consistent product quality and timely delivery, ABC Stationery Suppliers focuses on maintaining strong client relationships through competitive pricing and dependable service. Whether for bulk institutional needs or everyday office use, the supplier ensures availability of trusted brands along with cost-effective alternatives.','[\"FINISHED\"]','INR','Asia/Kolkata',NULL,'Shop No. 12, First Floor, Shree Plaza Near Alambagh Bus Stand Alambagh Lucknow, Uttar Pradesh – 226005 India',NULL,NULL,NULL,1,'2026-03-31 13:22:48');
/*!40000 ALTER TABLE `shop_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `movement_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `type` enum('SALE','PURCHASE','ADJUSTMENT','DAMAGE','RETURN_IN','RETURN_OUT','TRANSFER') NOT NULL,
  `quantity` int NOT NULL,
  `reason` text,
  `reference` varchar(100) DEFAULT NULL,
  `balanceBefore` int DEFAULT '0',
  `balanceAfter` int DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`movement_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES ('10a2a40a-0828-492c-a939-e9bbd3ca135c','a436f504-05ee-4d79-9ae9-715467abb767','a510c117-2d4f-4c69-aefc-75c65899f972','SALE',-1,'POS Sale','INV-20260401-0001',100,99,'2026-04-01 02:15:33'),('279ad5c8-411e-45b5-b1df-15e8e6718e57','a22615b4-0109-4e53-98c8-98e32f6d2541','a510c117-2d4f-4c69-aefc-75c65899f972','ADJUSTMENT',100,'Initial stock',NULL,0,100,'2026-04-01 02:21:02'),('348c14d2-241e-4ce0-b561-fca7aa8377d5','a436f504-05ee-4d79-9ae9-715467abb767','a510c117-2d4f-4c69-aefc-75c65899f972','SALE',-1,'POS Sale','INV-20260402-0001',90,89,'2026-04-02 14:20:45'),('487e3ed8-638b-401b-8c96-f9a8b0deddc1','a436f504-05ee-4d79-9ae9-715467abb767','a510c117-2d4f-4c69-aefc-75c65899f972','ADJUSTMENT',100,'Initial stock',NULL,0,100,'2026-03-31 14:47:31'),('4a7bcb00-ced2-4aaf-b641-802390a336b5','a22615b4-0109-4e53-98c8-98e32f6d2541','a510c117-2d4f-4c69-aefc-75c65899f972','SALE',-10,'POS Sale','INV-20260401-0002',100,90,'2026-04-01 02:24:28'),('6e2e9a40-02bf-42a2-99ee-5fef0bf9ee88','a436f504-05ee-4d79-9ae9-715467abb767','a510c117-2d4f-4c69-aefc-75c65899f972','SALE',-9,'POS Sale','INV-20260401-0002',99,90,'2026-04-01 02:24:28'),('96c7893f-87d4-4318-b68e-370f2b7db314','a436f504-05ee-4d79-9ae9-715467abb767','a510c117-2d4f-4c69-aefc-75c65899f972','SALE',-3,'POS Sale','INV-20260402-0002',89,86,'2026-04-02 22:12:44'),('a98647a0-17d8-481e-830a-241fe5749ba2','a22615b4-0109-4e53-98c8-98e32f6d2541','a510c117-2d4f-4c69-aefc-75c65899f972','SALE',-5,'POS Sale','INV-20260402-0001',90,85,'2026-04-02 14:20:45');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `supplier_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) DEFAULT NULL,
  `contactPerson` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `bankName` varchar(100) DEFAULT NULL,
  `bankAccount` varchar(50) DEFAULT NULL,
  `ifscCode` varchar(20) DEFAULT NULL,
  `paymentTerms` varchar(50) DEFAULT '30 days',
  `notes` text,
  `isActive` tinyint(1) DEFAULT '1',
  `is_network` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_items`
--

DROP TABLE IF EXISTS `transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_items` (
  `item_id` varchar(36) NOT NULL,
  `transaction_id` varchar(36) NOT NULL,
  `product_id` varchar(36) DEFAULT NULL,
  `productName` varchar(200) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `costPrice` decimal(10,2) DEFAULT '0.00',
  `sellingPrice` decimal(10,2) NOT NULL,
  `taxRate` decimal(5,2) DEFAULT '0.00',
  `taxAmount` decimal(10,2) DEFAULT '0.00',
  `discountAmount` decimal(10,2) DEFAULT '0.00',
  `totalAmount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `transaction_items_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`),
  CONSTRAINT `transaction_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_items`
--

LOCK TABLES `transaction_items` WRITE;
/*!40000 ALTER TABLE `transaction_items` DISABLE KEYS */;
INSERT INTO `transaction_items` VALUES ('337e0208-bd59-4224-b635-5b371dee3d5b','c812b745-304b-40af-b774-962fef13da65','a436f504-05ee-4d79-9ae9-715467abb767','Notebook','SKU-001',9,'pcs',90.00,100.00,5.00,45.00,0.00,945.00),('4012605a-3662-427f-b7e6-54908619cc0e','e2e72884-65d9-43a3-81c3-53e804234bb4','a22615b4-0109-4e53-98c8-98e32f6d2541','Sketch Pen','SKU-002',5,'pack',40.00,50.00,0.00,0.00,0.00,250.00),('4f0ba8a4-6f99-41d8-8f0e-7f91cf9b440d','e7c32dd5-740d-436d-a12a-1fa5903720b8','a436f504-05ee-4d79-9ae9-715467abb767','Notebook','SKU-001',1,'pcs',90.00,100.00,5.00,5.00,0.00,105.00),('6d8c48c3-97b2-49e5-a6ab-dbee280cb41c','c812b745-304b-40af-b774-962fef13da65','a22615b4-0109-4e53-98c8-98e32f6d2541','Sketch Pen','SKU-002',10,'pack',40.00,50.00,0.00,0.00,0.00,500.00),('92f12d74-46b6-4d2b-8088-f8078e92843e','e2e72884-65d9-43a3-81c3-53e804234bb4','a436f504-05ee-4d79-9ae9-715467abb767','Notebook','SKU-001',1,'pcs',90.00,100.00,5.00,5.00,0.00,105.00),('d0193a36-c92b-4635-9c5e-3f83d68d0fd1','d3b994f1-6de9-413f-9325-103c6c563772','a436f504-05ee-4d79-9ae9-715467abb767','Notebook','SKU-001',3,'pcs',90.00,100.00,5.00,15.00,0.00,315.00);
/*!40000 ALTER TABLE `transaction_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `transaction_id` varchar(36) NOT NULL,
  `invoiceNumber` varchar(50) NOT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `status` enum('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','COMPLETED') DEFAULT 'COMPLETED',
  `paymentStatus` enum('UNPAID','PARTIAL','PAID') DEFAULT 'UNPAID',
  `paymentMethod` enum('CASH','UPI','CARD','CREDIT','OTHER') DEFAULT 'CASH',
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `discountType` enum('PERCENT','FIXED') DEFAULT NULL,
  `discountValue` decimal(10,2) DEFAULT '0.00',
  `taxAmount` decimal(10,2) DEFAULT '0.00',
  `roundOff` decimal(5,2) DEFAULT '0.00',
  `discountAmount` decimal(10,2) DEFAULT '0.00',
  `totalAmount` decimal(12,2) NOT NULL,
  `amountPaid` decimal(12,2) DEFAULT '0.00',
  `changeGiven` decimal(10,2) DEFAULT '0.00',
  `notes` text,
  `expectedDate` date DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
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
INSERT INTO `transactions` VALUES ('c812b745-304b-40af-b774-962fef13da65','INV-20260401-0002',NULL,'a510c117-2d4f-4c69-aefc-75c65899f972','COMPLETED','PARTIAL','CASH',1400.00,'PERCENT',0.00,45.00,0.00,0.00,1445.00,1400.00,0.00,'Customer: My Shop',NULL,'2026-04-01 02:24:28'),('d3b994f1-6de9-413f-9325-103c6c563772','INV-20260402-0002',NULL,'a510c117-2d4f-4c69-aefc-75c65899f972','COMPLETED','PARTIAL','CASH',300.00,'PERCENT',0.00,15.00,0.00,0.00,315.00,300.00,0.00,'Customer: My Shop',NULL,'2026-04-02 22:12:44'),('e2e72884-65d9-43a3-81c3-53e804234bb4','INV-20260402-0001',NULL,'a510c117-2d4f-4c69-aefc-75c65899f972','COMPLETED','PARTIAL','CASH',350.00,'PERCENT',0.00,5.00,0.00,0.00,355.00,350.00,0.00,'Customer: My Shop',NULL,'2026-04-02 14:20:45'),('e7c32dd5-740d-436d-a12a-1fa5903720b8','INV-20260401-0001',NULL,'a510c117-2d4f-4c69-aefc-75c65899f972','COMPLETED','PARTIAL','CASH',100.00,'PERCENT',0.00,5.00,0.00,0.00,105.00,100.00,0.00,'Customer: My Shop',NULL,'2026-04-01 02:15:33');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `provider` enum('local','google') DEFAULT 'local',
  `role` enum('OWNER','ADMIN','MANAGER','STAFF') DEFAULT 'STAFF',
  `phone` varchar(20) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','DELETED') DEFAULT 'PENDING',
  `isActive` tinyint(1) DEFAULT '1',
  `emailVerified` tinyint(1) DEFAULT '0',
  `verifyToken` varchar(255) DEFAULT NULL,
  `verifyTokenExpiry` datetime DEFAULT NULL,
  `refreshToken` text,
  `approvedBy` varchar(36) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('a510c117-2d4f-4c69-aefc-75c65899f972','KSY','karansyfb7575@gmail.com','$2a$12$8n.USl2KJXn7Jx1KU0JG4O.QSOKr6NEO7oEiJ7R/lRaGvD7SBkH6G','local','OWNER','+918756543910',NULL,'APPROVED',1,1,NULL,NULL,NULL,NULL,NULL,'2026-03-31 13:14:15');
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

-- Dump completed on 2026-04-03  0:18:19
