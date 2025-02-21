/*
  Warnings:

  - Added the required column `kind` to the `RefusalToAssignMla` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefusalToAssignMla" ADD COLUMN     "kind" "SignatureKind" NOT NULL;
