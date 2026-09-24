import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Activity, Award, Calendar, CheckCircle2, Heart, MapPin, Shield, Star, TrendingUp, Users, Zap, Quote } from 'lucide-react';
import { mockPlatformReviews } from '@/lib/backend/mock/data';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  SUBSCRIPTION_ACTION_PRICES,
  SUBSCRIPTION_LIST_PRICES,
  getYearlyListSavings,
} from '@/lib/utils/subscription';
import { formatEuro } from '@/lib/utils/pricing';

export default function ExpertsPage() {
  return (
    <div className="min-h-screen bg-bg-light">
      <Header />

      <main className="pt-16">
        <section className="relative pt-20 pb-12 bg-info-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div className="space-y-8">
                <div className="inline-block">
                  <span className="bg-primary-blue/10 text-primary-blue text-sm font-body font-semibold px-4 py-2 rounded-full border border-primary-blue/20">
                    Für Gesundheits­expert:innen
                  </span>
                </div>

                <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-text-dark leading-tight">
                  Mehr Klient:innen. Weniger Chaos.
                </h1>

                <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-body">
                  elu bringt dich mit Menschen zusammen, die echte Unterstützung wollen – online oder vor Ort. Ohne Verwaltungsaufwand, ohne Streuverlust.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup/expert">
                    <Button size="lg" className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity px-8 py-6 text-lg font-body font-semibold shadow-lg">
                      Als Expert:in starten
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-6 pt-4">
                  <Link href="/spaces" className="text-sm text-gray-600 hover:text-primary-blue transition-colors font-body flex items-center gap-1">
                    Du hast ein Studio oder eine Praxis? →
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-square w-full max-w-lg mx-auto bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-200">
                  <Image
                    src="https://images.pexels.com/photos/6111617/pexels-photo-6111617.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Expert:in bei der Arbeit"
                    width={800}
                    height={800}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-12 flex-wrap mt-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div className="font-heading text-base font-semibold text-text-dark">+68%</div>
                <div className="text-xs text-gray-600 font-body">Mehr Einnahmen im Schnitt</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div className="font-heading text-base font-semibold text-text-dark">4.8/5</div>
                <div className="text-xs text-gray-600 font-body">Zufriedenheit der Expert:innen</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-green flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="font-heading text-base font-semibold text-text-dark">2.500+</div>
                <div className="text-xs text-gray-600 font-body">Aktive Expert:innen</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                Mehr Fokus auf deine Arbeit.<br />Weniger Chaos in der Selbstständigkeit.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Gezielte Klient:innenanfragen
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Du wirst Menschen vorgeschlagen, die zu deinen Qualifikationen und Schwerpunkten passen.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Star className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Professionelles Profil (Sedcard)
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Präsentiere dich klar, transparent und hochwertig mit deinen Qualifikationen.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Flexible Buchbarkeit
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Termine online oder vor Ort anbieten, einfach in deinem Kalender verwalten.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Sichere Zahlungen
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Klare Abläufe, faire Stornobedingungen und automatisierte Abwicklung.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Zugang zu Räumen
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Buche geprüfte Trainings- und Praxisräume stundenweise, ohne langfristige Verträge.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Weniger Administration
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Weniger hin und her, weniger Organisation, mehr Fokus auf deine Expertise.
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
                So unterstützt dich elu im Alltag
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">1</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Profil anlegen</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Zeig deine Skills, Qualifikationen und Schwerpunkte transparent.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">2</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Gefunden werden</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Du wirst Klient:innen vorgeschlagen, die zu deinen Angeboten passen.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">3</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Termine verwalten</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Kalender, Buchungen und Kundenkommunikation – alles an einem Ort.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">4</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Räume flexibel nutzen</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Falls du vor Ort arbeitest: buche Studios oder Praxen stundenweise.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="preise" className="py-24 bg-info-bg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                Dein elu Abo
              </h2>
              <p className="text-xl text-gray-700 font-body max-w-2xl mx-auto">
                Listenpreis {formatEuro(SUBSCRIPTION_LIST_PRICES.monthly)}/Monat bzw.{' '}
                {formatEuro(SUBSCRIPTION_LIST_PRICES.yearly)}/Jahr — Phase&nbsp;1 zum Aktionspreis{' '}
                {formatEuro(SUBSCRIPTION_ACTION_PRICES.monthly)} /{' '}
                {formatEuro(SUBSCRIPTION_ACTION_PRICES.yearly)}.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <p className="text-sm font-body font-semibold text-primary-blue mb-2">Monatsabo</p>
                <p className="text-sm text-gray-400 font-body line-through tabular-nums">
                  {formatEuro(SUBSCRIPTION_LIST_PRICES.monthly)}
                </p>
                <p className="font-heading text-4xl font-bold text-primary-blue tabular-nums">
                  {formatEuro(SUBSCRIPTION_ACTION_PRICES.monthly)}
                </p>
                <p className="text-sm text-gray-600 font-body mt-4">
                  Aktion für die ersten Expert:innen · danach Listenpreis
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-primary-blue/30 p-8 shadow-sm ring-1 ring-primary-blue/20">
                <p className="text-sm font-body font-semibold text-primary-green mb-2">Jahresabo</p>
                <p className="text-sm text-gray-400 font-body line-through tabular-nums">
                  {formatEuro(SUBSCRIPTION_LIST_PRICES.yearly)}
                </p>
                <p className="font-heading text-4xl font-bold text-primary-blue tabular-nums">
                  {formatEuro(SUBSCRIPTION_ACTION_PRICES.yearly)}
                </p>
                <p className="text-sm text-gray-600 font-body mt-4">
                  {formatEuro(getYearlyListSavings())} günstiger als 12× Monat (Listenpreis)
                </p>
              </div>
            </div>

            <div className="text-center mt-10">
              <Link href="/signup/expert">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 px-8 py-6 text-lg font-body font-semibold shadow-lg"
                >
                  Jetzt starten
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                Für alle, die professionelle Gesundheitsarbeit leisten
              </h2>
              <p className="text-xl text-gray-600 font-body max-w-3xl mx-auto">
                elu unterstützt Expert:innen aus allen Bereichen der körperlichen und mentalen Gesundheit.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Physiotherapie', icon: Activity },
                { name: 'Personal Training', icon: TrendingUp },
                { name: 'Massage', icon: Zap },
                { name: 'Ernährung', icon: Heart },
                { name: 'Coaching', icon: Users },
                { name: 'Yoga / Pilates', icon: Star },
                { name: 'Mental Health', icon: Shield },
                { name: 'Bewegungs- & Präventionsarbeit', icon: Award },
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

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                Was Expert:innen über elu sagen
              </h2>
              <p className="text-xl text-gray-600 font-body max-w-3xl mx-auto">
                Hunderte Expert:innen nutzen elu bereits täglich – und berichten von mehr Zeit für ihre Arbeit und deutlich höheren Einnahmen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {mockPlatformReviews.slice(0, 6).map((review) => (
                <Card key={review.id} className="border-2 hover:shadow-lg transition-shadow relative">
                  <CardHeader>
                    <Quote className="absolute top-4 right-4 w-10 h-10 text-primary-blue/10" />
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-12 h-12 border-2 border-gray-100">
                        <AvatarImage src={review.expert_avatar_url} alt={review.expert_name} />
                        <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-sm">
                          {review.expert_name.split(' ')[0][0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-heading font-semibold text-text-dark">{review.expert_name}</h4>
                        <div className="flex items-center gap-1 mt-1">
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
                      </div>
                    </div>
                    <CardTitle className="font-heading text-lg text-text-dark mb-3">
                      {review.title}
                    </CardTitle>
                    <CardDescription className="text-base font-body text-gray-700 leading-relaxed">
                      {review.review_text}
                    </CardDescription>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 font-body">
                        {formatDistanceToNow(new Date(review.created_at), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <p className="text-gray-600 font-body text-lg mb-6">
                Durchschnittliche Bewertung: <span className="font-bold text-text-dark">4.8/5</span> ({mockPlatformReviews.length} Bewertungen)
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 bg-gradient-to-br from-info-bg to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-6">
              Dein Vorteil: klare Strukturen und eine verlässliche Plattform
            </h2>
            <p className="text-xl text-gray-600 font-body leading-relaxed">
              Viele Expert:innen starten motiviert in die Selbstständigkeit – und stehen dann im Verwaltungschaos.
              elu bündelt alles, was du brauchst, an einem Ort. Sichtbarkeit, Buchungen, Zahlungen und optional passende Räume.
            </p>
          </div>
        </section>

        <section className="py-24 bg-gradient-to-br from-primary-blue to-primary-green">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-6">
              Bereit für mehr Klient:innen und weniger Chaos?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto font-body">
              Registriere dich kostenlos und werde Teil einer wachsenden Community von Gesundheits­expert:innen.
            </p>
            <Link href="/signup/expert">
              <Button size="lg" className="bg-white text-primary-blue hover:bg-gray-100 transition-colors px-8 py-6 text-lg font-body font-semibold shadow-xl">
                Als Expert:in starten
              </Button>
            </Link>
          </div>
        </section>

        <footer className="py-12 bg-text-dark text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <p className="text-gray-400 font-body leading-relaxed max-w-4xl mx-auto">
                elu hilft Gesundheits­expert:innen, mehr Klient:innen zu erreichen, professioneller zu arbeiten und sowohl online als auch vor Ort flexibel zu buchen. Ideal für Physiotherapie, Training, Coaching, Massage, Ernährung und Prävention.
              </p>
            </div>

            <div className="pt-8 border-t border-gray-800 text-center">
              <div className="flex justify-center gap-6 mb-4">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors font-body text-sm">
                  Für Klient:innen
                </Link>
                <Link href="/spaces" className="text-gray-400 hover:text-white transition-colors font-body text-sm">
                  Für Studios & Praxen
                </Link>
              </div>
              <p className="text-gray-400 font-body text-sm">&copy; 2025 elu. Alle Rechte vorbehalten.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
