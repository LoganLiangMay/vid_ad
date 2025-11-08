import Link from 'next/link';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header showAuth={true} />

      <main>
        {/* Announcement Banner */}
        <div className="bg-muted border-b border-border">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-center">
              <span className="inline-block bg-white border border-border px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New Chapter
              </span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-16 sm:py-24">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                Marin Software enters its{' '}
                <span className="text-primary">AI-first era</span>{' '}
                with Zax Capital
              </h1>
              <p className="text-lg sm:text-xl text-foreground max-w-3xl mx-auto mb-4">
                We&apos;re building the next generation of performance marketing—{' '}
                <strong>AI that plans, optimizes, and learns</strong> with every campaign.
              </p>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
                The acquisition accelerates our roadmap and unlocks what&apos;s next.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center bg-primary text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors text-base"
                >
                  Get Started
                </Link>
                <Link
                  href="/image-to-video"
                  className="inline-flex items-center justify-center bg-foreground text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-foreground/90 transition-colors text-base"
                >
                  Image to Video
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                title="Predict"
                description="AI-powered forecasting & planning"
              />
              <FeatureCard
                title="Automate"
                description="Always-on optimization across channels"
              />
              <FeatureCard
                title="Prove"
                description="Transparent lift, measurable outcomes"
              />
            </div>
          </div>
        </section>

        {/* Additional Info Section */}
        <section className="py-16">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-muted-foreground mb-8">
              More updates are on the way—including early access invites.
            </p>
            <p className="text-sm text-muted-foreground">
              If you are a shareholder with questions, please contact:{' '}
              <strong>Armanino (Administrator)</strong> —{' '}
              <a href="mailto:marinsoftware@armanino.com" className="text-primary hover:underline">
                marinsoftware@armanino.com
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-8 text-center hover:shadow-lg transition-shadow">
      <h3 className="font-display text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}