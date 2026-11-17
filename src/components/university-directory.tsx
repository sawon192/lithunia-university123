"use client";

import type { Institution } from "@/lib/research";
import { collegeCount, institutions, statusLabels, universityCount } from "@/lib/research";
import { ArrowRight, ArrowUpRight, Calculator, Check, Globe2, MapPin, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { BookmarkButton } from "./bookmark-button";
import { englishAlternativeLabels, hasEnglishAlternative } from "@/lib/english-alternatives";
import type { EnglishAlternativeKey } from "@/lib/english-alternatives";
import { getOmpt, omptChipLabels, requiresOmpt } from "@/lib/ompt";
import type { OmptStatus } from "@/lib/ompt";

export function InstitutionCard({ institution, saved, onSavedChange }: { institution: Institution; saved: boolean; onSavedChange?: (saved: boolean) => void }) {  return (
    <article className="university-card" style={{ "--card-accent": institution.accent } as CSSProperties}>
      <div className="university-card-top">
        <span className="university-emblem" aria-hidden="true"><span>{institution.initial}</span></span>
        <BookmarkButton slug={institution.slug} initialSaved={saved} onChange={onSavedChange} />
      </div>
      <div className="card-identity"><span className={`card-type ${institution.category === "college" ? "is-college" : ""}`}>{institution.category === "college" ? "COLLEGE" : "UNIVERSITY"}</span><span className="card-location"><MapPin size={13} strokeWidth={2} /> {institution.city}</span><span className="card-area">{institution.area}</span></div>
      <h3><Link href={`/universities/${institution.slug}`}>{institution.name}</Link></h3>
      <p className="card-description">{institution.description}</p>
      <div className={`research-status status-${institution.status}`}><span className="status-light" />{statusLabels[institution.status]}</div>
      <div className="card-english">
        {institution.english.moiAccepted === "accepted" && <span className="eng-chip is-accepted">MOI accepted</span>}
        {institution.english.moiAccepted === "conditional" && <span className="eng-chip is-conditional">MOI conditional</span>}
        {institution.english.moiAccepted === "not_accepted" && <span className="eng-chip is-no">No MOI waiver</span>}
        {institution.english.internalEnglishTest.available && <span className="eng-chip is-internal">Own English test</span>}
        {institution.english.alternativeEnglishCertificates.length > 0 && (
          <span className="eng-chip is-alternative">{institution.english.alternativeEnglishCertificates.length} alternative certificate{institution.english.alternativeEnglishCertificates.length === 1 ? "" : "s"}</span>
        )}
        {institution.english.moiAccepted === "unconfirmed" &&
          !institution.english.internalEnglishTest.available &&
          institution.english.alternativeEnglishCertificates.length === 0 && (
            <span className="eng-chip is-unknown">English alternatives not confirmed</span>
          )}
      </div>
      <div className="card-ompt">{omptChip(institution.slug)}</div>
      <div className="card-metrics">
        <div><span>APPLICATION FEE</span><strong>{institution.feeSummary}</strong></div>
        <div><span>BANGLADESH DEADLINE</span><strong>{institution.deadlineSummary}</strong></div>
      </div>
      <div className="card-footer"><span><span className="card-footer-dot" />{institution.omptSummary}</span><Link href={`/universities/${institution.slug}`}>View research <ArrowUpRight size={17} /></Link></div>
    </article>
  );
}

const STORAGE_KEY = "go-abroad-bd-shortlist";
const CHANGE_EVENT = "go-abroad-bd-shortlist-updated";

/** OMPT chip for a card — derived from the shared OMPT table, never from prose. */
function omptChip(slug: string) {
  const ompt = getOmpt(slug);
  const score = ompt.minimumPercent !== undefined ? ` · ${ompt.minimumPercent}%+` : "";
  return (
    <span className={`ompt-chip ompt-${ompt.status}`} title={ompt.note}>
      {omptChipLabels[ompt.status]}{requiresOmpt(ompt) ? score : ""}
    </span>
  );
}

function readShortlist(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

type Filter = "all" | "university" | "college" | "dates" | "ompt" | "saved";
/** OMPT with/without filter. "with" = the institution publishes an obligation. */
type OmptFilter = "all" | "with" | "without";
export function UniversityDirectory({ initialSavedSlugs = [], shortlistOnly = false }: { initialSavedSlugs?: string[]; shortlistOnly?: boolean }) {
  const [savedSlugs, setSavedSlugs] = useState(initialSavedSlugs);

  useEffect(() => {
    const sync = () => setSavedSlugs(readShortlist());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(shortlistOnly ? "saved" : "all");
  const [city, setCity] = useState("all");
  const [englishFilters, setEnglishFilters] = useState<EnglishAlternativeKey[]>([]);
  const [omptFilter, setOmptFilter] = useState<OmptFilter>("all");
  const cities = ["Vilnius", "Kaunas", "Klaipėda", "Panevėžys", "Šiauliai", "Utena", "Alytus"];

  // Pre-compute how many institutions each English option matches, so the
  // counsellor can see the size of a choice before applying it.
  const englishCounts = useMemo(() => {
    const counts: Record<EnglishAlternativeKey, number> = { moi: 0, internal: 0, certificate: 0 };
    for (const institution of institutions) {
      for (const key of Object.keys(counts) as EnglishAlternativeKey[]) {
        if (hasEnglishAlternative(institution.english, key)) counts[key] += 1;
      }
    }
    return counts;
  }, []);

  // OMPT counts come from the same shared table the filter uses, so the
  // numbers on the buttons can never disagree with the result set.
  const omptCounts = useMemo(() => {
    let withOmpt = 0;
    let without = 0;
    for (const institution of institutions) {
      if (requiresOmpt(getOmpt(institution.slug))) withOmpt += 1;
      else without += 1;
    }
    return { with: withOmpt, without };
  }, []);

  const filtered = useMemo(() => institutions.filter((institution) => {
    const term = query.trim().toLocaleLowerCase();
    const matchesSearch = !term || `${institution.name} ${institution.abbreviation} ${institution.city} ${institution.area}`.toLocaleLowerCase().includes(term);
    const matchesCity = city === "all" || institution.city.includes(city);
    const matchesFilter = shortlistOnly || filter === "saved"
      ? savedSlugs.includes(institution.slug)
      : filter === "dates"
        ? institution.status === "dates"
        : filter === "ompt"
          ? requiresOmpt(getOmpt(institution.slug))
          : true;
    // OR within the English Test Alternatives group: selecting two options
    // widens the result set, and the option set is combined with every other filter (AND).
    const matchesEnglish =
      englishFilters.length === 0 || englishFilters.some((key) => hasEnglishAlternative(institution.english, key));
    const matchesOmpt =
      omptFilter === "all" || (omptFilter === "with") === requiresOmpt(getOmpt(institution.slug));
    return matchesSearch && matchesCity && matchesFilter && matchesEnglish && matchesOmpt;
  }), [query, filter, city, savedSlugs, shortlistOnly, englishFilters, omptFilter]);

  function handleSaved(slug: string, saved: boolean) {
    setSavedSlugs((current) => saved ? [...new Set([...current, slug])] : current.filter((item) => item !== slug));
  }

  function reset() { setQuery(""); setFilter(shortlistOnly ? "saved" : "all"); setCity("all"); setEnglishFilters([]); setOmptFilter("all"); }

  function toggleEnglish(key: EnglishAlternativeKey) {
    setEnglishFilters((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }
  const total = institutions.length;

  return (
    <div className="directory">
      {!shortlistOnly && <div className="directory-tabs" role="group" aria-label="Filter universities">
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All institutions <span>{total.toString().padStart(2, "0")}</span></button>
        <button type="button" className={filter === "university" ? "active" : ""} onClick={() => setFilter("university")}>Universities <span>{universityCount}</span></button>
        <button type="button" className={filter === "college" ? "active" : ""} onClick={() => setFilter("college")}>Colleges <span>{collegeCount}</span></button>
        <button type="button" className={filter === "dates" ? "active" : ""} onClick={() => setFilter("dates")}>2027 dates live</button>
        <button type="button" className={filter === "ompt" ? "active" : ""} onClick={() => setFilter("ompt")}>Entrance test noted</button>
        <button type="button" className={filter === "saved" ? "active" : ""} onClick={() => setFilter("saved")}>Saved <span>{savedSlugs.length}</span></button>
      </div>}
      <div className="directory-toolbar">
        <label className="directory-search"><Search size={19} strokeWidth={1.8} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search university, city or subject..." aria-label="Search universities" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={16} /></button>}</label>
        <label className="directory-city"><SlidersHorizontal size={17} strokeWidth={1.8} /><span className="sr-only">Filter by city</span><select value={city} onChange={(event) => setCity(event.target.value)}><option value="all">All cities</option>{cities.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      </div>
      <fieldset className="english-filter">
        <legend className="english-filter-legend"><Globe2 size={15} strokeWidth={1.9} /> English Test Alternatives</legend>
        <p className="english-filter-intro">
          Institutions where you may not need IELTS, PTE Academic or TOEFL. MOI means a Medium of Instruction certificate.
        </p>
        <div className="english-filter-options">
          {(Object.keys(englishAlternativeLabels) as EnglishAlternativeKey[]).map((key) => {
            const checked = englishFilters.includes(key);
            return (
              <label key={key} className={`english-option ${checked ? "is-checked" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleEnglish(key)} />
                <span className="english-option-box" aria-hidden="true">{checked && <Check size={12} strokeWidth={3} />}</span>
                <span className="english-option-copy">
                  <strong>{englishAlternativeLabels[key]}</strong>
                  <small>
                    {key === "moi" && "Medium of Instruction certificate accepted, sometimes with conditions"}
                    {key === "internal" && "University runs its own English test — free or paid"}
                    {key === "certificate" && "Duolingo, LanguageCert, Cambridge, EF SET and similar"}
                  </small>
                </span>
                <span className="english-option-count">{englishCounts[key]}</span>
              </label>
            );
          })}
        </div>
        <div className="english-filter-foot">
          {englishFilters.length > 0 ? (
            <>
              <span className="english-active">{englishFilters.length} of 3 selected</span>
              <button type="button" className="english-clear" onClick={() => setEnglishFilters([])}>
                <X size={13} /> Clear all filters
              </button>
            </>
          ) : (
            <span className="english-hint"><Sparkles size={13} /> Select one or more options — results update instantly.</span>
          )}
        </div>
      </fieldset>

      <fieldset className="ompt-filter">
        <legend className="ompt-filter-legend"><Calculator size={15} strokeWidth={1.9} /> OMPT requirement</legend>
        <p className="ompt-filter-intro">
          The Online Mathematics Placement Test. Counts come from the same verified OMPT table the eligibility report uses.
          &ldquo;Not mentioned&rdquo; means the institution publishes nothing — it is never counted as an exemption.
        </p>
        <div className="ompt-filter-options" role="group" aria-label="Filter by OMPT requirement">
          {([
            { key: "all", label: "All institutions", count: institutions.length, hint: "No OMPT filter" },
            { key: "with", label: "With OMPT", count: omptCounts.with, hint: "OMPT required or required per programme" },
            { key: "without", label: "Without OMPT", count: omptCounts.without, hint: "No published OMPT obligation" },
          ] as { key: OmptFilter; label: string; count: number; hint: string }[]).map((option) => (
            <button
              key={option.key}
              type="button"
              className={`ompt-option ${omptFilter === option.key ? "is-active" : ""}`}
              aria-pressed={omptFilter === option.key}
              onClick={() => setOmptFilter(option.key)}
            >
              <span className="ompt-option-copy"><strong>{option.label}</strong><small>{option.hint}</small></span>
              <span className="ompt-option-count">{option.count.toString().padStart(2, "0")}</span>
            </button>
          ))}
        </div>
        <div className="ompt-filter-foot">
          {omptFilter === "all"
            ? <span className="ompt-hint">Select With OMPT to see only institutions that publish an OMPT obligation.</span>
            : <>
                <span className="ompt-active">{omptFilter === "with" ? "OMPT institutions only" : "Institutions with no published OMPT obligation"}</span>
                <button type="button" className="ompt-clear" onClick={() => setOmptFilter("all")}><X size={13} /> Clear OMPT filter</button>
              </>}
        </div>
      </fieldset>

      <div className="directory-result-line"><span><strong>{filtered.length.toString().padStart(2, "0")}</strong> {shortlistOnly ? "saved institutions" : filter === "college" ? "colleges found" : "institutions found"}{englishFilters.length > 0 ? " · English alternatives" : ""}{omptFilter !== "all" ? ` · ${omptFilter === "with" ? "with" : "without"} OMPT` : ""}</span><span>Official-source research · {institutions.length} institutions</span></div>
      {filtered.length ? <div className="university-grid">{filtered.map((institution) => <InstitutionCard key={institution.slug} institution={institution} saved={savedSlugs.includes(institution.slug)} onSavedChange={(saved) => handleSaved(institution.slug, saved)} />)}</div> : <div className="directory-empty"><div className="empty-symbol">✦</div><h3>{shortlistOnly || filter === "saved" ? "Your shortlist is waiting." : "No institutions match those filters."}</h3><p>{shortlistOnly || filter === "saved" ? "Explore universities and colleges, then tap the heart to keep your research in one place." : "Try another search term or clear your filters to see all institutions."}</p>{shortlistOnly || filter === "saved" ? <Link href="/#universities" className="button button-navy">Browse all institutions <ArrowRight size={17} /></Link> : <button type="button" className="button button-navy" onClick={reset}>Clear filters <ArrowRight size={17} /></button>}</div>}
    </div>
  );
}
