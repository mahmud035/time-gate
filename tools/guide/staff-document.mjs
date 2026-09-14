/**
 * The staff guide: what one person needs to clock in and out, and nothing else.
 *
 * Written for someone reading it once, in a hurry, possibly not in their first
 * language. Short sentences, larger type than the manager's guide, one idea per
 * block. Everything about exports, corrections and hosting is deliberately
 * absent — that is the manager's document.
 *
 * Anything workplace-specific is a bracketed placeholder, because this file is
 * committed and the link and codes are not.
 */
export const buildStaffGuide = ({ img, font, icon }) => {
  const shot = (file, caption) => `
    <figure class="shot">
      <img src="${img(file)}" alt="">
      <figcaption>${caption}</figcaption>
    </figure>`;

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Inter';
    src: url('${font}') format('woff2');
    font-weight: 100 900;
    font-display: block;
  }

  @page { size: A4; margin: 17mm 16mm 19mm; }

  :root {
    --ink: #1c2530;
    --muted: #5b6875;
    --line: #dde3ea;
    --brand: #006bbb;
    --warn-bg: #fdf6e7;
    --warn-line: #e6cf9a;
    --warn-ink: #7a5a12;
    --good-bg: #edf7f0;
    --good-line: #b8ddc4;
    --good-ink: #2f6b44;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, system-ui, sans-serif;
    /* A point larger than the manager's guide: this gets read standing up. */
    font-size: 11.5pt;
    line-height: 1.55;
    color: var(--ink);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  h1, h2, h3 { line-height: 1.2; letter-spacing: -0.015em; }
  h2 { font-size: 18pt; margin: 0 0 4mm; padding-bottom: 2.5mm; border-bottom: 1.5px solid var(--line); }
  h3 { font-size: 12.5pt; margin: 7mm 0 2mm; }
  p { margin: 0 0 3mm; }
  strong { font-weight: 600; }

  section { break-before: page; }
  section.first { break-before: auto; }

  .cover { height: 248mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
  .cover .mark { width: 22mm; height: 22mm; margin-bottom: 9mm; }
  .cover .mark svg { width: 100%; height: 100%; display: block; }
  .cover h1 { font-size: 36pt; margin: 0 0 3mm; }
  .cover .sub { font-size: 14pt; color: var(--muted); margin: 0 0 14mm; max-width: 118mm; }
  .cover .meta { font-size: 10pt; color: var(--muted); border-top: 1.5px solid var(--line); padding-top: 4mm; }

  .lead { font-size: 12.5pt; color: var(--muted); margin: -1mm 0 5mm; }

  .shot { margin: 4mm 0 5mm; break-inside: avoid; }
  .shot img {
    width: 100%; display: block; border-radius: 1.5mm;
    border: 0.7px solid #d6dce4;
    box-shadow: 0 1mm 3mm rgba(28,37,48,0.10);
  }
  .shot.half img { width: 92mm; margin: 0 auto; }
  figcaption { font-size: 9.5pt; color: var(--muted); margin-top: 2.5mm; text-align: center; }

  /* Numbered steps are the spine of this document — most of it is a procedure. */
  .steps { counter-reset: step; list-style: none; padding: 0; margin: 0 0 4mm; }
  .steps > li {
    counter-increment: step; position: relative;
    padding-left: 11mm; margin-bottom: 4mm; break-inside: avoid;
  }
  .steps > li::before {
    content: counter(step); position: absolute; left: 0; top: -0.3mm;
    width: 7.5mm; height: 7.5mm; border-radius: 50%;
    background: var(--brand); color: #fff;
    font-size: 10pt; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
  }
  .steps .what { font-weight: 600; }

  .box { border-radius: 2mm; padding: 4mm 5mm; margin: 4mm 0; break-inside: avoid; }
  .box p:last-child { margin-bottom: 0; }
  .box .label {
    font-size: 9pt; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; margin-bottom: 1.5mm;
  }
  .warn { background: var(--warn-bg); border: 1px solid var(--warn-line); }
  .warn .label { color: var(--warn-ink); }
  .good { background: var(--good-bg); border: 1px solid var(--good-line); }
  .good .label { color: var(--good-ink); }

  .fill {
    display: inline-block; min-width: 42mm;
    border-bottom: 1.5px solid var(--brand);
    color: var(--muted); font-style: italic;
  }

  .card {
    border: 2px solid var(--brand); border-radius: 3mm; padding: 7mm 8mm;
    break-inside: avoid;
  }
  .card h3 { margin-top: 0; font-size: 15pt; }
  .card .row {
    display: flex; align-items: baseline; gap: 4mm;
    padding: 2.5mm 0; border-top: 1px solid var(--line);
  }
  .card .row:first-of-type { border-top: 0; }
  .card .step {
    flex: 0 0 auto; width: 6.5mm; height: 6.5mm; border-radius: 50%;
    background: var(--brand); color: #fff; font-size: 9pt; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
  }
</style></head><body>

<div class="cover">
  <div class="mark">${icon}</div>
  <h1>Clocking in<br>and out</h1>
  <p class="sub">How to record your hours at work. It takes about ten seconds.</p>
  <div class="meta">A short guide for staff · TimeGate</div>
</div>

<section class="first">
  <h2>What you need</h2>
  <p class="lead">Two things, both from your manager.</p>

  <ol class="steps">
    <li>
      <p class="what">A link</p>
      <p>It opens the screen you clock in on. It is already open on the tablet at work. Your manager can also send it to you so you can use your own phone.</p>
    </li>
    <li>
      <p class="what">Your own 4-digit code</p>
      <p>This is how the system knows the hours are yours. <strong>Keep it to yourself.</strong> If someone else uses your code, their hours go on your name.</p>
    </li>
  </ol>

  <div class="box good">
    <div class="label">Write yours here</div>
    <p>My code: <span class="fill">&nbsp;</span></p>
  </div>

  <p>If your code ever stops working, or you think someone else knows it, ask your manager for a new one. It takes them a few seconds.</p>
</section>

<section>
  <h2>Starting your shift</h2>
  <p>Tap your code on the keypad. There is nothing else to fill in.</p>
  ${shot('s01-keypad.png', 'The screen you will see. Just your four digits.')}
  <p>It knows who you are and shows you one button.</p>
  ${shot('s02-clocked-out.png', 'Tap <strong>Clock in</strong>. That is your shift started.')}
  ${shot('s03-confirmed.png', 'The tick means it is recorded. The screen clears itself after a few seconds.')}
  <div class="box good">
    <div class="label">Your hours, any time you like</div>
    <p>Every time you clock in or out it shows your week so far, with breaks already taken off. If you ever want to check your hours, tap your code and look — you do not need to ask anyone.</p>
  </div>
</section>

<section>
  <h2>Taking a break</h2>
  <p>Tap your code the same way. While you are working it offers two things.</p>
  ${shot('s04-working.png', 'Tap <strong>Start break</strong> when you go, and again when you come back.')}
  <p>When you come back, tap your code and press <strong>End break</strong>.</p>
  ${shot('s05-on-break.png', 'If your break is the last thing before you go home, use <strong>End break &amp; clock out</strong> — that does both at once.')}

  <div class="box warn">
    <div class="label">Breaks are not paid</div>
    <p>Break time is taken off your hours. A day from 09:00 to 17:00 with a 15-minute break pays <strong>7&nbsp;h&nbsp;45&nbsp;m</strong>, not 8 hours.</p>
    <p>So it is worth ending your break when you actually get back. Every minute you leave it running is a minute off your pay.</p>
  </div>

  <h3>Going home</h3>
  <p>Tap your code and press <strong>Clock out</strong>. That is the whole thing.</p>
</section>

<section>
  <h2>If something goes wrong</h2>

  <h3>You forgot to clock out, or forgot to end a break</h3>
  <p>It happens. Nothing is lost and you are not in trouble.</p>
  <p><strong>Tell your manager what time it actually was.</strong> They can put it in, and your hours will be right.</p>
  <p>Until they do, that whole shift shows as <strong>zero hours</strong> — not a guess, because the system will not invent a time for you. So it is worth mentioning the next day rather than at the end of the month.</p>

  <h3>The screen says your code is not recognised</h3>
  ${shot('s06-wrong-code.png', 'Usually just a mistyped digit. Try again.')}
  <p>If it still will not take it, your code may have been changed. Ask your manager for a new one.</p>

  <h3>It says there is no connection</h3>
  ${shot('s07-offline.png', 'The keypad stops working until the connection is back.')}
  <p>Nothing is recorded while this shows — so <strong>write down your time on paper</strong> and tell your manager. They will put it in for you.</p>
  <div class="box warn">
    <div class="label">Do not just walk away</div>
    <p>If the screen would not take your code, it did not record anything. Telling someone takes a moment. Sorting it out weeks later, from memory, is much harder.</p>
  </div>
</section>

<section>
  <h2>Putting it on your phone</h2>
  <p>You can use the tablet at work and never do this. But if your manager sends you the link, saving it means it opens in one tap.</p>
  <ol class="steps">
    <li>
      <p class="what">iPhone</p>
      <p>Open the link in Safari. Tap the Share button, then <strong>Add to Home Screen</strong>.</p>
    </li>
    <li>
      <p class="what">Android</p>
      <p>Open the link in Chrome. Tap the menu, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
    </li>
  </ol>
  <p>It then works like any other app on your phone. There is nothing to download and nothing to update.</p>

  <div class="card">
    <h3>The whole thing, in four taps</h3>
    <div class="row"><span class="step">1</span><span>Arrive — tap your code, press <strong>Clock in</strong></span></div>
    <div class="row"><span class="step">2</span><span>Break — tap your code, press <strong>Start break</strong></span></div>
    <div class="row"><span class="step">3</span><span>Back — tap your code, press <strong>End break</strong></span></div>
    <div class="row"><span class="step">4</span><span>Leave — tap your code, press <strong>Clock out</strong></span></div>
  </div>
  <p style="margin-top:4mm;color:#5b6875;font-size:10pt;">Forgot something, or the screen would not take it? Tell your manager. It can always be put right.</p>
</section>

</body></html>`;
};
