import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
  isKm: boolean;
  bodyFont: string;
  index: number;
}

/* ── Collapsed variant ── */
function FAQItemCollapsed({ question, isKm, bodyFont, onExpand, index }: Omit<FAQItemProps, "answer"> & { onExpand: () => void }) {
  return (
    <button
      onClick={onExpand}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "16px 18px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid transparent",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--muted)",
          letterSpacing: "0.08em",
          flexShrink: 0,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className={isKm ? "khmer" : ""} style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text)",
          lineHeight: 1.45,
          fontFamily: bodyFont,
        }}>
          {question}
        </span>
      </div>
      <ChevronDown size={16} style={{ color: "var(--muted)", flexShrink: 0, transition: "transform 0.25s" }} />
    </button>
  );
}

/* ── Expanded variant ── */
function FAQItemExpanded({ question, answer, isKm, bodyFont, onCollapse, index }: FAQItemProps & { onCollapse: () => void }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-gold)",
        borderLeft: "3px solid var(--gold)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Question row */}
      <button
        onClick={onCollapse}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--gold)",
            letterSpacing: "0.08em",
            flexShrink: 0,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={isKm ? "khmer" : ""} style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--gold)",
            lineHeight: 1.45,
            fontFamily: bodyFont,
          }}>
            {question}
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{ color: "var(--gold)", flexShrink: 0, transform: "rotate(180deg)", transition: "transform 0.25s" }}
        />
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-gold)", marginLeft: 18, marginRight: 18 }} />

      {/* Answer text */}
      <p
        className={isKm ? "khmer" : ""}
        style={{
          padding: "14px 18px 18px",
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          fontFamily: bodyFont,
          margin: 0,
        }}
      >
        {answer}
      </p>
    </div>
  );
}

/* ── FAQItem: manages its own collapsed/expanded state ── */
function FAQItem({ question, answer, isKm, bodyFont, index }: FAQItemProps) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <FAQItemExpanded
        question={question}
        answer={answer}
        isKm={isKm}
        bodyFont={bodyFont}
        index={index}
        onCollapse={() => setExpanded(false)}
      />
    );
  }

  return (
    <FAQItemCollapsed
      question={question}
      isKm={isKm}
      bodyFont={bodyFont}
      index={index}
      onExpand={() => setExpanded(true)}
    />
  );
}

/* ── FAQ section ── */
interface FAQProps {
  t: any;
  isKm: boolean;
  bodyFont: string;
}

export default function FAQ({ t, isKm, bodyFont }: FAQProps) {
  return (
    <section id="faq" style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <span style={{ width: 3, height: 18, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: isKm ? 0 : "-0.01em", fontFamily: bodyFont }}>
          {t.faq_h}
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {t.faq.map((item: { q: string; a: string }, i: number) => (
          <FAQItem
            key={i}
            index={i}
            question={item.q}
            answer={item.a}
            isKm={isKm}
            bodyFont={bodyFont}
          />
        ))}
      </div>
    </section>
  );
}
