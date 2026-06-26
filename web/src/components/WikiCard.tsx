import type { Author } from "../game/types";

export function hasWikiCard(a: Author): boolean {
  return Boolean(a.blurb || a.wikiImage || a.wikiUrl || a.keyPapers?.length);
}

export function WikiCard({ author }: { author: Author }) {
  return (
    <div className="wiki-card">
      {author.wikiImage && (
        <img
          className="wiki-card-img"
          src={author.wikiImage}
          alt={author.name}
          loading="lazy"
        />
      )}
      <div className="wiki-card-body">
        <div className="wiki-card-name">{author.name}</div>
        {author.blurb ? (
          <p className="wiki-card-summary">{author.blurb}</p>
        ) : (
          <p className="wiki-card-summary muted">No summary available.</p>
        )}
        {author.keyPapers && author.keyPapers.length > 0 && (
          <div className="key-papers">
            <div className="key-papers-title">Key papers</div>
            <ul className="key-papers-list">
              {author.keyPapers.map((p) => (
                <li key={p.title} className="key-paper">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {p.title}
                    </a>
                  ) : (
                    <span>{p.title}</span>
                  )}
                  <span className="key-paper-meta">
                    {p.year ? ` ${p.year}` : ""}
                    {p.citationCount
                      ? ` \u00B7 ${p.citationCount.toLocaleString()} citations`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {author.wikiUrl && (
          <a
            className="wiki-card-link"
            href={author.wikiUrl}
            target="_blank"
            rel="noreferrer"
          >
            Read full article on Wikipedia &rarr;
          </a>
        )}
      </div>
    </div>
  );
}
