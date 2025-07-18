export interface SecretEntry {
  secret_id: string;
  encrypted_content: string;
  password_hash?: string;
  expires_at?: Date;
  created_at: Date;
  accessed_at?: Date;
  access_count: number;
}

export interface CreateSecretRequest {
  content: string;
  password?: string;
  expiresIn?: number; // minutes
}

export interface ViewSecretRequest {
  password?: string;
} 