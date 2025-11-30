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
    <div className="space-y-4">
      <div>
        <Label htmlFor="documents" className="font-body mb-2 block">
          Qualifikationsnachweise hochladen
        </Label>
        <p className="text-sm text-gray-600 font-body mb-3">
          Lade deine Abschlüsse, Zertifikate und Lizenzen hoch (PDF, JPG, PNG)
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-blue transition-colors">
          <input
            id="documents"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="documents" className="cursor-pointer">
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-body text-gray-600 mb-2">
              Klicke hier oder ziehe Dateien hierher
            </p>
            <p className="text-xs text-gray-500 font-body">
              Unterstützt: PDF, JPG, PNG (max. 10MB pro Datei)
            </p>
          </label>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-body font-semibold text-text-dark">
            Ausgewählte Dateien ({selectedFiles.length})
          </h4>
          {selectedFiles.map((file) => (
            <div key={file.name} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <File className="w-5 h-5 text-primary-blue" />
                  <div className="flex-1">
                    <p className="text-sm font-body font-semibold text-text-dark">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 font-body">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(file.name)}
                  className="text-error-text hover:bg-error-bg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-xs font-body mb-1 block">Dokumenttyp</Label>
                <select
                  value={documentTypes[file.name] || 'certificate'}
                  onChange={(e) => handleDocumentTypeChange(file.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm font-body"
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
        <Alert className="border-error-text bg-error-bg">
          <AlertCircle className="h-4 w-4 text-error-text" />
          <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success-text bg-success-bg">
          <Check className="h-4 w-4 text-success-text" />
          <AlertDescription className="text-success-text font-body">{success}</AlertDescription>
        </Alert>
      )}

      {selectedFiles.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
        >
          {uploading ? 'Wird hochgeladen...' : `${selectedFiles.length} Dokument(e) hochladen`}
        </Button>
      )}
    </div>
  );
}
