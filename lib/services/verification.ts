import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface QualificationDocument {
  id: string;
  expert_profile_id: string;
  document_type: string;
  file_path: string;
  file_name: string;
  /** Linked profession (Decision 08.05.) */
  profession?: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface ExpertVerification {
  expert_profile_id: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_notes?: string;
  verified_by?: string;
}

export const verificationService = {
  async getPendingExperts() {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select(`
        id,
        user_id,
        profession,
        highest_degree,
        verification_status,
        created_at,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getAllExperts(status?: string) {
    let query = supabase
      .from('expert_profiles')
      .select(`
        id,
        user_id,
        profession,
        highest_degree,
        verification_status,
        verification_notes,
        verified_at,
        created_at,
        profiles:user_id (
          full_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('verification_status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getExpertDocuments(expertProfileId: string) {
    const { data, error } = await supabase
      .from('qualification_documents')
      .select('*')
      .eq('expert_profile_id', expertProfileId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as QualificationDocument[];
  },

  async verifyExpert(
    expertProfileId: string,
    adminUserId: string,
    notes?: string
  ) {
    const { data, error } = await supabase
      .from('expert_profiles')
      .update({
        verification_status: 'verified',
        verification_notes: notes,
        verified_at: new Date().toISOString(),
        verified_by: adminUserId,
      })
      .eq('id', expertProfileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async rejectExpert(
    expertProfileId: string,
    adminUserId: string,
    notes: string
  ) {
    const { data, error } = await supabase
      .from('expert_profiles')
      .update({
        verification_status: 'rejected',
        verification_notes: notes,
        verified_by: adminUserId,
      })
      .eq('id', expertProfileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadDocument(
    expertProfileId: string,
    file: File,
    documentType: string,
    profession?: string
  ) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${expertProfileId}_${Date.now()}.${fileExt}`;
    const filePath = `${expertProfileId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('qualification-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('qualification_documents')
      .insert({
        expert_profile_id: expertProfileId,
        document_type: documentType,
        file_path: filePath,
        file_name: file.name,
        profession: profession?.trim() || '',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDocumentUrl(filePath: string) {
    const { data } = supabase.storage
      .from('qualification-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async approveDocument(documentId: string, adminUserId: string) {
    const { error } = await supabase
      .from('qualification_documents')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
      })
      .eq('id', documentId);

    if (error) throw error;
  },

  async rejectDocument(documentId: string, adminUserId: string) {
    const { error } = await supabase
      .from('qualification_documents')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
      })
      .eq('id', documentId);

    if (error) throw error;
  },
};
