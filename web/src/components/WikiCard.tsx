import type { Author } from "../game/types";

export function hasWikiCard(a: Author): boolean {
  return Boolean(a.blurb || a.wikiImage || a.wikiUrl);
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
