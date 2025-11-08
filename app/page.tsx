import Link from 'next/link';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header showAuth={true} />

      <main>
        {/* Announcement Banner */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-center">
              <span className="inline-block bg-white border border-gray-200 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-[#5b6068]">
                New Chapter
              </span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-16 sm:py-24">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-[#111827] mb-6 leading-tight">
                Marin Software enters its{' '}
                <span className="text-[#41b6e6]">AI-first era</span>{' '}
                with Zax Capital
              </h1>
              <p className="text-lg sm:text-xl text-[#111827] max-w-3xl mx-auto mb-4">
                We&apos;re building the next generation of performance marketing—{' '}
                <strong>AI that plans, optimizes, and learns</strong> with every campaign.
              </p>
              <p className="text-lg sm:text-xl text-[#5b6068] max-w-3xl mx-auto mb-12">
                The acquisition accelerates our roadmap and unlocks what&apos;s next.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center bg-[#41b6e6] text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-[#3aa5d5] transition-colors text-base"
                >
                  Get Started
                </Link>
                <Link
                  href="/image-to-video"
                  className="inline-flex items-center justify-center bg-[#111827] text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-[#111827]/90 transition-colors text-base"
                >
                  Image to Video
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="py-16 bg-gray-50">
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
            <p className="text-[#5b6068] mb-8">
              More updates are on the way—including early access invites.
            </p>
            <p className="text-sm text-[#5b6068]">
              If you are a shareholder with questions, please contact:{' '}
              <strong>Armanino (Administrator)</strong> —{' '}
              <a href="mailto:marinsoftware@armanino.com" className="text-[#41b6e6] hover:underline">
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
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center hover:shadow-lg transition-shadow">
      <h3 className="font-display text-xl font-bold text-[#111827] mb-2">{title}</h3>
      <p className="text-[#5b6068]">{description}</p>
    </div>
  );
}