import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationConsumer } from './notification.consumer';
import { NotificationResolver } from './notification.resolver';
import { Notification, NotificationSchema } from './notification.schema';
import { NotificationService } from './notification.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }])],
  providers: [NotificationService, NotificationResolver, NotificationConsumer],
  exports: [NotificationService],
})
export class NotificationModule {}
