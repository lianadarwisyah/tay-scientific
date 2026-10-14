"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-slate">Please try again. If it keeps happening, contact us by phone or WhatsApp.</p>
      <button onClick={reset} className="btn-main mt-8">Try again</button>
    </div>
  );
}
