import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class RfidService {
  processScan(data: { uid: string; source?: string }) {
    const { uid, source } = data;

    if (!uid) {
      throw new BadRequestException('UID es requerido');
    }

    console.log('RFID SCAN:', {
      uid,
      source: source ?? 'esp32',
      at: new Date().toISOString(),
    });
    return {
      ok: true,
      uid,
      source: source ?? 'esp32',
    };
  }
}