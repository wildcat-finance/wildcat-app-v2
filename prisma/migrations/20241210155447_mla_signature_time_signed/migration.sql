/*
  Warnings:

  - Added the required column `timeSigned` to the `MlaSignature` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MlaSignature" ADD COLUMN     "timeSigned" TIMESTAMP(3) NOT NULL;
