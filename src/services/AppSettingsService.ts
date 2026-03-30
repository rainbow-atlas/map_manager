import { supabase } from '../lib/supabase';

const IMPRESSUM_KEY = 'impressum';

interface AppSettingRow {
    key: string;
    value: string;
}

export class AppSettingsService {
    static async getImpressum(): Promise<string> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('key, value')
            .eq('key', IMPRESSUM_KEY)
            .maybeSingle<AppSettingRow>();

        if (error) {
            throw new Error(`Failed to load impressum: ${error.message}`);
        }

        return data?.value ?? '';
    }

    static async saveImpressum(value: string): Promise<void> {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: IMPRESSUM_KEY, value }, { onConflict: 'key' });

        if (error) {
            throw new Error(`Failed to save impressum: ${error.message}`);
        }
    }
}
