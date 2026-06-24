export function About() {
  return (
    <details className="about">
      <summary>How to play</summary>
      <div className="about-body">
        <p>
          A <strong>behavioral scientist</strong> is hidden each day &mdash; a
          figure from the world of judgment &amp; decision-making, prospect
          theory, intertemporal choice, social norms, heuristics, and nudging.
          Guess who it is in as few tries as possible.
        </p>
        <ul>
          <li>
            The hidden author sits at the center of the{" "}
            <strong>network map</strong>. Each guess joins the map: the closer to
            the center, the warmer (more specific) the shared research area, and
            lines connect coauthors.
          </li>
          <li>
            <strong>Warmth</strong> goes from broad to specific: Domain to Field
            to Subfield to Topic. Hotter means a more specific shared research
            area.
          </li>
          <li>
            <strong>Degrees of separation</strong> show how connected you are in
            the coauthorship network: 1&deg; means your guess co-wrote a paper
            with the answer, 2&deg; means they share a coauthor, and so on. This
            nods to Stanley Milgram&rsquo;s small-world experiment, the origin of
            &ldquo;six degrees of separation.&rdquo;
          </li>
          <li>
            New to the field? You don&rsquo;t need to be an expert. A{" "}
            <strong>blurred portrait</strong> sharpens with each guess, the{" "}
            <strong>research ladder</strong> up top reveals the area one rung at a
            time, and a <strong>clues</strong> panel uncovers the era, initials,
            and even a bio (with the name blanked out) &mdash; or hit{" "}
            <em>Reveal a clue</em> whenever you&rsquo;re stuck. Every guessed name
            opens a Wikipedia card.
          </li>
        </ul>
        <p className="about-foot">
          A fresh puzzle drops every day. Come back tomorrow for a new author.
        </p>
      </div>
    </details>
  );
}
