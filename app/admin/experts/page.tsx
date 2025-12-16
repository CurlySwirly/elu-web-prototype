'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { verificationService } from '@/lib/services/verification';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Mail, Phone, FileText, AlertCircle, User, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ExpertProfile {
  id: string;
  user_id: string;
  profession: string;
  highest_degree: string;
  verification_status: string;
  verification_notes?: string;
  verified_at?: string;
  created_at: string;
  profiles: any;
}

export default function AdminExpertsPage() {
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [filteredExperts, setFilteredExperts] = useState<ExpertProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'verify' | 'reject'>('verify');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadExperts();
  }, []);

  useEffect(() => {
    const status = searchParams?.get('status');
    if (status) {
      setActiveTab(status);
    }
  }, [searchParams]);

  const loadExperts = async () => {
    try {
      const data = await verificationService.getAllExperts();
      setExperts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterExperts = useCallback(() => {
    if (activeTab === 'all') {
      setFilteredExperts(experts);
    } else {
      setFilteredExperts(experts.filter(e => e.verification_status === activeTab));
    }
  }, [experts, activeTab]);

  useEffect(() => {
    filterExperts();
  }, [filterExperts]);

  const loadDocuments = async (expertId: string) => {
    try {
      const docs = await verificationService.getExpertDocuments(expertId);
      setDocuments(docs);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      setDocuments([]);
    }
  };

  const handleExpertClick = async (expert: ExpertProfile) => {
    setSelectedExpert(expert);
    await loadDocuments(expert.id);
    setIsDialogOpen(true);
  };

  const handleAction = (type: 'verify' | 'reject') => {
    setActionType(type);
    setNotes('');
  };

  const handleConfirmAction = async () => {
    if (!selectedExpert || !userId) return;

    setProcessing(true);
    setError('');

    try {
      if (actionType === 'verify') {
        await verificationService.verifyExpert(selectedExpert.id, userId, notes);
        setSuccess('Expert:in erfolgreich verifiziert');
      } else {
        if (!notes.trim()) {
          setError('Bitte gib einen Ablehnungsgrund an');
          setProcessing(false);
          return;
        }
        await verificationService.rejectExpert(selectedExpert.id, userId, notes);
        setSuccess('Expert:in abgelehnt');
      }

      setIsDialogOpen(false);
      setSelectedExpert(null);
      setNotes('');
      await loadExperts();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-success-bg text-success-text';
      case 'rejected':
        return 'bg-error-bg text-error-text';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verifiziert';
      case 'rejected':
        return 'Abgelehnt';
      case 'pending':
        return 'Ausstehend';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-heading font-bold text-text-dark mb-2">
          Expert:innen-Verifizierung
        </h2>
        <p className="text-gray-600 font-body">
          Prüfe und verifiziere Expert:innen-Profile
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-error-text bg-error-bg">
          <AlertCircle className="h-4 w-4 text-error-text" />
          <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-success-text bg-success-bg">
          <AlertDescription className="text-success-text font-body">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="font-body">
            Ausstehend ({experts.filter(e => e.verification_status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="verified" className="font-body">
            Verifiziert ({experts.filter(e => e.verification_status === 'verified').length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="font-body">
            Abgelehnt ({experts.filter(e => e.verification_status === 'rejected').length})
          </TabsTrigger>
          <TabsTrigger value="all" className="font-body">
            Alle ({experts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {filteredExperts.length === 0 ? (
            <Card className="border-2">
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-body">Keine Expert:innen in dieser Kategorie</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredExperts.map((expert) => (
                <Card key={expert.id} className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-lg text-text-dark">
                              {expert.profiles?.full_name || 'Unbekannt'}
                            </h3>
                            <p className="text-sm text-gray-600 font-body">{expert.profession}</p>
                          </div>
                          <Badge className={`${getStatusColor(expert.verification_status)} border-none ml-2`}>
                            {getStatusLabel(expert.verification_status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 font-body">
                            <Mail className="w-4 h-4" />
                            {expert.profiles?.email}
                          </div>
                          {expert.profiles?.phone && (
                            <div className="flex items-center gap-2 text-gray-600 font-body">
                              <Phone className="w-4 h-4" />
                              {expert.profiles.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600 font-body">
                            <FileText className="w-4 h-4" />
                            {expert.highest_degree}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 font-body">
                            <Clock className="w-4 h-4" />
                            Registriert: {format(new Date(expert.created_at), 'dd.MM.yyyy', { locale: de })}
                          </div>
                        </div>

                        {expert.verification_notes && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-body text-gray-700">
                              <strong>Notiz:</strong> {expert.verification_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleExpertClick(expert)}
                        variant="outline"
                        size="sm"
                        className="ml-4 font-body"
                      >
                        Details
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-text-dark">
              Expert:in prüfen
            </DialogTitle>
            <DialogDescription className="font-body">
              {selectedExpert?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-heading font-semibold text-text-dark mb-2">Profil-Informationen</h4>
              <div className="space-y-2 text-sm font-body">
                <div><strong>Beruf:</strong> {selectedExpert?.profession}</div>
                <div><strong>Höchster Abschluss:</strong> {selectedExpert?.highest_degree}</div>
                <div><strong>E-Mail:</strong> {selectedExpert?.profiles?.email}</div>
                {selectedExpert?.profiles?.phone && (
                  <div><strong>Telefon:</strong> {selectedExpert.profiles.phone}</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-text-dark mb-2">
                Hochgeladene Dokumente ({documents.length})
              </h4>
              {documents.length === 0 ? (
                <p className="text-sm text-gray-600 font-body">Keine Dokumente hochgeladen</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-body font-semibold">{doc.document_type}</p>
                        <p className="text-xs text-gray-600 font-body">{doc.file_name}</p>
                      </div>
                      <Badge className={`${getStatusColor(doc.status)} border-none text-xs`}>
                        {getStatusLabel(doc.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {actionType === 'reject' && (
              <div>
                <Label className="font-body">Ablehnungsgrund *</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bitte gib an, warum die Verifizierung abgelehnt wird..."
                  rows={4}
                  className="mt-2 font-body"
                />
              </div>
            )}

            {actionType === 'verify' && (
              <div>
                <Label className="font-body">Notiz (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optionale Anmerkungen..."
                  rows={3}
                  className="mt-2 font-body"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {selectedExpert?.verification_status === 'pending' && (
              <>
                {actionType === 'verify' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleAction('reject')}
                      className="font-body"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Ablehnen
                    </Button>
                    <Button
                      onClick={handleConfirmAction}
                      disabled={processing}
                      className="bg-success-text hover:bg-success-text/90 text-white font-body"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {processing ? 'Wird verifiziert...' : 'Verifizieren'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleAction('verify')}
                      className="font-body"
                    >
                      Zurück
                    </Button>
                    <Button
                      onClick={handleConfirmAction}
                      disabled={processing || !notes.trim()}
                      variant="destructive"
                      className="font-body"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {processing ? 'Wird abgelehnt...' : 'Ablehnen bestätigen'}
                    </Button>
                  </>
                )}
              </>
            )}
            {selectedExpert?.verification_status !== 'pending' && (
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-body">
                Schließen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
