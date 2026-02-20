/**
 * User Entity
 * -----------
 * Represents the data shape stored in Firestore.
 * This is NOT a database model — it is a plain domain object
 * used to enforce type safety across the app.
 */
export class UserEntity {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}
