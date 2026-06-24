export function About() {
  return (
    <details className="about">
      <summary>How to play</summary>
      <div className="about-body">
        <p>
          A new <strong>behavioral scientist</strong> is hidden each day. Guess
          who it is in as few tries as possible.
        </p>
        <ul>
          <li>
            <strong>Warmth</strong> tells you how close your guess studies to the
            hidden author, from broad to specific: Domain to Field to Subfield to
            Topic. Hotter means a more specific shared research area.
          </li>
          <li>
            <strong>Degrees of separation</strong> show how connected you are in
            the coauthorship network: 1&deg; means your guess co-wrote a paper
            with the answer, 2&deg; means they share a coauthor, and so on. This
            nods to Stanley Milgram&rsquo;s small-world experiment, the origin of
            &ldquo;six degrees of separation.&rdquo;
          </li>
          <li>
            Stuck? <strong>Hints</strong> unlock as you guess, and the research
            ladder on the right reveals the hidden author&rsquo;s field one rung
            at a time.
          </li>
        </ul>
        <p className="about-foot">
          A fresh puzzle drops every day. Come back tomorrow for a new author.
        </p>
      </div>
    </details>
  );
}
