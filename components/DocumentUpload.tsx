'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, File, X, Check, AlertCircle } from 'lucide-react';
import { verificationService } from '@/lib/services/verification';

interface DocumentUploadProps {
  expertProfileId: string;
  onUploadComplete?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'degree', label: 'Hochschulabschluss' },
  { value: 'certificate', label: 'Zertifikat' },
  { value: 'license', label: 'Lizenz/Zulassung' },
  { value: 'other', label: 'Sonstiges' },
];

export function DocumentUpload({ expertProfileId, onUploadComplete }: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentTypes, setDocumentTypes] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((file) => {
        if (!documentTypes[file.name]) {
          setDocumentTypes((prev) => ({
            ...prev,
            [file.name]: 'certificate',
          }));
        }
      });
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setDocumentTypes((prev) => {
      const { [fileName]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleDocumentTypeChange = (fileName: string, type: string) => {
    setDocumentTypes((prev) => ({
      ...prev,
      [fileName]: type,
    }));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Bitte wähle mindestens eine Datei aus');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      for (const file of selectedFiles) {
        const documentType = documentTypes[file.name] || 'certificate';
        await verificationService.uploadDocument(expertProfileId, file, documentType);
      }

      setSuccess(`${selectedFiles.length} Dokument(e) erfolgreich hochgeladen`);
      setSelectedFiles([]);
      setDocumentTypes({});

      if (onUploadComplete) {
        onUploadComplete();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="documents" className="font-body text-sm font-medium mb-1 block">
          Qualifikationsnachweise hochladen
        </Label>
        <p className="text-xs text-gray-500 font-body mb-2">
          Abschlüsse, Zertifikate und Lizenzen (PDF, JPG, PNG)
        </p>

        <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-blue transition-colors">
          <input
            id="documents"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="documents" className="cursor-pointer">
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
            <p className="text-xs font-body text-gray-600 mb-0.5">
              Klicken oder Dateien hierher ziehen
            </p>
            <p className="text-[11px] text-gray-400 font-body">PDF, JPG, PNG · max. 10MB</p>
          </label>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-body font-semibold text-sm text-text-dark">
            Dateien ({selectedFiles.length})
          </h4>
          {selectedFiles.map((file) => (
            <div key={file.name} className="border border-gray-200 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="w-4 h-4 text-primary-blue shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-body font-semibold text-text-dark truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-gray-500 font-body">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(file.name)}
                  className="text-error-text hover:bg-error-bg h-7 w-7 p-0 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div>
                <Label className="text-[11px] font-body mb-1 block text-gray-500">
                  Dokumenttyp
                </Label>
                <select
                  value={documentTypes[file.name] || 'certificate'}
                  onChange={(e) => handleDocumentTypeChange(file.name, e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-md text-xs font-body h-8"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert className="border-error-text bg-error-bg py-2">
          <AlertCircle className="h-3.5 w-3.5 text-error-text" />
          <AlertDescription className="text-error-text font-body text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success-text bg-success-bg py-2">
          <Check className="h-3.5 w-3.5 text-success-text" />
          <AlertDescription className="text-success-text font-body text-xs">{success}</AlertDescription>
        </Alert>
      )}

      {selectedFiles.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          size="sm"
          className="w-full h-9 text-sm bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
        >
          {uploading ? 'Wird hochgeladen…' : `${selectedFiles.length} Dokument(e) hochladen`}
        </Button>
      )}
    </div>
  );
}
