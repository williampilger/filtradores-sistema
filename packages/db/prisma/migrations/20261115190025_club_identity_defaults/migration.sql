-- AlterTable
ALTER TABLE `club_settings` MODIFY `name` VARCHAR(120) NOT NULL DEFAULT 'ACE Filtradores',
    MODIFY `shortName` VARCHAR(40) NOT NULL DEFAULT 'ACEF',
    MODIFY `primaryColor` VARCHAR(9) NOT NULL DEFAULT '#1b3fd1',
    MODIFY `secondaryColor` VARCHAR(9) NOT NULL DEFAULT '#d62631';
