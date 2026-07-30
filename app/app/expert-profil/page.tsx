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
import { User } from 'lucide-react';
import { DocumentUpload } from '@/components/DocumentUpload';

export default function ExpertProfilePage() {
  const { user, userId } = useAuth();
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

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
          Expert:innen-Profil
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-body mt-1">
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
      </div>
    </div>
  );
}
