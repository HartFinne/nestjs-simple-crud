import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * FirebaseService
 * ---------------
 * Single responsibility: initialize firebase-admin and expose
 * the Firestore instance to the rest of the application.
 *
 * Implements OnApplicationBootstrap so initialization happens
 * after all modules are loaded (safe DI order).
 */
@Injectable()
export class FirebaseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FirebaseService.name);
  private _firestore!: admin.firestore.Firestore;

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap(): void {
    // Prevent double initialization in hot-reload environments
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get<string>('app.firebase.projectId'),
          clientEmail: this.configService.get<string>('app.firebase.clientEmail'),
          privateKey: this.configService.get<string>('app.firebase.privateKey'),
        }),
        databaseURL: this.configService.get<string>('app.firebase.databaseURL'),
      });
      this.logger.log('Firebase Admin initialized');
    }

    this._firestore = admin.firestore();
  }

  get firestore(): admin.firestore.Firestore {
    return this._firestore;
  }

  /**
   * Helper to get a typed collection reference
   */
  collection(path: string): admin.firestore.CollectionReference {
    return this._firestore.collection(path);
  }
}
