'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckCircle2, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { reviewService, type PendingReviewAppointment } from '@/lib/services/review';

type Step = 'pick' | 'rate' | 'write' | 'done';

type ReviewFlowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: PendingReviewAppointment[];
  initialAppointmentId?: string | null;
  clientId: string;
  onCompleted?: () => void;
};

export function ReviewFlowDialog({
  open,
  onOpenChange,
  pending,
  initialAppointmentId,
  clientId,
  onCompleted,
}: ReviewFlowDialogProps) {
  const [step, setStep] = useState<Step>('pick');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selected = pending.find((p) => p.id === selectedId) || null;

  useEffect(() => {
    if (!open) return;

    setRating(0);
    setHoverRating(0);
    setTitle('');
    setReviewText('');
    setError('');
    setLoading(false);

    if (initialAppointmentId && pending.some((p) => p.id === initialAppointmentId)) {
      setSelectedId(initialAppointmentId);
      setStep('rate');
      return;
    }

    if (pending.length === 1) {
      setSelectedId(pending[0].id);
      setStep('rate');
      return;
    }

    setSelectedId(null);
    setStep(pending.length > 1 ? 'pick' : 'rate');
  }, [open, initialAppointmentId, pending]);

  const close = () => onOpenChange(false);

  const handleSubmit = async () => {
    if (!selected || rating < 1) return;
    if (!title.trim() || !reviewText.trim()) {
      setError('Bitte Titel und Text ausfüllen.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await reviewService.createReview(
        selected.id,
        selected.expert_id,
        clientId,
        rating,
        title.trim(),
        reviewText.trim()
      );
      setStep('done');
      onCompleted?.();
    } catch (err: any) {
      setError(err?.message || 'Bewertung konnte nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  };

  const initials =
    (selected?.expert?.full_name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-body w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 gap-5">
        {step === 'pick' && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl sm:text-2xl font-bold text-text-dark">
                Offene Bewertungen
              </DialogTitle>
              <DialogDescription className="font-body text-gray-500">
                Wähle einen Termin aus, den du bewerten möchtest.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {pending.length === 0 ? (
                <p className="text-sm text-gray-500 font-body text-center py-6">
                  Keine offenen Bewertungen.
                </p>
              ) : (
                pending.map((apt) => (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(apt.id);
                      setStep('rate');
                    }}
                    className="w-full text-left rounded-xl border-2 border-gray-100 bg-bg-light p-4 hover:border-primary-blue transition-colors"
                  >
                    <p className="font-heading font-semibold text-text-dark">{apt.offer.title}</p>
                    <p className="text-sm text-gray-600 font-body mt-0.5">
                      mit {apt.expert?.full_name || 'Expert:in'}
                    </p>
                    <p className="text-xs text-gray-400 font-body mt-2">
                      {format(parseISO(apt.start_time), 'd. MMM yyyy · HH:mm', { locale: de })} Uhr
                    </p>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {step === 'rate' && selected && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl sm:text-2xl font-bold text-text-dark text-center">
                Wie war deine Session?
              </DialogTitle>
              <DialogDescription className="font-body text-gray-500 text-center">
                Deine Bewertung hilft anderen bei der Auswahl.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl bg-bg-light border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={selected.expert?.avatar_url} alt={selected.expert?.full_name} />
                  <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs font-heading">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-text-dark truncate">
                    {selected.offer.title}
                  </p>
                  <p className="text-sm text-gray-600 font-body">
                    mit {selected.expert?.full_name || 'Expert:in'}
                  </p>
                  <p className="text-xs text-gray-400 font-body mt-1">
                    {format(parseISO(selected.start_time), 'd. MMM yyyy · HH:mm', { locale: de })} Uhr
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-1.5 py-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = (hoverRating || rating) >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} von 5 Sternen`}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(value)}
                    className="p-1 rounded-lg transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'w-9 h-9',
                        active
                          ? 'fill-primary-blue text-primary-blue'
                          : 'text-gray-300'
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pending.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('pick')}
                  className="font-body border-2 rounded-xl py-5 order-2 sm:order-1"
                >
                  Zurück
                </Button>
              )}
              <Button
                type="button"
                disabled={rating < 1}
                onClick={() => setStep('write')}
                className={cn(
                  'font-body rounded-xl py-5 bg-primary-blue hover:bg-primary-blue/90 text-white',
                  pending.length > 1 ? 'order-1 sm:order-2' : 'w-full sm:col-span-2'
                )}
              >
                Weiter
              </Button>
            </div>
          </>
        )}

        {step === 'write' && selected && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl sm:text-2xl font-bold text-text-dark">
                Erzähl kurz davon
              </DialogTitle>
              <DialogDescription className="font-body text-gray-500">
                {rating} von 5 Sternen für {selected.expert?.full_name || 'diese Session'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review-title" className="font-body">
                  Titel
                </Label>
                <Input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z. B. Sehr hilfreiche Session"
                  className="font-body"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-text" className="font-body">
                  Deine Erfahrung
                </Label>
                <Textarea
                  id="review-text"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Was hat dir besonders gefallen? Was könnte besser sein?"
                  rows={4}
                  className="font-body resize-none"
                  maxLength={800}
                />
              </div>
              {error && <p className="text-sm text-red-600 font-body">{error}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('rate')}
                disabled={loading}
                className="font-body border-2 rounded-xl py-5 order-2 sm:order-1"
              >
                Zurück
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !title.trim() || !reviewText.trim()}
                className="font-body rounded-xl py-5 bg-primary-blue hover:bg-primary-blue/90 text-white order-1 sm:order-2"
              >
                {loading ? 'Wird gesendet…' : 'Bewertung absenden'}
              </Button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              <div className="w-16 h-16 rounded-full bg-primary-green/25 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary-green" />
              </div>
              <DialogHeader className="space-y-2">
                <DialogTitle className="font-heading text-xl sm:text-2xl font-bold text-text-dark text-center">
                  Danke für deine Bewertung
                </DialogTitle>
                <DialogDescription className="font-body text-gray-500 text-center">
                  Dein Feedback hilft anderen Client:innen und der Expert:in.
                </DialogDescription>
              </DialogHeader>
            </div>
            <Button
              type="button"
              onClick={close}
              className="w-full font-body rounded-xl py-5 bg-primary-blue hover:bg-primary-blue/90 text-white"
            >
              Fertig
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
