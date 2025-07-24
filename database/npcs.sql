-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: oblivion_rpg
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `fichas_npc`
--

DROP TABLE IF EXISTS `fichas_npc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fichas_npc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campanha_id` int DEFAULT NULL,
  `nome_npc` varchar(100) DEFAULT NULL,
  `imagem_url` mediumtext,
  `pv_atual` int DEFAULT NULL,
  `pv_max` int DEFAULT NULL,
  `movimento` varchar(50) DEFAULT NULL,
  `defesa` int DEFAULT NULL,
  `classe_conjuracao` int DEFAULT NULL,
  `classe_manobra` int DEFAULT NULL,
  `atributo_corpo` int DEFAULT NULL,
  `atributo_mente` int DEFAULT NULL,
  `atributo_alma` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campanha_id` (`campanha_id`),
  CONSTRAINT `fichas_npc_ibfk_1` FOREIGN KEY (`campanha_id`) REFERENCES `campanhas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fichas_npc`
--

LOCK TABLES `fichas_npc` WRITE;
/*!40000 ALTER TABLE `fichas_npc` DISABLE KEYS */;
/*!40000 ALTER TABLE `fichas_npc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `npc_acoes`
--

DROP TABLE IF EXISTS `npc_acoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `npc_acoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npc_id` int DEFAULT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `quantidade_acoes` int DEFAULT NULL,
  `efeito` text,
  `extra` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `npc_id` (`npc_id`),
  CONSTRAINT `npc_acoes_ibfk_1` FOREIGN KEY (`npc_id`) REFERENCES `fichas_npc` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `npc_acoes`
--

LOCK TABLES `npc_acoes` WRITE;
/*!40000 ALTER TABLE `npc_acoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `npc_acoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `npc_anotacoes`
--

DROP TABLE IF EXISTS `npc_anotacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `npc_anotacoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npc_id` int DEFAULT NULL,
  `texto` text,
  PRIMARY KEY (`id`),
  KEY `npc_id` (`npc_id`),
  CONSTRAINT `npc_anotacoes_ibfk_1` FOREIGN KEY (`npc_id`) REFERENCES `fichas_npc` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `npc_anotacoes`
--

LOCK TABLES `npc_anotacoes` WRITE;
/*!40000 ALTER TABLE `npc_anotacoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `npc_anotacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `npc_habilidades`
--

DROP TABLE IF EXISTS `npc_habilidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `npc_habilidades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npc_id` int DEFAULT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `efeito` text,
  PRIMARY KEY (`id`),
  KEY `npc_id` (`npc_id`),
  CONSTRAINT `npc_habilidades_ibfk_1` FOREIGN KEY (`npc_id`) REFERENCES `fichas_npc` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `npc_habilidades`
--

LOCK TABLES `npc_habilidades` WRITE;
/*!40000 ALTER TABLE `npc_habilidades` DISABLE KEYS */;
/*!40000 ALTER TABLE `npc_habilidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `npc_pontos_fracos`
--

DROP TABLE IF EXISTS `npc_pontos_fracos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `npc_pontos_fracos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npc_id` int DEFAULT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `efeito` text,
  PRIMARY KEY (`id`),
  KEY `npc_id` (`npc_id`),
  CONSTRAINT `npc_pontos_fracos_ibfk_1` FOREIGN KEY (`npc_id`) REFERENCES `fichas_npc` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `npc_pontos_fracos`
--

LOCK TABLES `npc_pontos_fracos` WRITE;
/*!40000 ALTER TABLE `npc_pontos_fracos` DISABLE KEYS */;
/*!40000 ALTER TABLE `npc_pontos_fracos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `npc_reacoes`
--

DROP TABLE IF EXISTS `npc_reacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `npc_reacoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npc_id` int DEFAULT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `quantidade_reacoes` int DEFAULT NULL,
  `efeito` text,
  `extra` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `npc_id` (`npc_id`),
  CONSTRAINT `npc_reacoes_ibfk_1` FOREIGN KEY (`npc_id`) REFERENCES `fichas_npc` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `npc_reacoes`
--

LOCK TABLES `npc_reacoes` WRITE;
/*!40000 ALTER TABLE `npc_reacoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `npc_reacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `npc_saque`
--

DROP TABLE IF EXISTS `npc_saque`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `npc_saque` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npc_id` int DEFAULT NULL,
  `nome_item` varchar(100) DEFAULT NULL,
  `peso` decimal(5,2) DEFAULT NULL,
  `custo` decimal(10,2) DEFAULT NULL,
  `descricao` text,
  PRIMARY KEY (`id`),
  KEY `npc_id` (`npc_id`),
  CONSTRAINT `npc_saque_ibfk_1` FOREIGN KEY (`npc_id`) REFERENCES `fichas_npc` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `npc_saque`
--

LOCK TABLES `npc_saque` WRITE;
/*!40000 ALTER TABLE `npc_saque` DISABLE KEYS */;
/*!40000 ALTER TABLE `npc_saque` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-23 21:29:32
