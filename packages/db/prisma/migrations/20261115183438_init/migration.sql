-- CreateTable
CREATE TABLE `club_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `name` VARCHAR(120) NOT NULL DEFAULT 'Filtradores',
    `shortName` VARCHAR(40) NOT NULL DEFAULT 'Filtradores',
    `city` VARCHAR(120) NULL,
    `about` TEXT NULL,
    `logoKey` VARCHAR(255) NULL,
    `primaryColor` VARCHAR(9) NOT NULL DEFAULT '#0b3d91',
    `secondaryColor` VARCHAR(9) NOT NULL DEFAULT '#f2c200',
    `contactEmail` VARCHAR(160) NULL,
    `contactPhone` VARCHAR(30) NULL,
    `instagram` VARCHAR(80) NULL,
    `pickupInfo` TEXT NULL,
    `termsText` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `emailVerifiedAt` DATETIME(3) NULL,
    `cpf` CHAR(11) NULL,
    `phone` VARCHAR(20) NULL,
    `birthDate` DATE NULL,
    `photoKey` VARCHAR(255) NULL,
    `passwordHash` VARCHAR(255) NULL,
    `isMaster` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `totpSecretEnc` BLOB NULL,
    `totpEnabledAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_cpf_key`(`cpf`),
    INDEX `users_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `mfaPending` BOOLEAN NOT NULL DEFAULT false,
    `client` VARCHAR(16) NOT NULL DEFAULT 'web',
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(500) NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_tokenHash_key`(`tokenHash`),
    INDEX `user_sessions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `temp_hashes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `operation` ENUM('EMAIL_CONFIRMATION', 'PASSWORD_RESET', 'INVITE') NOT NULL,
    `hash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `temp_hashes_hash_key`(`hash`),
    INDEX `temp_hashes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recovery_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `codeHash` VARCHAR(255) NOT NULL,
    `usedAt` DATETIME(3) NULL,

    INDEX `recovery_codes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(40) NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(255) NULL,
    `require2fa` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_key_key`(`key`),
    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `roleId` INTEGER NOT NULL,
    `permission` VARCHAR(64) NOT NULL,

    PRIMARY KEY (`roleId`, `permission`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,

    INDEX `user_roles_roleId_idx`(`roleId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_permission_overrides` (
    `userId` INTEGER NOT NULL,
    `permission` VARCHAR(64) NOT NULL,
    `effect` ENUM('GRANT', 'DENY') NOT NULL,

    PRIMARY KEY (`userId`, `permission`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_staff` (
    `eventId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `event_staff_userId_idx`(`userId`),
    PRIMARY KEY (`eventId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `action` VARCHAR(64) NOT NULL,
    `entity` VARCHAR(48) NULL,
    `entityId` VARCHAR(48) NULL,
    `data` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `body` TEXT NULL,
    `link` VARCHAR(255) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_readAt_idx`(`userId`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,
    `tierLevel` INTEGER NOT NULL DEFAULT 1,
    `priceCents` INTEGER NOT NULL,
    `period` ENUM('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    `enrollmentFeeCents` INTEGER NOT NULL DEFAULT 0,
    `storeDiscountPct` INTEGER NOT NULL DEFAULT 0,
    `ticketDiscountPct` INTEGER NOT NULL DEFAULT 0,
    `eventAccess` ENUM('NONE', 'CLAIM', 'AUTOMATIC') NOT NULL DEFAULT 'NONE',
    `benefits` JSON NULL,
    `color` VARCHAR(9) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `membership_plans_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memberships` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `memberNumber` INTEGER NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'OVERDUE', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NULL,
    `currentPeriodStart` DATETIME(3) NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `cancelReason` VARCHAR(255) NULL,
    `qrVersion` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `memberships_userId_key`(`userId`),
    UNIQUE INDEX `memberships_memberNumber_key`(`memberNumber`),
    INDEX `memberships_planId_idx`(`planId`),
    INDEX `memberships_status_currentPeriodEnd_idx`(`status`, `currentPeriodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership_charges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `membershipId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `amountCents` INTEGER NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` ENUM('OPEN', 'PAID', 'CANCELED', 'OVERDUE') NOT NULL DEFAULT 'OPEN',
    `isEnrollment` BOOLEAN NOT NULL DEFAULT false,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `membership_charges_membershipId_idx`(`membershipId`),
    INDEX `membership_charges_planId_idx`(`planId`),
    INDEX `membership_charges_status_dueDate_idx`(`status`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(100) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `isMatch` BOOLEAN NOT NULL DEFAULT true,
    `opponent` VARCHAR(120) NULL,
    `competition` VARCHAR(120) NULL,
    `venue` VARCHAR(160) NULL,
    `address` VARCHAR(255) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `gatesOpenAt` DATETIME(3) NULL,
    `capacity` INTEGER NULL,
    `memberAccess` BOOLEAN NOT NULL DEFAULT true,
    `memberCapacity` INTEGER NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `coverKey` VARCHAR(255) NULL,
    `homeScore` INTEGER NULL,
    `awayScore` INTEGER NULL,
    `calc_memberClaims` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `events_slug_key`(`slug`),
    INDEX `events_status_startsAt_idx`(`status`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_eligible_plans` (
    `eventId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,

    INDEX `event_eligible_plans_planId_idx`(`planId`),
    PRIMARY KEY (`eventId`, `planId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(255) NULL,
    `priceCents` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `calc_allocated` INTEGER NOT NULL DEFAULT 0,
    `maxPerOrder` INTEGER NOT NULL DEFAULT 10,
    `salesStartAt` DATETIME(3) NULL,
    `salesEndAt` DATETIME(3) NULL,
    `membersOnly` BOOLEAN NOT NULL DEFAULT false,
    `memberDiscount` BOOLEAN NOT NULL DEFAULT true,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ticket_types_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `eventId` INTEGER NOT NULL,
    `ticketTypeId` INTEGER NULL,
    `orderItemId` INTEGER NULL,
    `userId` INTEGER NULL,
    `membershipId` INTEGER NULL,
    `holderName` VARCHAR(160) NOT NULL,
    `holderCpf` CHAR(11) NULL,
    `origin` ENUM('SALE', 'COURTESY', 'MEMBER_CLAIM', 'MANUAL') NOT NULL,
    `status` ENUM('VALID', 'USED', 'CANCELED', 'REFUNDED') NOT NULL DEFAULT 'VALID',
    `courtesyReason` VARCHAR(255) NULL,
    `issuedById` INTEGER NULL,
    `usedAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tickets_code_key`(`code`),
    INDEX `tickets_eventId_status_idx`(`eventId`, `status`),
    INDEX `tickets_ticketTypeId_idx`(`ticketTypeId`),
    INDEX `tickets_orderItemId_idx`(`orderItemId`),
    INDEX `tickets_userId_idx`(`userId`),
    INDEX `tickets_membershipId_idx`(`membershipId`),
    INDEX `tickets_issuedById_idx`(`issuedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_event_entries` (
    `eventId` INTEGER NOT NULL,
    `membershipId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `member_event_entries_membershipId_idx`(`membershipId`),
    PRIMARY KEY (`eventId`, `membershipId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `check_ins` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `ticketId` INTEGER NULL,
    `membershipId` INTEGER NULL,
    `operatorId` INTEGER NOT NULL,
    `result` ENUM('OK', 'ALREADY_USED', 'INVALID', 'WRONG_EVENT', 'CANCELED', 'MEMBER_INACTIVE', 'NOT_ELIGIBLE', 'EXPIRED_CODE', 'CAPACITY_FULL') NOT NULL,
    `rawCode` VARCHAR(160) NULL,
    `deviceId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `check_ins_eventId_createdAt_idx`(`eventId`, `createdAt`),
    INDEX `check_ins_ticketId_idx`(`ticketId`),
    INDEX `check_ins_membershipId_idx`(`membershipId`),
    INDEX `check_ins_operatorId_idx`(`operatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(60) NULL,
    `imageKeys` JSON NULL,
    `basePriceCents` INTEGER NOT NULL,
    `fulfillment` ENUM('STOCK', 'ON_DEMAND') NOT NULL DEFAULT 'STOCK',
    `waitlistEnabled` BOOLEAN NOT NULL DEFAULT false,
    `waitlistPayment` ENUM('UPFRONT', 'ON_RELEASE') NOT NULL DEFAULT 'UPFRONT',
    `allowMemberDiscount` BOOLEAN NOT NULL DEFAULT true,
    `maxPerOrder` INTEGER NOT NULL DEFAULT 10,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `products_slug_key`(`slug`),
    INDEX `products_active_sortOrder_idx`(`active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `sku` VARCHAR(60) NULL,
    `name` VARCHAR(80) NOT NULL,
    `priceCents` INTEGER NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `reserved` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_variants_sku_key`(`sku`),
    INDEX `product_variants_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `variantId` INTEGER NOT NULL,
    `delta` INTEGER NOT NULL,
    `reason` VARCHAR(24) NOT NULL,
    `note` VARCHAR(255) NULL,
    `userId` INTEGER NULL,
    `orderId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_variantId_idx`(`variantId`),
    INDEX `stock_movements_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `minQuantity` INTEGER NULL,
    `closesAt` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'CLOSED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELED') NOT NULL DEFAULT 'OPEN',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `production_batches_productId_status_idx`(`productId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `waitlist_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `variantId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('WAITING', 'NOTIFIED', 'CONVERTED', 'EXPIRED', 'CANCELED') NOT NULL DEFAULT 'WAITING',
    `batchId` INTEGER NULL,
    `notifiedAt` DATETIME(3) NULL,
    `reservationExpiresAt` DATETIME(3) NULL,
    `reservedQty` INTEGER NOT NULL DEFAULT 0,
    `orderId` INTEGER NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `waitlist_entries_variantId_status_createdAt_idx`(`variantId`, `status`, `createdAt`),
    INDEX `waitlist_entries_productId_idx`(`productId`),
    INDEX `waitlist_entries_userId_idx`(`userId`),
    INDEX `waitlist_entries_batchId_idx`(`batchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(12) NOT NULL,
    `userId` INTEGER NULL,
    `channel` ENUM('WEB', 'APP', 'POS') NOT NULL DEFAULT 'WEB',
    `status` ENUM('PENDING_PAYMENT', 'PAID', 'CANCELED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `subtotalCents` INTEGER NOT NULL,
    `discountCents` INTEGER NOT NULL DEFAULT 0,
    `totalCents` INTEGER NOT NULL,
    `customerName` VARCHAR(160) NOT NULL,
    `customerEmail` VARCHAR(160) NULL,
    `customerCpf` CHAR(11) NULL,
    `customerPhone` VARCHAR(20) NULL,
    `expiresAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `refundedCents` INTEGER NOT NULL DEFAULT 0,
    `notes` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_code_key`(`code`),
    INDEX `orders_userId_idx`(`userId`),
    INDEX `orders_createdById_idx`(`createdById`),
    INDEX `orders_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `kind` ENUM('TICKET', 'PRODUCT', 'MEMBERSHIP', 'PREORDER') NOT NULL,
    `eventId` INTEGER NULL,
    `ticketTypeId` INTEGER NULL,
    `productId` INTEGER NULL,
    `variantId` INTEGER NULL,
    `batchId` INTEGER NULL,
    `waitlistEntryId` INTEGER NULL,
    `membershipChargeId` INTEGER NULL,
    `quantity` INTEGER NOT NULL,
    `unitPriceCents` INTEGER NOT NULL,
    `discountCents` INTEGER NOT NULL DEFAULT 0,
    `totalCents` INTEGER NOT NULL,
    `ref_name` VARCHAR(200) NOT NULL,
    `holderNames` JSON NULL,
    `deliveryStatus` ENUM('NOT_APPLICABLE', 'PENDING', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELED') NOT NULL DEFAULT 'NOT_APPLICABLE',
    `deliveredAt` DATETIME(3) NULL,
    `deliveredById` INTEGER NULL,

    INDEX `order_items_orderId_idx`(`orderId`),
    INDEX `order_items_eventId_idx`(`eventId`),
    INDEX `order_items_ticketTypeId_idx`(`ticketTypeId`),
    INDEX `order_items_productId_idx`(`productId`),
    INDEX `order_items_variantId_idx`(`variantId`),
    INDEX `order_items_batchId_idx`(`batchId`),
    INDEX `order_items_waitlistEntryId_idx`(`waitlistEntryId`),
    INDEX `order_items_membershipChargeId_idx`(`membershipChargeId`),
    INDEX `order_items_deliveryStatus_idx`(`deliveryStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `gateway` VARCHAR(32) NOT NULL,
    `method` ENUM('PIX', 'CARD', 'BOLETO', 'CHECKOUT', 'CASH', 'MANUAL', 'COURTESY') NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CHARGEBACK') NOT NULL DEFAULT 'PENDING',
    `externalId` VARCHAR(128) NULL,
    `idempotencyKey` VARCHAR(64) NOT NULL,
    `checkoutUrl` TEXT NULL,
    `pixCopiaECola` TEXT NULL,
    `pixQrBase64` MEDIUMTEXT NULL,
    `boletoUrl` TEXT NULL,
    `expiresAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `refundedCents` INTEGER NOT NULL DEFAULT 0,
    `registeredById` INTEGER NULL,
    `note` VARCHAR(500) NULL,
    `rawLast` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_idempotencyKey_key`(`idempotencyKey`),
    INDEX `payments_orderId_idx`(`orderId`),
    INDEX `payments_registeredById_idx`(`registeredById`),
    INDEX `payments_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `payments_gateway_externalId_key`(`gateway`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_webhook_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `gateway` VARCHAR(32) NOT NULL,
    `eventId` VARCHAR(160) NOT NULL,
    `externalId` VARCHAR(128) NULL,
    `payload` JSON NOT NULL,
    `processedAt` DATETIME(3) NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_webhook_events_processedAt_idx`(`processedAt`),
    UNIQUE INDEX `payment_webhook_events_gateway_eventId_key`(`gateway`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentId` INTEGER NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `reason` VARCHAR(255) NULL,
    `externalRefundId` VARCHAR(128) NULL,
    `status` VARCHAR(16) NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refunds_paymentId_idx`(`paymentId`),
    INDEX `refunds_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gateway_configs` (
    `gateway` VARCHAR(32) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `sandbox` BOOLEAN NOT NULL DEFAULT true,
    `credentialsEnc` BLOB NULL,
    `methods` JSON NULL,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `updatedById` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`gateway`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `imageKeys` JSON NULL,
    `visibility` ENUM('PUBLIC', 'MEMBERS', 'MIN_TIER') NOT NULL DEFAULT 'PUBLIC',
    `minTierLevel` INTEGER NULL,
    `pinned` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `authorId` INTEGER NOT NULL,
    `eventId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `posts_authorId_idx`(`authorId`),
    INDEX `posts_eventId_idx`(`eventId`),
    INDEX `posts_publishedAt_idx`(`publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `nickname` VARCHAR(60) NULL,
    `number` INTEGER NULL,
    `position` ENUM('GK', 'DF', 'MF', 'FW', 'STAFF') NOT NULL DEFAULT 'MF',
    `photoKey` VARCHAR(255) NULL,
    `birthDate` DATE NULL,
    `bio` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lineups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `formation` VARCHAR(16) NULL,
    `notes` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lineups_eventId_key`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lineup_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lineupId` INTEGER NOT NULL,
    `playerId` INTEGER NOT NULL,
    `starter` BOOLEAN NOT NULL DEFAULT true,
    `slot` VARCHAR(16) NULL,
    `isCaptain` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `lineup_entries_playerId_idx`(`playerId`),
    UNIQUE INDEX `lineup_entries_lineupId_playerId_key`(`lineupId`, `playerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temp_hashes` ADD CONSTRAINT `temp_hashes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recovery_codes` ADD CONSTRAINT `recovery_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permission_overrides` ADD CONSTRAINT `user_permission_overrides_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_staff` ADD CONSTRAINT `event_staff_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_staff` ADD CONSTRAINT `event_staff_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `membership_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_charges` ADD CONSTRAINT `membership_charges_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `memberships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_charges` ADD CONSTRAINT `membership_charges_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `membership_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_eligible_plans` ADD CONSTRAINT `event_eligible_plans_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_eligible_plans` ADD CONSTRAINT `event_eligible_plans_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `membership_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_types` ADD CONSTRAINT `ticket_types_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `ticket_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_event_entries` ADD CONSTRAINT `member_event_entries_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_event_entries` ADD CONSTRAINT `member_event_entries_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `memberships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `memberships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `production_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `ticket_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `production_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_waitlistEntryId_fkey` FOREIGN KEY (`waitlistEntryId`) REFERENCES `waitlist_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_membershipChargeId_fkey` FOREIGN KEY (`membershipChargeId`) REFERENCES `membership_charges`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_registeredById_fkey` FOREIGN KEY (`registeredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lineups` ADD CONSTRAINT `lineups_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lineup_entries` ADD CONSTRAINT `lineup_entries_lineupId_fkey` FOREIGN KEY (`lineupId`) REFERENCES `lineups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lineup_entries` ADD CONSTRAINT `lineup_entries_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `players`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
