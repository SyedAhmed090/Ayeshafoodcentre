-- AlterTable
ALTER TABLE `MenuItem` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false;
