'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Star, ThumbsUp } from 'lucide-react';
import { mockPlatformReviews } from '@/lib/backend/mock/data';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { DocumentUpload } from '@/components/DocumentUpload';

export default function ExpertProfilePage() {
  const { user, userId } = useAuth();
  const reviews = mockPlatformReviews;
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpertProfile = async () => {
      // Check if we're in mock mode
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        setExpertProfileId(`mock-expert-${userId}`);
        setLoading(false);
        return;
      }

      // In Supabase mode, fetch from database
      try {
        const { data } = await supabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (data) {
          setExpertProfileId(data.id);
        }
      } catch (error) {
        console.error('Error fetching expert profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchExpertProfile();
    }
  }, [userId]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
          Expert:innen-Profil
        </h1>
        <p className="text-gray-600 font-body">
          Verwalte dein öffentliches Profil
        </p>
      </div>

      <div className="max-w-3xl">
        <Card className="border-2 mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-2xl">
                  <User className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="font-heading text-2xl text-text-dark">
                  Profilbild
                </CardTitle>
                <CardDescription className="font-body">
                  Lade ein professionelles Foto hoch
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-text-dark">
              Profil-Informationen
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-body">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dein vollständiger Name"
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="font-body">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Erzähle Kund:innen über dich und deine Expertise..."
                  rows={5}
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specializations" className="font-body">Spezialisierungen</Label>
                <Input
                  id="specializations"
                  type="text"
                  placeholder="z.B. Massage, Yoga, Meditation (durch Komma getrennt)"
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="font-body">Erfahrung (Jahre)</Label>
                <Input
                  id="experience"
                  type="number"
                  placeholder="5"
                  className="font-body"
                />
              </div>

              <Button className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body">
                Profil aktualisieren
              </Button>
            </form>
          </CardContent>
        </Card>

        {expertProfileId && (
          <Card className="border-2 mt-6">
            <CardHeader>
              <CardTitle className="font-heading text-xl text-text-dark">
                Qualifikationen hochladen
              </CardTitle>
              <CardDescription className="font-body">
                Lade deine Abschlüsse, Zertifikate und Lizenzen hoch für die Verifizierung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload 
                expertProfileId={expertProfileId}
                onUploadComplete={() => {
                  // Refresh data if needed
                  console.log('Documents uploaded successfully');
                }}
              />
            </CardContent>
          </Card>
        )}

        <Card className="border-2 mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-xl text-text-dark">
                  Plattform-Bewertungen
                </CardTitle>
                <CardDescription className="font-body mt-1">
                  Was andere Expert:innen über die Plattform sagen
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold text-text-dark">{averageRating}</span>
                <span className="text-sm text-gray-500">({reviews.length} Bewertungen)</span>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 border-2 border-gray-100">
                      <AvatarImage src={review.expert_avatar_url} alt={review.expert_name} />
                      <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading">
                        {review.expert_name.split(' ')[0][0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-heading font-semibold text-text-dark">{review.expert_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500 font-body">
                              {formatDistanceToNow(new Date(review.created_at), {
                                addSuffix: true,
                                locale: de,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <h5 className="font-heading font-semibold text-text-dark mb-2">
                        {review.title}
                      </h5>

                      <p className="text-gray-700 font-body leading-relaxed mb-3">
                        {review.review_text}
                      </p>

                      {review.helpful_count && review.helpful_count > 0 && (
                        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-blue transition-colors font-body">
                          <ThumbsUp className="w-4 h-4" />
                          <span>Hilfreich ({review.helpful_count})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-gray-600 font-body mb-4">
                Möchtest du auch deine Erfahrung teilen?
              </p>
              <Button variant="outline" className="border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white font-body">
                Bewertung schreiben
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
