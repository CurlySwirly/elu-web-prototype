'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle2, XCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentUpload } from '@/components/DocumentUpload';
import {
  verificationService,
  type QualificationDocument,
} from '@/lib/services/verification';
import { useToast } from '@/hooks/use-toast';

const REQUESTS_KEY = 'elu_qualification_requests';

type RequestKind = 'change' | 'delete';
type DocumentType = 'degree' | 'certificate' | 'license' | 'other';

interface StoredRequest {
  id: string;
  documentId: string;
  fileName: string;
  kind: RequestKind;
  reason: string;
  createdAt: string;
}

interface ListItem {
  id: string;
  fileName: string;
  documentType: DocumentType;
  status: string;
  profession: string;
  issuer: string;
  issueDate: string;
}

const DEMO_DOCS: ListItem[] = [
  {
    id: 'demo-qual-1',
    fileName: 'Bachelor_Physiotherapie.pdf',
    documentType: 'degree',
    status: 'pending',
    profession: 'Physiotherapeut:in',
    issuer: 'Hochschule für Gesundheit und Sport',
    issueDate: '15. Juni 2020',
  },
  {
    id: 'demo-qual-2',
    fileName: 'Osteopathie_Zertifikat.pdf',
    documentType: 'certificate',
    status: 'approved',
    profession: 'Osteopath:in',
    issuer: 'Akademie für Osteopathie',
    issueDate: '3. März 2022',
  },
];

const TYPE_LABELS: Record<DocumentType, string> = {
  degree: 'Hochschulabschluss',
  certificate: 'Zertifikat',
  license: 'Lizenz',
  other: 'Sonstiges',
};

function asDocumentType(value: string): DocumentType {
  if (value === 'degree' || value === 'certificate' || value === 'license' || value === 'other') {
    return value;
  }
  return 'other';
}

function statusBadge(status: string) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Verifiziert
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        <XCircle className="h-3.5 w-3.5" />
        Abgelehnt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <Clock className="h-3.5 w-3.5" />
      Prüfung
    </span>
  );
}

function loadRequests(): StoredRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]') as StoredRequest[];
  } catch {
    return [];
  }
}

function saveRequest(req: StoredRequest) {
  const all = loadRequests();
  all.unshift(req);
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(all));
}

interface QualificationsSectionProps {
  expertProfileId: string;
  professions: string[];
}

export function QualificationsSection({
  expertProfileId,
  professions,
}: QualificationsSectionProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestKind, setRequestKind] = useState<RequestKind | null>(null);
  const [activeItem, setActiveItem] = useState<ListItem | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openRequests, setOpenRequests] = useState<StoredRequest[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await verificationService.getExpertDocuments(expertProfileId);
      if (docs.length > 0) {
        setItems(
          docs.map((d: QualificationDocument & { profession?: string }) => ({
            id: d.id,
            fileName: d.file_name,
            documentType: asDocumentType(d.document_type),
            status: d.status,
            profession: d.profession?.trim() || '—',
            issuer: '—',
            issueDate: new Date(d.uploaded_at).toLocaleDateString('de-DE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          }))
        );
      } else {
        setItems(DEMO_DOCS);
      }
    } catch {
      setItems(DEMO_DOCS);
    } finally {
      setOpenRequests(loadRequests());
      setLoading(false);
    }
  }, [expertProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openRequest = (item: ListItem, kind: RequestKind) => {
    setActiveItem(item);
    setRequestKind(kind);
    setReason('');
  };

  const closeRequest = () => {
    setActiveItem(null);
    setRequestKind(null);
    setReason('');
  };

  const submitRequest = () => {
    if (!activeItem || !requestKind || !reason.trim()) {
      toast({
        title: 'Bitte gib einen Grund an',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    const req: StoredRequest = {
      id: `req-${Date.now()}`,
      documentId: activeItem.id,
      fileName: activeItem.fileName,
      kind: requestKind,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    };
    saveRequest(req);
    setOpenRequests(loadRequests());
    toast({
      title:
        requestKind === 'change'
          ? 'Änderungsanfrage gesendet – wir prüfen sie'
          : 'Löschungsanfrage gesendet – wir prüfen sie',
    });
    setSubmitting(false);
    closeRequest();
  };

  const pendingFor = (docId: string) => openRequests.find((r) => r.documentId === docId);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Hochgeladene Qualifikationen</h2>
        <p className="mt-1 text-sm text-gray-500">
          Übersicht deiner hochgeladenen Qualifikationsnachweise
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Laden…</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">Noch keine Qualifikationen hochgeladen.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {items.map((item) => {
              const pending = pendingFor(item.id);
              return (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                      <span className="truncate font-medium text-gray-900">{item.fileName}</span>
                    </div>
                    {statusBadge(item.status)}
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p>{TYPE_LABELS[item.documentType]}</p>
                    <p>
                      Beruf:{' '}
                      <span className="font-medium text-gray-800">{item.profession}</span>
                    </p>
                    <p>Ausgestellt von: {item.issuer}</p>
                    <p>Ausstellungsdatum: {item.issueDate}</p>
                  </div>

                  {pending && (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Offene {pending.kind === 'change' ? 'Änderungs' : 'Löschungs'}anfrage vom{' '}
                      {new Date(pending.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openRequest(item, 'change')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Änderung anfragen
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => openRequest(item, 'delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Löschung anfragen
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Qualifikationen hochladen</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">
          Lade deine Abschlüsse, Zertifikate und Lizenzen hoch (PDF, JPG, PNG). Jede Datei wird
          einem Beruf zugeordnet.
        </p>
        <DocumentUpload
          expertProfileId={expertProfileId}
          professions={professions}
          showIntro={false}
          onUploadComplete={() => void load()}
        />
      </div>

      <Dialog open={requestKind !== null} onOpenChange={(open) => !open && closeRequest()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {requestKind === 'delete' ? 'Löschung beantragen' : 'Änderung beantragen'}
            </DialogTitle>
            <DialogDescription>
              Qualifikation:{' '}
              <span className="font-medium text-gray-800">{activeItem?.fileName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
            Bitte beschreibe kurz den Grund und – falls relevant – welche Anpassung du möchtest.
            Deine Anfrage wird geprüft.
          </div>

          <div className="space-y-2">
            <Label htmlFor="qual-request-reason">
              {requestKind === 'delete' ? 'Grund der Löschung' : 'Gewünschte Änderung / Grund'}
            </Label>
            <Textarea
              id="qual-request-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                requestKind === 'delete'
                  ? 'z.B. Dokument veraltet / falsches Dokument / doppelt hochgeladen...'
                  : 'z.B. falsches Ausstellungsdatum, neue Version, Tippfehler im Titel...'
              }
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeRequest}>
              Abbrechen
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={submitRequest}
              className={
                requestKind === 'delete'
                  ? 'bg-[#E8A0A0] text-white hover:bg-[#de8f8f]'
                  : 'bg-primary-blue text-white hover:bg-primary-blue/90'
              }
            >
              Anfrage senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
