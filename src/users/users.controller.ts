import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedResponse, PaginateUsersDto } from './dto/paginate-users.dto';
import { UserEntity } from './entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseFirestoreIdPipe } from '../common/pipes/parse-firestore-id.pipe';
import { UserRole } from './entities/user.entity';

/**
 * UsersController
 * ---------------
 * Single Responsibility: map HTTP requests to service calls.
 * No business logic lives here.
 */
@Controller('users')
@UseGuards(ThrottlerGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/v1/users
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(createUserDto);
  }

  // GET /api/v1/users
  @Get()
  findAll(@Query() query: PaginateUsersDto): Promise<PaginatedResponse<UserEntity>> {
    return this.usersService.findAll(query);
  }

  // GET /api/v1/users/:id
  @Get(':id')
  findOne(@Param('id', ParseFirestoreIdPipe) id: string): Promise<UserEntity> {
    return this.usersService.findOne(id);
  }

  // PATCH /api/v1/users/:id
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param('id', ParseFirestoreIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.update(id, updateUserDto);
  }

  // DELETE /api/v1/users/:id
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseFirestoreIdPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
