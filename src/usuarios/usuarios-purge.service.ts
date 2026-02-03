import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { UsuariosService } from './usuarios.service';

@Injectable()
export class UsuariosPurgeService {
  private readonly logger = new Logger(UsuariosPurgeService.name);

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly config: ConfigService,
  ) {}

  private isEnabled() {
    const raw = this.config.get<string>('USERS_PURGE_ENABLED');
    if (raw === undefined) return true;
    return /^(1|true|yes|y)$/i.test(raw.trim());
  }

  private purgeDays() {
    const raw = this.config.get<string>('USERS_PURGE_DAYS');
    const parsed = raw ? Number.parseInt(raw, 10) : 30;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }

  private cronExpr() {
    return this.config.get<string>('USERS_PURGE_CRON') ?? '0 15 3 * * *';
  }

  @Cron(process.env.USERS_PURGE_CRON ?? '0 15 3 * * *')
  async handleCron() {
    if (this.config.get<string>('NODE_ENV') === 'test') return;
    if (!this.isEnabled()) return;

    const days = this.purgeDays();
    try {
      const result = await this.usuarios.purgeInactive(days);
      this.logger.log(
        `Purge inactivos: days=${result.days} total=${result.total} deleted=${result.deleted} skipped_fk=${result.skipped_fk} failed=${result.failed}`,
      );
    } catch (err: any) {
      this.logger.error(`Purge inactivos falló: ${err?.message ?? err}`);
    }
  }
}
