import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

/**
 * @Global — FirebaseService is injected across the entire app
 * without needing to re-import FirebaseModule in every feature module.
 */
@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
