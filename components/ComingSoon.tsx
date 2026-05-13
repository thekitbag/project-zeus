interface Props {
  icon: string;
  title: string;
  tagline: string;
  flavour: string;
}

export function ComingSoon({ icon, title, tagline, flavour }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h1 className="text-2xl font-bold text-stone-900 tracking-tight mb-2">{title}</h1>
      <p className="text-sm font-medium text-amber-600 mb-3">{tagline}</p>
      <p className="text-sm text-stone-400 leading-relaxed mb-6 max-w-xs">{flavour}</p>
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold tracking-widest uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Coming Soon
      </span>
    </div>
  );
}
