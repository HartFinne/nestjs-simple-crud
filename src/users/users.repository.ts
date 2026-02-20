import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UserEntity, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginateUsersDto } from './dto/paginate-users.dto';
import * as admin from 'firebase-admin';

const COLLECTION = 'users';

/**
 * UsersRepository
 * ---------------
 * Single Responsibility: all Firestore I/O for the users collection.
 * The service layer never touches Firestore directly.
 */
@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(private readonly firebase: FirebaseService) {}

  private get col(): admin.firestore.CollectionReference {
    return this.firebase.collection(COLLECTION);
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private toEntity(
    id: string,
    data: admin.firestore.DocumentData,
  ): UserEntity {
    return new UserEntity({
      id,
      name: data['name'],
      email: data['email'],
      role: data['role'] as UserRole,
      isActive: data['isActive'] ?? true,
      createdAt: (data['createdAt'] as admin.firestore.Timestamp)?.toDate(),
      updatedAt: (data['updatedAt'] as admin.firestore.Timestamp)?.toDate(),
    });
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<UserEntity> {
    try {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const docRef = this.col.doc(); // auto-generate ID

      const payload = {
        name: dto.name,
        email: dto.email,
        role: dto.role ?? UserRole.USER,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(payload);

      const snap = await docRef.get();
      return this.toEntity(snap.id, snap.data()!);
    } catch (err) {
      this.logger.error('Failed to create user', err);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(query: PaginateUsersDto): Promise<UserEntity[]> {
    try {
      let ref: admin.firestore.Query = this.col.orderBy('createdAt', 'desc');

      if (query.role) {
        ref = ref.where('role', '==', query.role);
      }

      if (query.cursor) {
        const cursorDoc = await this.col.doc(query.cursor).get();
        if (cursorDoc.exists) {
          ref = ref.startAfter(cursorDoc);
        }
      }

      ref = ref.limit(query.limit ?? 10);

      const snapshot = await ref.get();
      return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
    } catch (err) {
      this.logger.error('Failed to fetch users', err);
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findById(id: string): Promise<UserEntity> {
    try {
      const snap = await this.col.doc(id).get();
      if (!snap.exists) {
        throw new NotFoundException(`User with id "${id}" not found`);
      }
      return this.toEntity(snap.id, snap.data()!);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to fetch user ${id}`, err);
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const snap = await this.col.where('email', '==', email).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return this.toEntity(doc.id, doc.data());
    } catch (err) {
      this.logger.error(`Failed to fetch user by email ${email}`, err);
      throw new InternalServerErrorException('Failed to query user by email');
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    try {
      const docRef = this.col.doc(id);
      const snap = await docRef.get();
      if (!snap.exists) {
        throw new NotFoundException(`User with id "${id}" not found`);
      }

      await docRef.update({
        ...dto,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updated = await docRef.get();
      return this.toEntity(updated.id, updated.data()!);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to update user ${id}`, err);
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const docRef = this.col.doc(id);
      const snap = await docRef.get();
      if (!snap.exists) {
        throw new NotFoundException(`User with id "${id}" not found`);
      }
      await docRef.delete();
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to delete user ${id}`, err);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
