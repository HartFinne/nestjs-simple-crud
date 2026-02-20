import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UserEntity, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedResponse, PaginateUsersDto } from './dto/paginate-users.dto';
import * as admin from 'firebase-admin';
import { BaseRepository } from 'src/common/repositories/base.repository';

const COLLECTION = 'users';

@Injectable()
export class UsersRepository extends BaseRepository {
  protected readonly logger = new Logger(UsersRepository.name);

  constructor(private readonly firebase: FirebaseService) {
    super();
  }

  private get col(): admin.firestore.CollectionReference {
    return this.firebase.collection(COLLECTION);
  }

  // ─── Mapper ───────────────────────────────────────────────────────────────

  private toEntity(id: string, data: admin.firestore.DocumentData): UserEntity {
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
    return this.run('Failed to create user', async () => {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const docRef = this.col.doc();

      await docRef.set({
        name: dto.name,
        email: dto.email,
        role: dto.role ?? UserRole.USER,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const snap = await docRef.get();
      return this.toEntity(snap.id, snap.data()!);
    });
  }

  async findAll(query: PaginateUsersDto): Promise<PaginatedResponse<UserEntity>> {
    return this.run('Failed to fetch users', async () => {
      const limit = query.limit ?? 10;

      let ref: admin.firestore.Query = this.col.orderBy('createdAt', 'desc');

      if (query.role) {
        ref = ref.where('role', '==', query.role);
      }

      if (query.cursor) {
        const cursorDoc = await this.col.doc(query.cursor).get();
        if (!cursorDoc.exists) {
          throw new BadRequestException(
            `Invalid cursor — document "${query.cursor}" does not exist`,
          );
        }
        ref = ref.startAfter(cursorDoc);
      }

      const snapshot = await ref.limit(limit + 1).get();
      const docs = snapshot.docs;

      const hasNextPage = docs.length > limit;
      const pageDocs = hasNextPage ? docs.slice(0, limit) : docs;
      const nextCursor = hasNextPage ? pageDocs[pageDocs.length - 1].id : null;

      return {
        data: pageDocs.map((doc) => this.toEntity(doc.id, doc.data())),
        meta: { limit, hasNextPage, nextCursor },
      };
    });
  }

  async findById(id: string): Promise<UserEntity> {
    return this.run(`Failed to fetch user ${id}`, async () => {
      const snap = await this.col.doc(id).get();
      if (!snap.exists) throw new NotFoundException(`User with id "${id}" not found`);
      return this.toEntity(snap.id, snap.data()!);
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.run(`Failed to fetch user by email ${email}`, async () => {
      const snap = await this.col.where('email', '==', email).limit(1).get();
      if (snap.empty) return null;
      return this.toEntity(snap.docs[0].id, snap.docs[0].data());
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    return this.run(`Failed to update user ${id}`, async () => {
      const docRef = this.col.doc(id);
      const snap = await docRef.get();
      if (!snap.exists) throw new NotFoundException(`User with id "${id}" not found`);

      await docRef.update({
        ...dto,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updated = await docRef.get();
      return this.toEntity(updated.id, updated.data()!);
    });
  }

  async remove(id: string): Promise<void> {
    return this.run(`Failed to delete user ${id}`, async () => {
      const docRef = this.col.doc(id);
      const snap = await docRef.get();
      if (!snap.exists) throw new NotFoundException(`User with id "${id}" not found`);
      await docRef.delete();
    });
  }
}