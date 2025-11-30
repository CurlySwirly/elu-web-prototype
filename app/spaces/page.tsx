'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Award, Building2, Calendar, CheckCircle2, DollarSign, Heart, Shield, TrendingUp, Zap, Clock } from 'lucide-react';

export default function SpacesPage() {
  return (
    <div className="min-h-screen bg-bg-light">
      <Header />

      <main className="pt-16">
        <section className="relative pt-20 pb-16" style={{background: 'linear-gradient(135deg, #F8F4F4 0%, #E2E8FB 100%)'}}>          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-block">
                  <span className="bg-primary-green/10 text-primary-green text-sm font-body font-semibold px-4 py-2 rounded-full border border-primary-green/20">
                    Für Studios & Praxen
                  </span>
                </div>

                <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-text-dark leading-tight">
                  Mehr Auslastung.<br />Mehr Einnahmen.
                </h1>

                <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-body">
                  Mit elu vermieten Sie Ihre Räume stundenweise an geprüfte Expert:innen – vollständig versichert, automatisiert und ohne administrativen Aufwand.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup/provider">
                    <Button size="lg" className="bg-primary-green text-white hover:opacity-90 transition-opacity px-8 py-6 text-lg font-body font-semibold shadow-lg">
                      Räume anbieten
                    </Button>
                  </Link>
                  <Link href="/experts">
                    <Button size="lg" variant="outline" className="border-2 border-primary-green text-primary-green hover:bg-primary-green/5 px-8 py-6 text-lg font-body font-semibold">
                      Als Expert:in Räume finden
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-8 pt-6">
                  <div className="flex flex-col">
                    <div className="text-3xl font-heading font-bold text-primary-green mb-1">€850</div>
                    <div className="text-sm text-gray-600 font-body">Durchschn. monatlich</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-3xl font-heading font-bold text-primary-green mb-1">450+</div>
                    <div className="text-sm text-gray-600 font-body">Räume aktiv</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-3xl font-heading font-bold text-primary-green mb-1">82%</div>
                    <div className="text-sm text-gray-600 font-body">Auslastung</div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-primary-green/10 rounded-3xl transform rotate-3"></div>
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src="https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Modernes Studio"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-green/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-primary-green" />
                    </div>
                    <div>
                      <div className="font-heading font-bold text-text-dark">100% versichert</div>
                      <div className="text-sm text-gray-600 font-body">Alle Buchungen abgesichert</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                Mehr Auslastung. Mehr Einnahmen.<br />Null Risiko.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-primary-green transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Flexible Stundenvermietung
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Ihre Räume werden nur dann gebucht, wenn Sie sie nicht nutzen. Sie behalten die volle Kontrolle.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-green transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Geprüfte Expert:innen
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Nur verifizierte Trainer:innen, Therapeut:innen und Coaches erhalten Zugang zu Ihren Räumen.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-green transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Automatisierte Buchung
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Keine Nachrichten, kein Koordinieren, kein Verwaltungsaufwand. Alles läuft automatisch.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-green transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Versicherungsschutz
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Absicherung bei Schäden und klare Nutzungsregeln für maximale Sicherheit.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-green transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <DollarSign className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Auszahlung automatisch
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Nach jedem Termin erhalten Sie Ihre Vergütung über sicheren Zahlungsdienstleister.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary-green transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-info-text" />
                  </div>
                  <CardTitle className="font-heading text-xl text-text-dark mb-3">
                    Volle Kontrolle
                  </CardTitle>
                  <CardDescription className="text-base font-body leading-relaxed">
                    Sie definieren Ausstattung, Regeln, Preise und verfügbare Zeiten selbst.
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
                In wenigen Schritten zu neuer Auslastung
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-green to-primary-blue flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">1</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Räume anlegen</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Beschreiben Sie Ausstattung, Größe, Regeln und Preise detailliert.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-green to-primary-blue flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">2</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Verfügbare Zeiten eintragen</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Sie bestimmen genau, wann Expert:innen buchen können.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-green to-primary-blue flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">3</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Buchungen erhalten</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Fachlich geprüfte Expert:innen buchen freie Slots direkt über die Plattform.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-green to-primary-blue flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-heading font-bold text-white">4</span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-text-dark mb-3">Automatische Auszahlung</h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  Nach dem Termin erhalten Sie Ihre Vergütung – ohne manuellen Aufwand.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
                Diese Räume eignen sich besonders gut
              </h2>
              <p className="text-xl text-gray-600 font-body max-w-3xl mx-auto">
                Ob Einzelraum oder Boutique-Studio – elu hilft Ihnen, freie Kapazitäten rentabel zu nutzen.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: 'Personal-Training-Studios', icon: TrendingUp },
                { name: 'Physiopraxen mit freien Zeiten', icon: Activity },
                { name: 'Massageräume', icon: Zap },
                { name: 'Coachingräume', icon: Heart },
                { name: 'Pilates- & Yogastudios', icon: Award },
                { name: 'Multifunktionale Gesundheitsräume', icon: Building2 },
              ].map((category, index) => {
                const Icon = category.icon;
                return (
                  <div
                    key={index}
                    className="bg-info-bg transition-colors rounded-lg p-6 text-center cursor-pointer group"
                    style={{
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#6D8EEC20';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <Icon className="w-8 h-8 text-info-text mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-body text-sm font-semibold text-text-dark">{category.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-24 bg-gradient-to-br from-info-bg to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-6">
              Volle Auslastung, transparente Abläufe
            </h2>
            <p className="text-xl text-gray-600 font-body leading-relaxed">
              Viele Studios und Praxen haben ungenutzte Stunden, die sich kaum monetarisieren lassen.
              Über elu vermieten Sie diese Zeiten flexibel an qualifizierte Expert:innen – sicher, automatisiert und ohne zusätzlichen Arbeitsaufwand.
            </p>
          </div>
        </section>

        <section className="py-24 bg-gradient-to-br from-primary-green to-primary-blue">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-6">
              Bereit für bessere Auslastung?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto font-body">
              Registrieren Sie sich kostenlos und listen Sie Ihre ersten Räume innerhalb weniger Minuten.
            </p>
            <Link href="/signup/provider">
              <Button size="lg" className="bg-white text-primary-green hover:bg-gray-100 transition-colors px-8 py-6 text-lg font-body font-semibold shadow-xl">
                Räume anbieten
              </Button>
            </Link>
          </div>
        </section>

        <footer className="py-12 bg-text-dark text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <p className="text-gray-400 font-body leading-relaxed max-w-4xl mx-auto">
                elu ist die Plattform für Studios und Praxen, die freie Raumzeiten flexibel und sicher an Gesundheits­expert:innen vermieten möchten.
                Ideal für Trainingsräume, Praxisräume, Massageräume, Coachingräume und Wellnessbereiche.
              </p>
            </div>

            <div className="pt-8 border-t border-gray-800 text-center">
              <div className="flex justify-center gap-6 mb-4">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors font-body text-sm">
                  Für Klient:innen
                </Link>
                <Link href="/experts" className="text-gray-400 hover:text-white transition-colors font-body text-sm">
                  Für Expert:innen
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
