import { Body, Controller, Post } from '@nestjs/common';
import { RfidService } from './rfid.service';

@Controller('rfid')
export class RfidController {
  constructor(private readonly rfidService: RfidService) {}

  @Post('scan')
  scan(@Body() body: { uid: string; source?: string }) {
    return this.rfidService.processScan(body);
  }
}