import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Award, Calendar, CheckCircle2, Heart, Shield, Star, TrendingUp, Users, Zap } from 'lucide-react';
import { fetchFeaturedExperts } from '@/lib/api';
import { ExpertShowcase } from '@/components/ExpertShowcase';

const PAGE_X = 'max-w-6xl mx-auto px-4 sm:px-5 lg:px-6';
const SECTION_Y = 'py-12 sm:py-14 lg:py-16';

export default async function Home() {
  let featuredExperts: Awaited<ReturnType<typeof fetchFeaturedExperts>> = [];
  try {
    featuredExperts = await fetchFeaturedExperts(8);
  } catch {
    featuredExperts = [];
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-16">
        <section className="relative bg-gradient-to-br from-white via-info-bg/20 to-white pt-10 sm:pt-12 pb-8 sm:pb-10">
          <div className={PAGE_X}>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center mb-8">
              <div className="space-y-4 sm:space-y-5">
                <div className="inline-block">
                  <span className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs font-body font-semibold px-3 py-1.5 rounded-full shadow-sm">
                    Wir helfen dir weiter
                  </span>
                </div>

                <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.5rem] font-bold text-text-dark leading-tight tracking-tight">
                  Finde{' '}
                  <span className="bg-gradient-to-r from-primary-blue to-primary-green bg-clip-text text-transparent">
                    geprüfte
                  </span>{' '}
                  Gesundheits­expert:innen
                </h1>

                <p className="text-base text-gray-600 leading-relaxed font-body max-w-lg">
                  Individuelle Empfehlungen, sichere Buchung und flexible Formate – online oder vor Ort.
                  Alles an einem Ort.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
                  <Link href="/app/experten">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity px-6 py-5 text-sm sm:text-base font-body shadow-md"
                    >
                      Expert:in finden
                    </Button>
                  </Link>
                  <a href="#explanation">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto border-2 border-gray-300 text-text-dark hover:border-primary-blue hover:text-primary-blue transition-colors px-6 py-5 text-sm sm:text-base font-body"
                    >
                      Mehr erfahren
                    </Button>
                  </a>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] md:aspect-square w-full max-w-md mx-auto bg-gradient-to-br from-primary-blue/10 to-primary-green/10 rounded-2xl overflow-hidden">
                  <Image
                    src="https://images.pexels.com/photos/3822621/pexels-photo-3822621.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Gesundheitsexpert:in bei der Arbeit"
                    width={800}
                    height={800}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center items-start gap-6 sm:gap-10 flex-wrap pt-2">
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="font-heading text-sm font-semibold text-text-dark">2.500+</div>
                <div className="text-[11px] text-gray-500 font-body">Geprüfte Expert:innen</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="font-heading text-sm font-semibold text-text-dark">4.8/5</div>
                <div className="text-[11px] text-gray-500 font-body">Durchschnittliche Bewertung</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="font-heading text-sm font-semibold text-text-dark">12.000+</div>
                <div className="text-[11px] text-gray-500 font-body">Erfolgreiche Sitzungen</div>
              </div>
            </div>
          </div>
        </section>

        <section id="explanation" className={`${SECTION_Y} bg-white`}>
          <div className={PAGE_X}>
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-dark">
                Deine Gesundheit verdient die beste Unterstützung
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                {
                  icon: Users,
                  title: 'Passgenaue Matches',
                  text: 'Wir verbinden dich mit Expert:innen, die zu deinen Zielen und Bedürfnissen passen.',
                },
                {
                  icon: Activity,
                  title: 'Vielfältige Bereiche',
                  text: 'Physiotherapie, Personal Training, Coaching, Ernährung, Massage und mehr.',
                },
                {
                  icon: Zap,
                  title: 'Flexibel online oder vor Ort',
                  text: 'Du entscheidest, wie du arbeiten möchtest – je nach deinen Präferenzen.',
                },
                {
                  icon: Shield,
                  title: 'Sichere Zahlungsabwicklung',
                  text: 'Geschützte Buchung, faire Stornobedingungen und transparente Preise.',
                },
                {
                  icon: Award,
                  title: 'Qualifizierte Expert:innen',
                  text: 'Jedes Profil ist geprüft und transparent einsehbar – für deine Sicherheit.',
                },
                {
                  icon: Heart,
                  title: 'Langfristige Begleitung',
                  text: 'Finde Expert:innen, die dich nachhaltig auf deinem Gesundheitsweg unterstützen.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.title}
                    className="border-2 hover:border-primary-blue transition-colors"
                  >
                    <CardHeader className="p-4 sm:p-5">
                      <div className="w-11 h-11 rounded-full bg-info-bg flex items-center justify-center mb-3">
                        <Icon className="w-5 h-5 text-info-text" />
                      </div>
                      <CardTitle className="font-heading text-base sm:text-lg text-text-dark mb-1.5">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-sm font-body leading-relaxed">
                        {item.text}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className={`${SECTION_Y} bg-bg-light`}>
          <div className={PAGE_X}>
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-dark">
                So einfach funktioniert elu
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
              {[
                {
                  step: '1',
                  title: 'Expert:in finden',
                  text: 'Wir zeigen dir passende Fachpersonen für deine Bedürfnisse.',
                },
                {
                  step: '2',
                  title: 'Termin buchen',
                  text: 'Flexibel, sicher und ohne lange Wartezeiten.',
                },
                {
                  step: '3',
                  title: 'Gesundheit verbessern',
                  text: 'Mit Expert:innen, die dich langfristig begleiten.',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-3 shadow-md">
                    <span className="text-lg font-heading font-bold text-white">{item.step}</span>
                  </div>
                  <h3 className="font-heading text-base sm:text-lg font-bold text-text-dark mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 font-body leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${SECTION_Y} bg-white`}>
          <div className={PAGE_X}>
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-dark mb-2">
                Unterstützung für jede Lebensphase
              </h2>
              <p className="text-sm sm:text-base text-gray-600 font-body max-w-2xl mx-auto">
                elu bringt dich mit qualifizierten Fachpersonen aus verschiedenen Bereichen der
                Gesundheits­vorsorge zusammen.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
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
              ].map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.name}
                    className="bg-info-bg hover:bg-primary-blue/10 transition-colors rounded-lg p-3.5 sm:p-4 text-center cursor-pointer group"
                  >
                    <Icon className="w-5 h-5 text-info-text mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-body text-xs sm:text-sm font-semibold text-text-dark">
                      {category.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <ExpertShowcase experts={featuredExperts} />

        <section className={`${SECTION_Y} bg-gradient-to-br from-info-bg to-white`}>
          <div className="max-w-3xl mx-auto px-4 sm:px-5 lg:px-6 text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-dark mb-3">
              Warum tausende Menschen auf persönliche Gesundheits­begleitung setzen
            </h2>
            <p className="text-sm sm:text-base text-gray-600 font-body leading-relaxed">
              Immer mehr Menschen suchen individuelle, ganzheitliche Unterstützung statt generischer
              Programme. elu hilft dir, genau die Expert:innen zu finden, die wirklich zu dir passen.
            </p>
          </div>
        </section>

        <section className={`${SECTION_Y} bg-gradient-to-br from-primary-blue to-primary-green`}>
          <div className={`${PAGE_X} text-center`}>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3">
              Bereit für nachhaltige Gesundheit?
            </h2>
            <p className="text-sm sm:text-base text-white/90 mb-6 max-w-xl mx-auto font-body">
              Finde Expert:innen, die zu dir passen – ohne vorheriges Login. Profil anlegen geht auch später.
            </p>
            <Link href="/app/experten">
              <Button
                size="lg"
                className="bg-white text-primary-blue hover:bg-gray-100 transition-colors px-6 py-5 text-sm sm:text-base font-body font-semibold shadow-lg"
              >
                Expert:innen entdecken
              </Button>
            </Link>
          </div>
        </section>

        <footer className="py-8 sm:py-10 bg-text-dark text-white">
          <div className={PAGE_X}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="md:col-span-2">
                <h3 className="font-heading text-xl font-bold mb-2">elu</h3>
                <p className="text-sm text-gray-400 font-body leading-relaxed mb-4 max-w-md">
                  elu ist deine Plattform für qualifizierte Gesundheits­expert:innen in den Bereichen
                  Training, Physiotherapie, Ernährung, Massage und Coaching. Flexible Formate, geprüfte
                  Profile und sichere Buchungen – für nachhaltige Gesundheit und echte Prävention.
                </p>
              </div>

              <div>
                <h4 className="font-heading text-sm font-semibold mb-2.5">Für Kund:innen</h4>
                <ul className="space-y-1.5 font-body text-sm text-gray-400">
                  <li>
                    <Link href="/app/experten" className="hover:text-white transition-colors">
                      Expert:innen finden
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup/client" className="hover:text-white transition-colors">
                      Registrieren
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="hover:text-white transition-colors">
                      Anmelden
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-heading text-sm font-semibold mb-2.5">Für Profis</h4>
                <ul className="space-y-1.5 font-body text-sm text-gray-400">
                  <li>
                    <Link href="/experts" className="hover:text-white transition-colors">
                      Als Expert:in beitreten
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-800 text-center text-gray-400 font-body text-xs">
              <p>&copy; 2025 elu. Alle Rechte vorbehalten.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
