-- AlterTable
ALTER TABLE `Order` ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `clientKey` CHAR(36) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_clientKey_key` ON `Order`(`clientKey`);

-- Existing orders keep the name their customer has now.
UPDATE `Order` o JOIN `Customer` c ON c.id = o.customerId SET o.customerName = c.name;
