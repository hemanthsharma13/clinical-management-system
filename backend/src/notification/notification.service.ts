import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppointmentBookedEvent, confirmationMessage } from '../contracts/appointment-booked.event';
import { isDuplicateKeyError } from '../common/duplicate-key';
import { clampPage, FieldValidationError } from '../common/validation';
import { Notification } from './notification.schema';
import { NotificationConnection, NotificationType } from './notification.types';

@Injectable()
export class NotificationService {
  constructor(@InjectModel(Notification.name) private readonly notifications: Model<Notification>) {}

  async recordFromEvent(event: AppointmentBookedEvent): Promise<'created' | 'duplicate'> {
    try {
      await this.notifications.create({
        eventId: event.eventId,
        appointmentId: event.payload.appointmentId,
        patientId: event.payload.patientId,
        patientName: event.payload.patientName,
        doctorId: event.payload.doctorId,
        doctorName: event.payload.doctorName,
        message: confirmationMessage(event.payload.patientId, event.payload.doctorId),
        type: 'APPOINTMENT_CONFIRMATION',
        status: 'RECORDED',
        eventVersion: event.eventVersion,
      });
      return 'created';
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return 'duplicate';
      }
      throw error;
    }
  }

  async list(
    pageInput: number | undefined,
    pageSizeInput: number | undefined,
    appointmentId?: string,
  ): Promise<NotificationConnection> {
    let paging: { page: number; pageSize: number };
    try {
      paging = clampPage(pageInput, pageSizeInput);
    } catch (error) {
      if (error instanceof FieldValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    const filter = appointmentId ? { appointmentId } : {};
    const [items, total] = await Promise.all([
      this.notifications
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((paging.page - 1) * paging.pageSize)
        .limit(paging.pageSize)
        .lean(),
      this.notifications.countDocuments(filter),
    ]);
    return {
      items: items.map((item) => ({
        eventId: item.eventId,
        appointmentId: item.appointmentId,
        patientId: item.patientId,
        patientName: item.patientName,
        doctorId: item.doctorId,
        doctorName: item.doctorName,
        message: item.message,
        type: item.type,
        status: item.status,
        eventVersion: item.eventVersion,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(0),
      })),
      total,
      page: paging.page,
      pageSize: paging.pageSize,
    };
  }
}
