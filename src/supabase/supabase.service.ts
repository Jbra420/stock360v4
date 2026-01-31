import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private adminClient: SupabaseClient;
  private anonClient: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL')!;
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY')!;

    this.adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    this.anonClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }

  admin(): SupabaseClient {
    return this.adminClient;
  }

  anon(): SupabaseClient {
    return this.anonClient;
  }
}