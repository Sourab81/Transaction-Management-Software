-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: May 05, 2026 at 08:47 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `enest_api`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_counters`
--

CREATE TABLE `tbl_counters` (
  `id` int(11) NOT NULL,
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `opening_balance` varchar(255) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `status` tinyint(4) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_counters`
--

INSERT INTO `tbl_counters` (`id`, `create_date`, `update_date`, `name`, `opening_balance`, `remark`, `user_id`, `status`) VALUES
(1, NULL, NULL, 'IT', '20000', 'this is the test remark', '1', 1),
(2, NULL, NULL, 'Marketing', '20000', 'this is the test remark', '1', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_roles`
--

CREATE TABLE `tbl_roles` (
  `id` int(11) NOT NULL,
  `create_date` datetime DEFAULT current_timestamp(),
  `update_date` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_id` varchar(200) DEFAULT NULL,
  `role_name` varchar(255) NOT NULL,
  `privileges` text NOT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_roles`
--

INSERT INTO `tbl_roles` (`id`, `create_date`, `update_date`, `user_id`, `role_name`, `privileges`, `status`) VALUES
(1, '2026-03-06 13:20:09', '2026-04-29 12:52:12', '', 'Super Admin', '{\"Master_account_manage\":1,\"Master_department_manage\":1,\"Customers_add\":1,\"Customers_list\":1,\"Customers_payment_list\":1,\"Customers_outstanding\":1,\"Services_access\":1,\"accounts_cash_deposit\":1,\"Accounts_department_transfer\":1,\"Reminder_new_sms\":1,\"Reminder_set_reminder\":1,\"Reminder_scheduled_message\":1,\"Reports_bank_counter_report\":1,\"Reports_day_report_service_charge_details\":1,\"reports_day_report_account_and_counter_details\":1,\"Reports_day_report_expense_details\":1,\"Reports_day_report_net_details\":1,\"Reports_day_report_grand_total\":1,\"Reports_day_report_log_report\":1,\"Reports_service_report\":1,\"Employee_add\":1,\"Employee_list\":1,\"Employee_salary\":1,\"Employee_outstanding\":1,\"Expense_access\":1}', 1),
(2, '2026-03-13 11:49:47', '2026-04-29 12:50:41', '', 'Business', '{\"Master_account_manage\":1,\"Master_department_manage\":1,\"Customers_add\":1,\"Customers_list\":1,\"Customers_payment_list\":1,\"Customers_outstanding\":1,\"Services_access\":1,\"accounts_cash_deposit\":1,\"Accounts_department_transfer\":1,\"Reminder_new_sms\":0,\"Reminder_set_reminder\":0,\"Reminder_scheduled_message\":0,\"Reports_bank_counter_report\":0,\"Reports_day_report_service_charge_details\":0,\"reports_day_report_account_and_counter_details\":0,\"Reports_day_report_expense_details\":0,\"Reports_day_report_net_details\":0,\"Reports_day_report_grand_total\":0,\"Reports_day_report_log_report\":0,\"Reports_service_report\":0,\"Employee_add\":1,\"Employee_list\":1,\"Employee_salary\":1,\"Employee_outstanding\":1,\"Expense_access\":1}', 1),
(3, '2026-04-29 17:21:34', '2026-04-29 17:21:34', '1', 'My Employee', '{\"Master_account_manage\":0,\"Master_department_manage\":0,\"Customers_add\":1,\"Customers_list\":0,\"Customers_payment_list\":1,\"Customers_outstanding\":1,\"Services_access\":1,\"accounts_cash_deposit\":1,\"Accounts_department_transfer\":1,\"Reminder_new_sms\":0,\"Reminder_set_reminder\":0,\"Reminder_scheduled_message\":0,\"Reports_bank_counter_report\":0,\"Reports_day_report_service_charge_details\":0,\"reports_day_report_account_and_counter_details\":0,\"Reports_day_report_expense_details\":0,\"Reports_day_report_net_details\":0,\"Reports_day_report_grand_total\":0,\"Reports_day_report_log_report\":0,\"Reports_service_report\":0,\"Employee_add\":1,\"Employee_list\":1,\"Employee_salary\":1,\"Employee_outstanding\":1,\"Expense_access\":1}', 1),
(5, '2026-04-29 17:23:26', '2026-04-29 17:23:26', NULL, 'Cashier', '{\"Master_account_manage\":1,\"Master_department_manage\":1,\"Customers_add\":1,\"Customers_list\":1,\"Customers_payment_list\":1,\"Customers_outstanding\":1,\"Services_access\":1,\"accounts_cash_deposit\":1,\"Accounts_department_transfer\":1,\"Reminder_new_sms\":0,\"Reminder_set_reminder\":0,\"Reminder_scheduled_message\":0,\"Reports_bank_counter_report\":0,\"Reports_day_report_service_charge_details\":0,\"reports_day_report_account_and_counter_details\":0,\"Reports_day_report_expense_details\":0,\"Reports_day_report_net_details\":0,\"Reports_day_report_grand_total\":0,\"Reports_day_report_log_report\":0,\"Reports_service_report\":0,\"Employee_add\":1,\"Employee_list\":1,\"Employee_salary\":1,\"Employee_outstanding\":1,\"Expense_access\":1}', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_users`
--

CREATE TABLE `tbl_users` (
  `id` int(11) NOT NULL,
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `nickname` varchar(255) DEFAULT NULL,
  `gender` varchar(200) NOT NULL DEFAULT 'male',
  `contact_no` varchar(200) DEFAULT NULL,
  `email_id` varchar(200) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `user_type` enum('Admin','Business') DEFAULT 'Business',
  `user_id` varchar(255) DEFAULT NULL COMMENT 'Created By user',
  `status` tinyint(4) NOT NULL DEFAULT 1,
  `role` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`id`, `create_date`, `update_date`, `fullname`, `nickname`, `gender`, `contact_no`, `email_id`, `username`, `password`, `user_type`, `user_id`, `status`, `role`) VALUES
(1, NULL, NULL, 'Sagar Thakur', 'Sagar', 'male', '6265965711', 'sagar@gmail.com', 'sagar@gmail.com', 'Sagar@11', 'Business', '2', 1, '2'),
(2, NULL, NULL, 'Admin', 'Admin', 'male', '7771864467', 'admin@gmail.com', 'admin@gmail.com', '112233', 'Admin', NULL, 1, '1'),
(3, '2026-04-25 12:05:09', '2026-04-25 12:05:09', 'New Business Name', NULL, 'male', '9876543210', 'newbusiness@gmail.com', 'newbusiness@gmail.com', 'password123', 'Business', '2', 1, '2');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_counters`
--
ALTER TABLE `tbl_counters`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email_id` (`email_id`),
  ADD UNIQUE KEY `contact_no` (`contact_no`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_counters`
--
ALTER TABLE `tbl_counters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
