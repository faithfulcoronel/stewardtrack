import React from 'react';

interface FeatureItem {
  title: string;
  description?: string;
}

export interface FeatureGridProps {
  title?: string;
  features?: FeatureItem[] | null;
  children?: React.ReactNode;
}

export function FeatureGrid({ title, features, children }: FeatureGridProps) {
  const items = features ?? [];
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-3xl text-center">
        {title && <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>}
        {children}
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
            {item.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
