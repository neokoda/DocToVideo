import Link from 'next/link';
import { ArrowRight, FileText, BarChart2, MessageSquare, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-950 tracking-tight">DocToVideo</span>
        <Link href="/upload">
          <Button variant="ghost" size="sm">Admin →</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center max-w-2xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-neutral-200 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
          <span className="text-xs text-neutral-500 tracking-wide">AI Document Platform</span>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 mb-4 leading-tight">
          Turn any document into a<br />guided video experience
        </h1>

        <p className="text-base text-neutral-500 leading-relaxed mb-10 max-w-lg">
          Upload a PDF, PowerPoint, or Word document. Get an AI-narrated walkthrough with smart highlights, an embedded assistant, and engagement analytics — in minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/upload">
            <Button size="lg" className="gap-2">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">View analytics</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-100 px-6 py-16">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Play, title: 'AI Walkthrough', desc: 'Scene-by-scene narration generated from your content.' },
            { icon: FileText, title: 'Smart Highlights', desc: 'Key stats, terms, and claims highlighted automatically.' },
            { icon: MessageSquare, title: 'Grounded Q&A', desc: 'Assistant answers only from your document — no hallucinations.' },
            { icon: BarChart2, title: 'Engagement Analytics', desc: 'Track what viewers watch, skip, and ask about.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="space-y-2">
              <Icon className="h-5 w-5 text-neutral-400" />
              <p className="text-sm font-semibold text-neutral-950">{title}</p>
              <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 px-6 py-5 text-center">
        <p className="text-xs text-neutral-400">
          DocToVideo · AI Document-to-Video Platform · Interview Case Study Submission
        </p>
      </footer>
    </main>
  );
}
