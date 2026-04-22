import methodology from "@/data/methodology.json";

export default function MethodologyPage() {
  return (
    <div style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <p
          className="text-xs uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-gold)", letterSpacing: "0.2em" }}
        >
          Data sources & methods
        </p>
        <h1
          className="text-4xl md:text-5xl mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Methodology
        </h1>
        <p
          className="text-base mb-12 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Data sources, methods, and limitations behind every chart on the
          site.
        </p>

        {/* Data Sources */}
        <section className="mb-16">
          <h2
            className="text-2xl mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Data sources
          </h2>

          <div className="space-y-6">
            {/* Train performance */}
            <div
              className="p-6 rounded-sm"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Train Punctuality Data
              </h3>
              <p
                className="text-sm mb-3 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {methodology.punctualityDefinition}. Data is for{" "}
                {methodology.period}.
              </p>
              <div className="space-y-2">
                {methodology.dataSources.map((src) => (
                  <div key={src.name} className="flex items-start gap-3">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: "var(--accent-gold)" }}
                    />
                    <div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline transition-colors"
                        style={{ color: "var(--accent-gold)" }}
                      >
                        {src.name}
                      </a>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {src.data_provided}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p
                className="text-xs mt-4 p-3 rounded-sm"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                }}
              >
                Data extracted programmatically from Victorian Government Power BI dashboards via the embedded report API. {methodology.totalDataPoints} data points across {methodology.period}.
              </p>
            </div>

            {/* SEIFA */}
            <div
              className="p-6 rounded-sm"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Socioeconomic Data
              </h3>
              <p
                className="text-sm mb-2 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                <a
                  href="https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/latest-release"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--accent-gold)" }}
                >
                  {methodology.seifaSource.name}
                </a>{" "}
                &mdash; {methodology.seifaSource.index}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                IRSAD is a composite index derived from Census data including
                household income, education levels, occupation types, housing
                costs, and other indicators. Higher scores indicate greater
                relative socioeconomic advantage on the ABS measure. It is
                the standard measure used by Australian governments for
                area-level socioeconomic analysis.
              </p>
            </div>

            {/* Station data */}
            <div
              className="p-6 rounded-sm"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Station &amp; Line Data
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                <a
                  href="http://data.ptv.vic.gov.au/downloads/gtfs.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--accent-gold)" }}
                >
                  PTV GTFS Static Feed
                </a>{" "}
                &mdash; 225 stations across 16 metropolitan train lines.
              </p>
            </div>
          </div>
        </section>

        {/* Method */}
        <section className="mb-16">
          <h2
            className="text-2xl mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Analysis method
          </h2>
          <div className="space-y-6 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <div>
              <h3 className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                1. Station-to-suburb mapping
              </h3>
              <p>{methodology.methodology.stationMapping}.</p>
            </div>
            <div>
              <h3 className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                2. CBD station exclusion
              </h3>
              <p>{methodology.methodology.cbdExclusion}.</p>
            </div>
            <div>
              <h3 className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                3. Per-line IRSAD score
              </h3>
              <p>
                {methodology.methodology.irsadMetric}. The population-weighted
                median is preferred over the mean because lines pass through
                suburbs with very different socioeconomic profiles, and the
                median better represents the typical experience.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                4. Statistical testing
              </h3>
              <p>
                {methodology.methodology.statisticalTest}. Spearman is preferred
                over Pearson because it measures monotonic (not just linear)
                relationships and is more robust with small samples.
              </p>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section>
          <h2
            className="text-2xl mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Limitations
          </h2>
          <div
            className="p-6 rounded-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <ul className="space-y-3">
              {methodology.limitations.map((limitation, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
