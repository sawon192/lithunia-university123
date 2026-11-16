import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name} — ${detail}`); };

const count = () => page.locator(".directory-result-line strong").first().innerText();
const titles = () => page.locator(".university-card h3, .university-card h2").allInnerTexts();
await page.goto(B + "/", { waitUntil: "networkidle" });

// 1. exactly three options + counts
const opts = await page.locator(".english-option-copy strong").allInnerTexts();
rec("1. Exactly three multi-select options", opts.length === 3, opts.join(" | "));
const counts = await page.locator(".english-option-count").allInnerTexts();
rec("2. Per-option institution counts shown", counts.length === 3, "counts " + counts.join("/"));

// 2. single select MOI
await page.getByText("MOI Accepted", { exact: true }).click();
await page.waitForTimeout(120);
let c = await count();
let names = (await page.locator(".university-card").allInnerTexts()).length;
rec("3. MOI Accepted filters to 7", c === "07" && names === 7, `${c} cards=${names}`);

// 3. multi-select union (MOI + internal)
await page.getByText("University Internal English Test", { exact: true }).click();
await page.waitForTimeout(120);
c = await count();
const cards = await page.locator(".university-card").allInnerTexts();
const hasKtu = cards.some(t => t.includes("Kaunas University of Technology"));
const hasVmu = cards.some(t => t.includes("Vytautas Magnus"));
const hasSmk = cards.some(t => t.includes("SMK"));
rec("4. Multi-select unions (MOI ∪ internal = 11, 3 shared institutions counted once)", c === "11" && hasKtu && hasVmu && hasSmk, `${c} cards; KTU=${hasKtu} VMU=${hasVmu} SMK=${hasSmk}`);

// 4. active indicator + clear-all
const active = await page.locator(".english-active").innerText();
const clearBtn = page.locator(".english-clear");
const hasClear = await clearBtn.count();
rec("5. Active-filter indicator + clear-all", active.includes("2 of 3") && hasClear === 1, `"${active}", clear buttons=${hasClear}`);

// 5. clear-all restores
await clearBtn.click();
await page.waitForTimeout(120);
c = await count();
rec("6. Clear-all restores all 24", c === "24", `${c} institutions`);

// 6. combined with city filter
await page.getByText("MOI Accepted", { exact: true }).click();
await page.selectOption("select", { label: /Vilnius/ }).catch(async () => {
  const selects = page.locator("select");
  await selects.first().selectOption({ index: 1 });
});
await page.waitForTimeout(150);
const comboCount = await count();
const comboCards = await page.locator(".university-card").allInnerTexts();
const allVilnius = comboCards.every(t => t.toLowerCase().includes("vilnius"));
rec("7. English filter combines with city filter", Number(comboCount) <= 7 && allVilnius, `${comboCount} cards, all Vilnius=${allVilnius}`);

// 7. no IELTS/PTE/TOEFL in alternative lists
await page.reload({ waitUntil: "networkidle" });
await page.getByText("Alternative English Certificate", { exact: true }).click();
await page.waitForTimeout(150);
c = await count();
const altChipText = (await page.locator(".eng-chip.is-alternative").allInnerTexts()).join(" ");
const profileAltLists = await page.evaluate(() => Array.from(document.querySelectorAll(".english-cert-list")).map(el => el.textContent).join(" | "));
const leaked = /IELTS|PTE|TOEFL/i.test(altChipText + profileAltLists);
rec("8. Alternative certificates → 14, and the alternative lists never contain IELTS/PTE/TOEFL", c === "14" && !leaked, `${c} cards; chips="${altChipText.slice(0,40)}…"; leaked=${leaked}`);

// 8. mobile layout
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
const cols = await page.evaluate(() => getComputedStyle(document.querySelector(".english-filter-options")).gridTemplateColumns.split(" ").length);
const optBox = await page.locator(".english-option").first().boundingBox();
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
rec("9. Mobile 390px: single-column, no horizontal overflow", cols === 1 && optBox.width > 300 && !overflow, `${cols} column(s), option ${Math.round(optBox.width)}px, overflow=${overflow}`);

// 9. profile page section
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(B + "/universities/mykolas-romeris-university", { waitUntil: "networkidle" });
const hasSection = await page.locator("#english-alternatives").count();
const sectionText = (await page.locator("#english-alternatives").innerText()).toLowerCase();
const subNav = await page.locator('a[href="#english-alternatives"]').count();
const wanted = ["conditionally accepted", "available", "duolingo english test", "last verified", "ielts", "toefl"];
const found = wanted.filter(l => sectionText.includes(l));
rec("10. Profile section + anchor nav", hasSection === 1 && subNav >= 1 && found.length === wanted.length, `found: ${found.join(", ")}`);
const noGeneralClaim = !/unconditionally accepted/i.test(sectionText);
rec("11. Conditional policy never shown as general acceptance", noGeneralClaim && sectionText.includes("conditionally accepted"), "MRU verdict renders as Conditionally Accepted");

// screenshots
await page.screenshot({ path: "/home/user/screens/profile-english.png", fullPage: false });
await page.goto(B + "/", { waitUntil: "networkidle" });
await page.getByText("MOI Accepted", { exact: true }).click();
await page.waitForTimeout(150);
await page.locator(".english-filter").screenshot({ path: "/home/user/screens/filter-active.png" });
await page.screenshot({ path: "/home/user/screens/directory.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await page.locator(".english-filter").screenshot({ path: "/home/user/screens/filter-mobile.png" });

console.log("\n" + results.filter(r => r.pass).length + "/" + results.length + " passed");
await browser.close();
process.exit(results.every(r => r.pass) ? 0 : 1);
