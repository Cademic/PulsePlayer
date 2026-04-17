"use client";

import type { ReactNode } from "react";

interface CollectionHeroProps {
  eyebrow: string;
  title: string;
  metaLine: string;
  description?: string | null;
  coverUrl?: string | null;
  coverCollageUrls?: string[];
  topBar?: ReactNode;
  actions?: ReactNode;
}

export default function CollectionHero({
  eyebrow,
  title,
  metaLine,
  description,
  coverUrl,
  coverCollageUrls,
  topBar,
  actions,
}: CollectionHeroProps) {
  const collage =
    Array.isArray(coverCollageUrls) && coverCollageUrls.length >= 4
      ? coverCollageUrls.slice(0, 4)
      : null;
  const singleFromCollage =
    Array.isArray(coverCollageUrls) && coverCollageUrls.length > 0 && !collage
      ? coverCollageUrls[0]
      : null;
  const artUrl = coverUrl?.trim() || singleFromCollage || null;

  return (
    <div className="wf-route-hero wf-route-hero--full wf-route-hero--edge">
      {topBar ? <div className="wf-collection-hero-bar">{topBar}</div> : null}
      <div className="wf-collection-hero-main">
        <div className="wf-collection-hero-art" aria-hidden={!title}>
          {collage ? (
            <div className="wf-collection-hero-collage">
              {collage.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- remote art URLs
                <img key={`${src}-${i}`} src={src} alt="" className="wf-collection-hero-collage-img" />
              ))}
            </div>
          ) : artUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote art URLs
            <img src={artUrl} alt="" className="wf-collection-hero-cover" />
          ) : (
            <div className="wf-collection-hero-cover wf-collection-hero-cover--placeholder">
              <span>♪</span>
            </div>
          )}
        </div>
        <div className="wf-collection-hero-copy">
          <p className="wf-collection-hero-eyebrow">{eyebrow}</p>
          <h1 className="wf-collection-hero-title">{title}</h1>
          <p className="wf-collection-hero-meta">{metaLine}</p>
          {description?.trim() ? (
            <p className="wf-collection-hero-desc">{description.trim()}</p>
          ) : null}
          {actions ? <div className="wf-collection-hero-actions">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
