type Converter = (input: string) => string;

export interface OpenCCConverters {
  s2t: Converter;
  t2s: Converter;
}

const identity: Converter = (input) => input;

let convertersPromise: Promise<OpenCCConverters> | null = null;

function normalizeConverter(maybe: any): Converter | null {
  if (typeof maybe === 'function') return maybe as Converter;
  if (maybe && typeof maybe.convert === 'function') {
    return (input: string) => maybe.convert(input);
  }
  return null;
}

async function resolveConverter(maybe: any): Promise<Converter> {
  if (maybe && typeof maybe.then === 'function') {
    const resolved = await maybe;
    return normalizeConverter(resolved) || identity;
  }
  return normalizeConverter(maybe) || identity;
}

export async function loadOpenCCConverters(): Promise<OpenCCConverters> {
  if (convertersPromise) return convertersPromise;
  convertersPromise = (async () => {
    try {
      const mod: any = await import('opencc-js');
      const OpenCC = mod?.OpenCC || mod?.default || mod;
      const makeConverter = OpenCC?.Converter || OpenCC?.converter || OpenCC;
      if (typeof makeConverter !== 'function') {
        return { s2t: identity, t2s: identity };
      }
      let s2tMaybe: any;
      let t2sMaybe: any;
      try {
        s2tMaybe = makeConverter({ from: 'cn', to: 'tw' });
        t2sMaybe = makeConverter({ from: 'tw', to: 'cn' });
      } catch {
        s2tMaybe = makeConverter({ from: 's2t', to: 't2s' });
        t2sMaybe = makeConverter({ from: 't2s', to: 's2t' });
      }
      const s2t = await resolveConverter(s2tMaybe);
      const t2s = await resolveConverter(t2sMaybe);
      return { s2t, t2s };
    } catch {
      return { s2t: identity, t2s: identity };
    }
  })();
  return convertersPromise;
}
