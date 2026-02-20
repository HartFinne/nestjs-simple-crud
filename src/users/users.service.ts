import { ConflictException, Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginateUsersDto } from './dto/paginate-users.dto';
import { UserEntity } from './entities/user.entity';

/**
 * UsersService
 * ------------
 * Single Responsibility: business rules for user management.
 * Does NOT know about HTTP or Firestore — delegates persistence to repository.
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    // Business rule: emails must be unique
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already in use`);
    }
    return this.usersRepository.create(dto);
  }

  async findAll(query: PaginateUsersDto): Promise<UserEntity[]> {
    return this.usersRepository.findAll(query);
  }

  async findOne(id: string): Promise<UserEntity> {
    return this.usersRepository.findById(id);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    // Ensure user exists before attempting update
    await this.usersRepository.findById(id);

    // Business rule: if changing email, ensure it is not taken
    if (dto.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Email "${dto.email}" is already in use`);
      }
    }

    return this.usersRepository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    return this.usersRepository.remove(id);
  }
}
