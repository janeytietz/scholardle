interface Concept {
  term: string;
  what: string;
  names: string;
}

const CONCEPTS: Concept[] = [
  {
    term: "Prospect theory & loss aversion",
    what: "We feel losses about twice as strongly as equivalent gains, so we take odd risks to avoid losing.",
    names: "Daniel Kahneman, Amos Tversky",
  },
  {
    term: "Heuristics & biases",
    what: "Handy mental shortcuts that usually work but cause predictable errors \u2014 anchoring, availability, representativeness.",
    names: "Kahneman, Tversky, Gerd Gigerenzer",
  },
  {
    term: "Bounded rationality",
    what: "Real people optimize within limits of time, information, and attention \u2014 they \u201csatisfice\u201d instead of maximize.",
    names: "Herbert Simon",
  },
  {
    term: "Dual-process thinking",
    what: "Fast, automatic \u201cSystem 1\u201d versus slow, effortful \u201cSystem 2\u201d reasoning.",
    names: "Daniel Kahneman",
  },
  {
    term: "Nudges & choice architecture",
    what: "Small changes to how options are presented (defaults, framing) steer choices without banning anything.",
    names: "Richard Thaler, Cass Sunstein",
  },
  {
    term: "Present bias & discounting",
    what: "We overweight immediate rewards, which drives procrastination and under-saving.",
    names: "David Laibson, Ted O\u2019Donoghue, Matthew Rabin, George Loewenstein",
  },
  {
    term: "Social norms",
    what: "What we do depends on what we believe others do \u2014 and what they approve of.",
    names: "Cristina Bicchieri, Leonardo Bursztyn",
  },
  {
    term: "Scarcity",
    what: "Not having enough money or time taxes attention and degrades decision-making.",
    names: "Sendhil Mullainathan, Eldar Shafir",
  },
  {
    term: "Field experiments (RCTs)",
    what: "Randomized trials test what actually improves lives, especially in development economics.",
    names: "Esther Duflo, Abhijit Banerjee, Michael Kremer, Dean Karlan, John List",
  },
  {
    term: "Weak ties & networks",
    what: "Acquaintances spread new information better than close friends; network structure shapes outcomes.",
    names: "Mark Granovetter, Matthew O. Jackson, Ben Golub",
  },
  {
    term: "Six degrees / small world",
    what: "Any two people are linked by a surprisingly short chain of acquaintances.",
    names: "Stanley Milgram; random-graph math by Paul Erd\u0151s & Alfr\u00e9d R\u00e9nyi",
  },
  {
    term: "Grit, self-control & mindset",
    what: "Perseverance, delaying gratification, and beliefs about ability all shape achievement.",
    names: "Angela Duckworth, Walter Mischel, Carol Dweck",
  },
  {
    term: "Social capital",
    what: "The value embedded in our relationships and community ties.",
    names: "Robert Putnam, Pierre Bourdieu",
  },
  {
    term: "Wellbeing economics",
    what: "Measuring subjective wellbeing to guide policy beyond GDP.",
    names: "Jan-Emmanuel De Neve, Andrew Oswald, Daniel Kahneman",
  },
];

export function Glossary() {
  return (
    <details className="about glossary">
      <summary>Big ideas in the field</summary>
      <div className="about-body">
        <p>
          A quick, friendly tour of the concepts behind the puzzle &mdash; and
          the people who shaped them.
        </p>
        <dl className="glossary-list">
          {CONCEPTS.map((c) => (
            <div key={c.term} className="glossary-item">
              <dt className="glossary-term">{c.term}</dt>
              <dd className="glossary-def">
                {c.what}
                <span className="glossary-names">{c.names}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
