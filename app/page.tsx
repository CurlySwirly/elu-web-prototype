import Link from 'next/link';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Award, Calendar, CheckCircle2, Heart, Shield, Star, TrendingUp, Users, Zap } from 'lucide-react';
import { fetchFeaturedExperts } from '@/lib/api';
import { ExpertShowcase } from '@/components/ExpertShowcase';

export default async function Home() {
  const featuredExperts = await fetchFeaturedExperts(8);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-16">
        <section className="relative bg-gradient-to-br from-white via-info-bg/20 to-white pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div className="space-y-8">
                <div className="inline-block">
                  <span className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-sm font-body font-semibold px-4 py-2 rounded-full shadow-md">
                    Wir helfen dir weiter
                  </span>
                </div>

                <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-text-dark leading-tight">
                  Finde <span className="bg-gradient-to-r from-primary-blue to-primary-green bg-clip-text text-transparent">geprüfte</span> Gesundheits­expert:innen
                </h1>

                <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-body">
                  Individuelle Empfehlungen, sichere Buchung und flexible Formate – online oder vor Ort. Alles an einem Ort.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup/client">
                    <Button size="lg" className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity px-8 py-6 text-lg font-body shadow-lg">
                      Expert:in finden
                    </Button>
                  </Link>
                  <a href="#explanation">
                    <Button size="lg" variant="outline" className="border-2 border-gray-300 text-text-dark hover:border-primary-blue hover:text-primary-blue transition-colors px-8 py-6 text-lg font-body">
                      Mehr erfahren
                    </Button>
                  </a>
                </div>

                <div className="flex flex-wrap gap-6 pt-4">
                  <Link href="/experts" className="text-sm text-gray-600 hover:text-primary-blue transition-colors font-body flex items-center gap-1">
                    Für Expert:innen →
                  </Link>
                  <Link href="/spaces" className="text-sm text-gray-600 hover:text-primary-blue transition-colors font-body flex items-center gap-1">
                    Für Studios & Praxen →
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-square w-full max-w-lg mx-auto bg-gradient-to-br from-primary-blue/10 to-primary-green/10 rounded-3xl overflow-hidden">
                  <img
                    src="https://images.pexels.com/photos/3822621/pexels-photo-3822621.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Gesundheitsexpert:in bei der Arbeit"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-12 flex-wrap mt-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="font-heading text-base font-semibold text-text-dark">2.500+</div>
                <div className="text-xs text-gray-500 font-body">Geprüfte Expert:innen</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div className="font-heading text-base font-semibold text-text-dark">4.8/5</div>
                <div className="text-xs text-gray-500 font-body">Durchschnittliche Bewertung</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div className="font-heading text-base font-semibold text-text-dark">12.000+</div>
                <div className="text-xs text-gray-500 font-body">Erfolgreiche Sitzungen</div>
              </div>
            </div>
          </div>
        </section>

        <section id="explanation" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                Deine Gesundheit verdient die beste Unterstützung
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Passgenaue Matches
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Wir verbinden dich mit Expert:innen, die zu deinen Zielen und Bedürfnissen passen.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Vielfältige Bereiche
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Physiotherapie, Personal Training, Coaching, Ernährung, Massage und mehr.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Flexibel online oder vor Ort
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Du entscheidest, wie du arbeiten möchtest – je nach deinen Präferenzen.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Sichere Zahlungsabwicklung
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Geschützte Buchung, faire Stornobedingungen und transparente Preise.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Award className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Qualifizierte Expert:innen
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Jedes Profil ist geprüft und transparent einsehbar – für deine Sicherheit.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Heart className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Langfristige Begleitung
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Finde Expert:innen, die dich nachhaltig auf deinem Gesundheitsweg unterstützen.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-24 bg-bg-light">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                So einfach funktioniert elu
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">1</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Profil anlegen</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Teile deine Ziele und Präferenzen in wenigen Minuten.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">2</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Expert:in finden</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Wir zeigen dir passende Fachpersonen für deine Bedürfnisse.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">3</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Termin buchen</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Flexibel, sicher und ohne lange Wartezeiten.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">4</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Gesundheit verbessern</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Mit Expert:innen, die dich langfristig begleiten.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                Unterstützung für jede Lebensphase
              </h2>
              <p className="text-xl text-gray-600 font-body max-w-3xl mx-auto">
                elu bringt dich mit qualifizierten Fachpersonen aus verschiedenen Bereichen der Gesundheits­vorsorge zusammen.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { name: 'Physiotherapie', icon: Activity },
                { name: 'Personal Training', icon: TrendingUp },
                { name: 'Coaching', icon: Users },
                { name: 'Ernährung', icon: Heart },
                { name: 'Massage', icon: Zap },
                { name: 'Mentale Gesundheit', icon: Star },
                { name: 'Rückenschmerzen', icon: Shield },
                { name: 'Stressmanagement', icon: Calendar },
                { name: 'Prävention', icon: Award },
                { name: 'Langlebigkeit', icon: CheckCircle2 },
              ].map((category, index) => {
                const Icon = category.icon;
                return (
                  <div
                    key={index}
                    className="bg-info-bg hover:bg-primary-blue/10 transition-colors rounded-lg p-6 text-center cursor-pointer group"
                  >
                    <Icon className="w-8 h-8 text-info-text mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-body text-sm font-semibold text-text-dark">{category.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <ExpertShowcase experts={featuredExperts} />

        <section className="py-24 bg-gradient-to-br from-info-bg to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-6">
              Warum tausende Menschen auf persönliche Gesundheits­begleitung setzen
            </h2>
            <p className="text-xl text-gray-600 font-body leading-relaxed">
              Immer mehr Menschen suchen individuelle, ganzheitliche Unterstützung statt generischer Programme.
              elu hilft dir, genau die Expert:innen zu finden, die wirklich zu dir passen.
            </p>
          </div>
        </section>

        <section className="py-24 bg-gradient-to-br from-primary-blue to-primary-green">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-6">
              Bereit für nachhaltige Gesundheit?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto font-body">
              Registriere dich jetzt kostenlos und finde Expert:innen, die zu dir passen.
            </p>
            <Link href="/signup/client">
              <Button size="lg" className="bg-white text-primary-blue hover:bg-gray-100 transition-colors px-8 py-6 text-lg font-body font-semibold shadow-xl">
                Jetzt starten
              </Button>
            </Link>
          </div>
        </section>

        <footer className="py-12 bg-text-dark text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              <div className="md:col-span-2">
                <h3 className="font-heading text-2xl font-bold mb-4">elu</h3>
                <p className="text-gray-400 font-body leading-relaxed mb-6">
                  elu ist deine Plattform für qualifizierte Gesundheits­expert:innen in den Bereichen Training,
                  Physiotherapie, Ernährung, Massage und Coaching. Flexible Formate, geprüfte Profile und sichere
                  Buchungen – für nachhaltige Gesundheit und echte Prävention.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-semibold mb-4">Für Kund:innen</h4>
                <ul className="space-y-2 font-body text-gray-400">
                  <li><Link href="/signup/client" className="hover:text-white transition-colors">Expert:innen finden</Link></li>
                  <li><Link href="/signup/client" className="hover:text-white transition-colors">Registrieren</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Anmelden</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-heading font-semibold mb-4">Für Profis</h4>
                <ul className="space-y-2 font-body text-gray-400">
                  <li><Link href="/experts" className="hover:text-white transition-colors">Als Expert:in beitreten</Link></li>
                  <li><Link href="/spaces" className="hover:text-white transition-colors">Räume anbieten</Link></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-800 text-center text-gray-400 font-body text-sm">
              <p>&copy; 2025 elu. Alle Rechte vorbehalten.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
