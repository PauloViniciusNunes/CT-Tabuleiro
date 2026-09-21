-- Alter Token mechanics from a nullable scalar to a non-nullable list.
ALTER TABLE "Token"
ALTER COLUMN "tokenPrimaryElement" TYPE TEXT[]
USING CASE
    WHEN "tokenPrimaryElement" IS NULL OR "tokenPrimaryElement" = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY["tokenPrimaryElement"]
END;

ALTER TABLE "Token"
ALTER COLUMN "tokenPrimaryElement" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "tokenPrimaryElement" SET NOT NULL;

ALTER TABLE "Token"
ALTER COLUMN "tokenPrimaryDisvantage" TYPE TEXT[]
USING CASE
    WHEN "tokenPrimaryDisvantage" IS NULL OR "tokenPrimaryDisvantage" = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY["tokenPrimaryDisvantage"]
END;

ALTER TABLE "Token"
ALTER COLUMN "tokenPrimaryDisvantage" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "tokenPrimaryDisvantage" SET NOT NULL;

-- Apply the same conversion to instances already placed on maps.
ALTER TABLE "TokenInstance"
ALTER COLUMN "tokenPrimaryElement" TYPE TEXT[]
USING CASE
    WHEN "tokenPrimaryElement" IS NULL OR "tokenPrimaryElement" = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY["tokenPrimaryElement"]
END;

ALTER TABLE "TokenInstance"
ALTER COLUMN "tokenPrimaryElement" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "tokenPrimaryElement" SET NOT NULL;

ALTER TABLE "TokenInstance"
ALTER COLUMN "tokenPrimaryDisvantage" TYPE TEXT[]
USING CASE
    WHEN "tokenPrimaryDisvantage" IS NULL OR "tokenPrimaryDisvantage" = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY["tokenPrimaryDisvantage"]
END;

ALTER TABLE "TokenInstance"
ALTER COLUMN "tokenPrimaryDisvantage" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "tokenPrimaryDisvantage" SET NOT NULL;
