-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `blocked` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `openMinute` INTEGER NULL,
    ADD COLUMN `closeMinute` INTEGER NULL,
    ADD COLUMN `minOrder` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `deliveryArea` VARCHAR(191) NULL,
    ADD COLUMN `staffLang` VARCHAR(2) NOT NULL DEFAULT 'en';
