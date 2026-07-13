import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 120)
  tenantName!: string;

  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/, {
    message: 'slug must be 3-40 chars of lowercase letters, digits and hyphens',
  })
  slug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  /** onboarding fork (§7.5) */
  @IsOptional()
  @IsIn(['standard', 'lite'])
  mode?: 'standard' | 'lite';
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class CreateApiKeyDto {
  @IsString()
  @Length(1, 80)
  label!: string;
}

export class AcceptInviteDto {
  /** 32 random bytes, base64url (43 chars) — generous bounds for safety */
  @IsString()
  @Length(20, 128)
  token!: string;

  /** same policy as registration (§9.3) */
  @IsString()
  @MinLength(10)
  password!: string;
}
