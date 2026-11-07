IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserId int IDENTITY PRIMARY KEY,
        TeacherId int NULL REFERENCES dbo.Teachers (TeacherId),
        Username nvarchar(100) NOT NULL UNIQUE,
        PasswordHash nvarchar(255) NOT NULL,
        Role nvarchar(30) NOT NULL CHECK (Role IN ('Admin', 'Teacher')),
        IsActive bit NOT NULL DEFAULT 1,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        Email nvarchar(255) NULL,
        LastLoginAt datetime2 NULL,
        UpdatedAt datetime2 NULL,
        AuthVersion int NOT NULL DEFAULT 0
    );
END;
GO
IF COL_LENGTH(N'dbo.Users', N'AuthVersion') IS NULL
    ALTER TABLE dbo.Users ADD AuthVersion int NOT NULL DEFAULT 0;
IF COL_LENGTH(N'dbo.Users', N'LastLoginAt') IS NULL
    ALTER TABLE dbo.Users ADD LastLoginAt datetime2 NULL;
IF COL_LENGTH(N'dbo.Users', N'UpdatedAt') IS NULL
    ALTER TABLE dbo.Users ADD UpdatedAt datetime2 NULL;
GO
IF OBJECT_ID(N'dbo.PasswordResetTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PasswordResetTokens (
        PasswordResetTokenId int IDENTITY PRIMARY KEY,
        UserId int NOT NULL REFERENCES dbo.Users (UserId),
        TokenHash nvarchar(255) NOT NULL,
        ExpiresAt datetime2 NOT NULL,
        UsedAt datetime2 NULL,
        AttemptCount int NOT NULL DEFAULT 0,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO
IF OBJECT_ID(N'dbo.UserSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserSessions (
        TokenHash binary(32) NOT NULL PRIMARY KEY,
        UserId int NOT NULL REFERENCES dbo.Users (UserId) ON DELETE CASCADE,
        AuthVersion int NOT NULL,
        ExpiresAt datetime2 NOT NULL
    );
    CREATE INDEX IX_UserSessions_UserId_ExpiresAt ON dbo.UserSessions (UserId, ExpiresAt);
END;
GO
