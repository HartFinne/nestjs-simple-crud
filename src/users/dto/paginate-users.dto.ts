import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class PaginateUsersDto {
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  cursor?: string; // Firestore pagination cursor (last document ID)

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
