import Link from "next/link";
import summary from "@/data/summary.json";
import lineComparison from "@/data/lineComparison.json";
import HomeCorrelationChart from "./components/HomeCorrelationChart";

function StatCard({
  label,
  value,
  detail,
  delay,
}: {
  label: string;
  value: string;
  detail: string;
  delay: number;
}) {
  return (
    <div
      className="stat-reveal p-6 rounded-sm"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        animationDelay: `${delay}ms`,
      }}
    >
      <p
        className="text-xs uppercase tracking-wider mb-3"
        style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
      >
        {label}
      </p>
      <p
        className="text-4xl font-light mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}
      >
        {value}
      </p>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {detail}
      </p>
    </div>
  );
}

function MiniBar({
  line,
  maxPct,
}: {
  line: (typeof lineComparison)[0];
  maxPct: number;
}) {
  const pct = line.latestPunctuality ?? 0;
  const width = ((pct - 85) / (maxPct - 85)) * 100;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        className="text-xs w-28 text-right shrink-0"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
      >
        {line.name}
      </span>
      <div className="flex-1 h-5 rounded-sm overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
        <div
          className="h-full rounded-sm bar-animate"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${line.color}88, ${line.color})`,
          }}
        />
      </div>
      <span
        className="text-xs w-12 tabular-nums"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
      >
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function Home() {
  const sorted = [...lineComparison]
    .filter((l) => l.latestPunctuality != null)
    .sort((a, b) => (b.latestPunctuality ?? 0) - (a.latestPunctuality ?? 0));
  const maxPct = Math.max(...sorted.map((l) => l.latestPunctuality ?? 0));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
        <div
          className="absolute top-0 right-0 w-1/2 h-full opacity-5"
          style={{
            background:
              "repeating-linear-gradient(45deg, var(--accent-gold) 0px, var(--accent-gold) 1px, transparent 1px, transparent 40px)",
          }}
        />
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-20 relative">
          <div className="max-w-3xl">
            <p
              className="text-xs uppercase tracking-wider mb-6"
              style={{ color: "var(--accent-gold)", letterSpacing: "0.2em" }}
            >
              Data Investigation &middot; {summary.totalYears} Years of Data
            </p>
            <h1
              className="text-5xl md:text-7xl leading-[1.05] mb-8"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Do wealthier suburbs get{" "}
              <em style={{ color: "var(--accent-gold)" }}>better trains?</em>
            </h1>
            <p
              className="text-lg leading-relaxed max-w-xl mb-10"
              style={{ color: "var(--text-secondary)" }}
            >
              Melbourne&rsquo;s 16 metro train lines serve suburbs ranging from
              Australia&rsquo;s most affluent to its most disadvantaged. We
              extracted {summary.totalYears} years of official performance data
              to test whether wealthier lines really do get better service.
            </p>
            <hr className="rule-gold mb-10 max-w-xs" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {summary.dataRange} &middot; {summary.lineCount}{" "}
              metro lines &middot; Official Victorian Government data
            </p>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              label="Punctuality Gap"
              value={`${summary.punctualityGap}pp`}
              detail={`${summary.bestLine.name} (${summary.bestLine.punctualityPct.toFixed(1)}%) vs ${summary.worstLine.name} (${summary.worstLine.punctualityPct.toFixed(1)}%)`}
              delay={100}
            />
            <StatCard
              label="Wealth Gap (IRSAD)"
              value={summary.seifaGap.toFixed(0)}
              detail={`${summary.wealthiestLine.name} (${summary.wealthiestLine.irsadScore}) vs ${summary.leastWealthyLine.name} (${summary.leastWealthyLine.irsadScore})`}
              delay={200}
            />
            <StatCard
              label="Overall Correlation"
              value={`\u03C1 = ${summary.overallSpearmanR.toFixed(2)}`}
              detail={`${summary.correlationStrength} ${summary.correlationDirection} across ${summary.totalYears} years`}
              delay={300}
            />
            <StatCard
              label="Significant Years"
              value={`${summary.significantYears}/${summary.totalAnalyzedYears}`}
              detail={`Years where wealth-punctuality link was statistically significant (p < 0.05)`}
              delay={400}
            />
          </div>
        </div>
      </section>

      {/* Mini chart preview */}
      <section style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <p
                className="text-xs uppercase tracking-wider mb-2"
                style={{ color: "var(--accent-gold)", letterSpacing: "0.15em" }}
              >
                Punctuality by Line &middot; {summary.latestPeriod}
              </p>
              <h2
                className="text-3xl mb-8"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Not all lines are created equal
              </h2>
              <div className="space-y-0.5">
                {sorted.map((line) => (
                  <MiniBar key={line.name} line={line} maxPct={maxPct} />
                ))}
              </div>
              <p
                className="text-xs mt-4"
                style={{ color: "var(--text-muted)" }}
              >
                On-time = within 4 min 59 sec of schedule. Target: 92%.
              </p>
            </div>

            <div>
              <p
                className="text-xs uppercase tracking-wider mb-2"
                style={{ color: "var(--accent-gold)", letterSpacing: "0.15em" }}
              >
                Wealth vs. Punctuality
              </p>
              <h2
                className="text-3xl mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The correlation is real
              </h2>
              <div
                className="rounded-sm p-4 mb-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <HomeCorrelationChart />
              </div>
              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                Across {summary.totalYears} years, the link between wealth and
                punctuality was statistically significant in{" "}
                <strong style={{ color: "var(--accent-gold)" }}>
                  {summary.significantYears} of {summary.totalAnalyzedYears} years
                </strong>
                , strongest pre-COVID ({"\u03C1"} &gt; 0.7).
              </p>
              <div className="flex gap-4">
                <Link
                  href="/correlation"
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-sm transition-all duration-200 hover:translate-y-[-1px]"
                  style={{
                    background: "var(--accent-gold)",
                    color: "var(--bg-primary)",
                  }}
                >
                  Explore all years
                  <span className="ml-2">&rarr;</span>
                </Link>
                <Link
                  href="/lines"
                  className="inline-flex items-center px-5 py-2.5 text-sm rounded-sm transition-all duration-200 hover:translate-y-[-1px]"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  View all lines
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Callout */}
      <section style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div
            className="p-8 rounded-sm"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
          >
            <p
              className="text-xs uppercase tracking-wider mb-4"
              style={{ color: "var(--accent-copper)", letterSpacing: "0.15em" }}
            >
              Important context
            </p>
            <p
              className="text-base leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Correlation does not imply causation. Many factors affect train
              punctuality: line length, infrastructure age, number of level
              crossings, patronage, and distance from the CBD. Wealthier suburbs
              also tend to be inner-city with shorter lines. This analysis
              explores the pattern but doesn&rsquo;t prove that wealth{" "}
              <em>causes</em> better service.{" "}
              <Link
                href="/methodology"
                className="underline transition-colors"
                style={{ color: "var(--accent-gold)" }}
              >
                Read the methodology
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
