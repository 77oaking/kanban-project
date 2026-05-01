import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-7 w-7 rounded-md bg-fredo-800 text-white grid place-items-center text-xs font-bold">
              FC
            </div>
            FredoCloud Hub
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-fredo-50 px-3 py-1 text-xs font-medium text-fredo-800 dark:bg-fredo-950/50 dark:text-fredo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-fredo-700 animate-pulse-slow" />
            FredoCloud Technical Assessment
          </p>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
            One hub. Every goal,<br className="hidden sm:block" />
            announcement, and action.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400 text-lg">
            A collaborative team workspace for shared goals, real-time announcements, and a kanban
            of action items — built end-to-end on Next.js, Express, Postgres, and Socket.io.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/register" className="btn-primary px-5 py-3">Create your workspace</Link>
            <Link href="/login" className="btn-outline px-5 py-3">Try the demo</Link>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Demo login: <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">demo@fredocloud.test</code> / <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">Demo1234!</code>
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24 grid md:grid-cols-3 gap-6">
          {[
            {
              t: 'Goals & milestones',
              d: 'Track outcomes with nested milestones, owners, and an activity feed for every update.',
            },
            {
              t: 'Real-time, in sync',
              d: 'Socket.io pushes new posts, reactions, and status changes to every member instantly.',
            },
            {
              t: 'Granular RBAC',
              d: 'Per-member permission flags for who can post, pin, invite, and export.',
            },
          ].map((f) => (
            <div key={f.t} className="card p-5">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{f.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between text-xs text-zinc-500">
          <span>© FredoCloud Team Hub — assessment build</span>
          <a href="/api/docs" className="hover:underline" target="_blank" rel="noreferrer">API docs</a>
        </div>
      </footer>
    </div>
  );
}
